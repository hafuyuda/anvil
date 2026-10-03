use crate::core::model::card_type::FieldDef;
use crate::core::model::card::TypeId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationKind {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub inverse_name: Option<String>,
    #[serde(default = "default_true")]
    pub directed: bool,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub from_types: Vec<TypeId>,
    #[serde(default)]
    pub to_types: Vec<TypeId>,
    #[serde(default)]
    pub fields: Vec<FieldDef>,
    pub created_at: i64,
    pub updated_at: i64,
}

fn default_true() -> bool {
    true
}