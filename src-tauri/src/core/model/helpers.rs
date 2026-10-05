use crate::core::model::card_type::{FieldDef, FieldType};
use serde_json::Value;
use std::collections::BTreeMap;

pub fn fdef(key: &str, label: &str, ty: FieldType, order: i32, required: bool) -> FieldDef {
    FieldDef {
        key: key.into(),
        label: label.into(),
        ty,
        required,
        default: None,
        group: None,
        order,
        deprecated: false,
    }
}

pub fn values(pairs: &[(&str, Value)]) -> BTreeMap<String, Value> {
    pairs
        .iter()
        .map(|(k, v)| ((*k).to_string(), v.clone()))
        .collect()
}
