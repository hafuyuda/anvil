use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridConfig {
    pub size: f64,
    #[serde(default)]
    pub offset_x: f64,
    #[serde(default)]
    pub offset_y: f64,
    #[serde(default = "default_true")]
    pub visible: bool,
    #[serde(default = "default_true")]
    pub snap: bool,
}

impl Default for GridConfig {
    fn default() -> Self {
        Self {
            size: 50.0,
            offset_x: 0.0,
            offset_y: 0.0,
            visible: true,
            snap: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub id: String,
    #[serde(default)]
    pub card_id: Option<String>,
    #[serde(default)]
    pub name_override: Option<String>,
    #[serde(default)]
    pub value_overrides: BTreeMap<String, serde_json::Value>,
    pub x: f64,
    pub y: f64,
    #[serde(default)]
    pub w: Option<f64>,
    #[serde(default)]
    pub h: Option<f64>,
    #[serde(default)]
    pub rotation: f64,
    #[serde(default)]
    pub layer: i32,
    #[serde(default = "default_true")]
    pub visible: bool,
}

fn default_board_width() -> f64 {
    1200.0
}
fn default_board_height() -> f64 {
    800.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Board {
    pub id: String,
    pub name: String,
    #[serde(default = "default_board_width")]
    pub width: f64,
    #[serde(default = "default_board_height")]
    pub height: f64,
    #[serde(default)]
    pub grid: GridConfig,
    #[serde(default)]
    pub background: Option<String>,
    #[serde(default)]
    pub tokens: Vec<Token>,
    pub created_at: i64,
    pub updated_at: i64,
}
