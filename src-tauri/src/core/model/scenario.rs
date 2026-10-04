use crate::core::model::card_type::FieldType;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableDef {
    pub key: String,
    pub label: String,
    pub ty: FieldType,
    #[serde(default)]
    pub default: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub entry_node: Option<String>,
    #[serde(default)]
    pub node_ids: Vec<String>,
    #[serde(default)]
    pub edge_kinds: Vec<String>,
    #[serde(default)]
    pub node_positions: BTreeMap<String, [f64; 2]>,
    #[serde(default)]
    pub variables: Vec<VariableDef>,
    pub created_at: i64,
    pub updated_at: i64,
}