use crate::core::model::board::Token;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub board_id: Option<String>,
    #[serde(default)]
    pub state: BTreeMap<String, Value>,
    #[serde(default)]
    pub tokens: Vec<Token>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub seq: u64,
    pub at: i64,
    pub kind: String,
    #[serde(default)]
    pub payload: Value,
    #[serde(default)]
    pub note: Option<String>,
}
