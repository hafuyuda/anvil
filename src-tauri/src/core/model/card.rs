use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type CardId = String;
pub type TypeId = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: CardId,
    pub type_id: TypeId,
    pub name: String,
    pub values: BTreeMap<String, serde_json::Value>,
    pub created_at: i64,
    pub updated_at: i64,
}
