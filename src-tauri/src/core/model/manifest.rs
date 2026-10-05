use serde::{Deserialize, Serialize};

pub const CURRENT_SCHEMA_VERSION: &str = "0.1";
pub const KIND_PROJECT: &str = "anvil-project";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    #[serde(default = "default_kind")]
    pub kind: String,
    #[serde(default = "default_schema")]
    pub schema_version: String,
    pub name: String,
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub theme_id: Option<String>,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

fn default_kind() -> String {
    KIND_PROJECT.into()
}

fn default_schema() -> String {
    CURRENT_SCHEMA_VERSION.into()
}

fn default_version() -> String {
    "0.1.0".into()
}

impl Manifest {
    pub fn new(name: impl Into<String>) -> Self {
        let now = crate::core::util::now_ms();
        Self {
            kind: KIND_PROJECT.into(),
            schema_version: CURRENT_SCHEMA_VERSION.into(),
            name: name.into(),
            version: "0.1.0".into(),
            author: None,
            description: None,
            theme_id: None,
            created_at: now,
            updated_at: now,
        }
    }
}
