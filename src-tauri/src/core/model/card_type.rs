use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::Path;

pub type TypeId = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CropRect {
    /// 0–1，从左边起
    pub x: f64,
    /// 0–1，从上边起
    pub y: f64,
    /// 0–1，占原图宽度的比例
    pub w: f64,
    /// 0–1，占原图高度的比例
    pub h: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ImageExtend {
    /// 0–1，相对图像区高度的比例。0 = 不扩展
    #[serde(default)]
    pub top: f64,
    #[serde(default)]
    pub bottom: f64,
    /// 0–1，相对图像区宽度的比例
    #[serde(default)]
    pub left: f64,
    #[serde(default)]
    pub right: f64,
}

/// 卡框槽位绑定：把卡框的某个槽位，绑定到卡牌的某个（些）字段。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SlotBinding {
    /// 单字段映射：card.values[source]
    #[serde(default)]
    pub source: Option<String>,
    /// 多字段映射（body 用）：card.values[values[0]], [1], ...
    #[serde(default)]
    pub values: Vec<String>,
    /// 覆盖该槽位的默认标签（如 ATK / HP）
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CardFrameConfig {
    #[serde(default)]
    pub style: Option<String>,
    /// 槽位绑定：slot_key → SlotBinding。
    #[serde(default)]
    pub bindings: BTreeMap<String, SlotBinding>,
    #[serde(default)]
    pub foil_field: Option<String>,
    #[serde(default)]
    pub foil_values: Vec<String>,
    #[serde(default)]
    pub foil_style: Option<String>,
    #[serde(default)]
    pub image_crop: Option<CropRect>,
    #[serde(default)]
    pub image_extend: Option<ImageExtend>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum FieldType {
    Text,
    RichText,
    Number,
    Bool,
    Date,
    Color,
    Enum { options: Vec<String> },
    MultiEnum { options: Vec<String> },
    Tags,
    Ref { target_types: Vec<TypeId> },
    Image,
    Url,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDef {
    pub key: String,
    pub label: String,
    pub ty: FieldType,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub default: Option<Value>,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub order: i32,
    #[serde(default)]
    pub deprecated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardType {
    pub id: TypeId,
    pub name: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub fields: Vec<FieldDef>,
    #[serde(default)]
    pub allowed_relation_kinds: Vec<String>,
    #[serde(default)]
    pub views: Vec<String>,
    #[serde(default)]
    pub card_frame: Option<CardFrameConfig>,
    #[serde(default)]
    pub card_back: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// ────────────────────────────────────────────────────────────
// 迁移：把旧 card_frame 的固定字段搬进 bindings
// ────────────────────────────────────────────────────────────

/// CardFrameConfig 历史上出现过的固定字段名。
/// 迁移后从 JSON 清除；struct 里已不再声明。
const LEGACY_FRAME_KEYS: &[&str] = &[
    "title",
    "subtitle",
    "image",
    "level",
    "level_label",
    "type_line",
    "body",
    "atk",
    "atk_label",
    "def",
    "def_label",
    "hp",
    "hp_label",
];

/// 把 JSON 里的 legacy 固定字段迁移到 `bindings`。
/// 幂等：bindings 非空时只做清理；返回 true 表示有改动。
pub fn migrate_card_frame_json(frame: &mut Value) -> bool {
    let Some(obj) = frame.as_object_mut() else {
        return false;
    };

    let has_bindings = obj
        .get("bindings")
        .and_then(|b| b.as_object())
        .map(|b| !b.is_empty())
        .unwrap_or(false);

    let mut changed = false;

    if !has_bindings {
        let mut bindings = serde_json::Map::new();
        collect_single(&mut bindings, obj, "title", "title", None);
        collect_single(&mut bindings, obj, "subtitle", "subtitle", None);
        collect_single(&mut bindings, obj, "image", "image", None);
        collect_single(&mut bindings, obj, "level", "level", Some("level_label"));
        collect_single(&mut bindings, obj, "type_line", "type_line", None);
        collect_single(&mut bindings, obj, "atk", "atk", Some("atk_label"));
        collect_single(&mut bindings, obj, "def", "def", Some("def_label"));
        collect_single(&mut bindings, obj, "hp", "hp", Some("hp_label"));
        collect_body(&mut bindings, obj);

        if !bindings.is_empty() {
            obj.insert("bindings".into(), Value::Object(bindings));
            changed = true;
        }
    }

    for k in LEGACY_FRAME_KEYS {
        if obj.remove(*k).is_some() {
            changed = true;
        }
    }

    changed
}

fn collect_single(
    bindings: &mut serde_json::Map<String, Value>,
    obj: &serde_json::Map<String, Value>,
    slot: &str,
    key: &str,
    label_key: Option<&str>,
) {
    let Some(src) = obj
        .get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
    else {
        return;
    };
    let mut entry = serde_json::Map::new();
    entry.insert("source".into(), Value::String(src.to_string()));
    entry.insert("values".into(), Value::Array(Vec::new()));
    if let Some(lk) = label_key {
        if let Some(lbl) = obj
            .get(lk)
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            entry.insert("label".into(), Value::String(lbl.to_string()));
        }
    }
    bindings.insert(slot.into(), Value::Object(entry));
}

fn collect_body(
    bindings: &mut serde_json::Map<String, Value>,
    obj: &serde_json::Map<String, Value>,
) {
    let Some(arr) = obj.get("body").and_then(|v| v.as_array()) else {
        return;
    };
    let values: Vec<Value> = arr
        .iter()
        .filter(|v| v.as_str().map(|s| !s.is_empty()).unwrap_or(false))
        .cloned()
        .collect();
    if values.is_empty() {
        return;
    }
    let mut entry = serde_json::Map::new();
    entry.insert("values".into(), Value::Array(values));
    bindings.insert("body".into(), Value::Object(entry));
}

/// 读取 card_types.json，逐项跑 JSON 迁移，再反序列化为 `CardType`。
/// merge / preset 导入旧包时用，保证旧映射不丢。
pub fn read_card_types_migrated(path: &Path) -> anyhow::Result<Vec<CardType>> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let bytes = std::fs::read(path)?;
    let mut values: Vec<Value> = serde_json::from_slice(&bytes)?;
    for v in values.iter_mut() {
        if let Some(frame) = v.get_mut("card_frame") {
            migrate_card_frame_json(frame);
        }
    }
    Ok(values
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect())
}
