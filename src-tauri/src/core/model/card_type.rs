use serde::{Deserialize, Serialize};
use serde_json::Value;

pub type TypeId = String;

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
    pub created_at: i64,
    pub updated_at: i64,
}
