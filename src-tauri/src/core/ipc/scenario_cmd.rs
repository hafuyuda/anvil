use super::state::AppState;
use crate::core::eval;
use crate::core::model::scenario::Scenario;
use std::collections::BTreeMap;
use tauri::State;

#[tauri::command]
pub fn list_scenarios(state: State<AppState>) -> Result<Vec<Scenario>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_scenarios().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_scenario(state: State<AppState>, scenario: Scenario) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_scenario(&scenario).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_scenario(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_scenario(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_condition(scenario: Scenario, expr: String) -> Result<(), String> {
    eval::validate_condition(&scenario, &expr).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn eval_condition(
    scenario: Scenario,
    expr: String,
    overrides: BTreeMap<String, serde_json::Value>,
) -> Result<bool, String> {
    eval::eval_condition(&scenario, &expr, &overrides).map_err(|e| e.to_string())
}
