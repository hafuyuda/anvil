use super::state::AppState;
use crate::core::model::scenario::Scenario;
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
pub fn list_scenario_script_files(
    state: State<AppState>,
    scenario_id: String,
) -> Result<Vec<String>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.list_script_files(&scenario_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_scenario_script(
    state: State<AppState>,
    scenario_id: String,
    filename: String,
) -> Result<Option<String>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_script(&scenario_id, &filename).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_scenario_script(
    state: State<AppState>,
    scenario_id: String,
    filename: String,
    content: String,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_script(&scenario_id, &filename, &content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_scenario_script(
    state: State<AppState>,
    scenario_id: String,
    filename: String,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_script(&scenario_id, &filename).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_scenario_scripts(
    state: State<AppState>,
    scenario_id: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<crate::core::store::scenarios::ScriptHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.search_scenario_scripts(&scenario_id, &query, limit.unwrap_or(30))
        .map_err(|e| e.to_string())
}
