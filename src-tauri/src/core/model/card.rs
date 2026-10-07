use crate::core::model::card_type::{CropRect, ImageExtend};
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
    #[serde(default)]
    pub image_crop_override: Option<CropRect>,
    #[serde(default)]
    pub image_extend_override: Option<ImageExtend>,
    pub created_at: i64,
    pub updated_at: i64,
}
