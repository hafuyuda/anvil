use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    /// CSS 变量：key 形如 "--bg-app"，value 是 CSS 值
    #[serde(default)]
    pub variables: BTreeMap<String, String>,
    pub created_at: i64,
    pub updated_at: i64,
}