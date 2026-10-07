use serde::{Deserialize, Serialize};
use serde_json::Value;

pub type TypeId = String;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CardFrameConfig {
    #[serde(default)]
    pub style: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub subtitle: Option<String>,
    #[serde(default)]
    pub image: Option<String>,
    #[serde(default)]
    pub level: Option<String>,
    #[serde(default)]
    pub level_label: Option<String>,
    #[serde(default)]
    pub type_line: Option<String>,
    #[serde(default)]
    pub body: Vec<String>,
    #[serde(default)]
    pub atk: Option<String>,
    #[serde(default)]
    pub atk_label: Option<String>,
    #[serde(default)]
    pub def: Option<String>,
    #[serde(default)]
    pub def_label: Option<String>,
    #[serde(default)]
    pub hp: Option<String>,
    #[serde(default)]
    pub hp_label: Option<String>,
    pub foil_field: Option<String>,
    #[serde(default)]
    pub foil_values: Vec<String>,
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
    pub created_at: i64,
    pub updated_at: i64,
}
