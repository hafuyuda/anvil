use crate::core::model::card_type::FieldType;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 剧情变量定义（供 applyEffects 与导出使用）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableDef {
    pub key: String,
    pub label: String,
    pub ty: FieldType,
    #[serde(default)]
    pub default: Option<Value>,
}

/// 剧情元数据。流程拓扑不在其中——剧本本体是 `scenarios/<id>/*.md`（weave 语法）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    /// 入口 knot。为空时运行时取文件名字典序第一个文件的第一个 knot。
    #[serde(default)]
    pub entry_knot: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
