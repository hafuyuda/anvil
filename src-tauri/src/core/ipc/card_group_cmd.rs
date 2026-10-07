use super::state::AppState;
use crate::core::model::card_group::CardGroup;
use tauri::State;

#[tauri::command]
pub fn list_card_groups(state: State<AppState>) -> Result<Vec<CardGroup>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_card_groups().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_card_group(state: State<AppState>, card_group: CardGroup) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_card_group(&card_group).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_card_group(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_card_group(&id).map_err(|e| e.to_string())
}
