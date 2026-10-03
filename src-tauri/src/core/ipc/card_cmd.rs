use crate::core::model::card::Card;
use crate::core::model::card_type::CardType;
use crate::core::store::project::Project;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub project: Mutex<Option<Project>>,
}

#[tauri::command]
pub fn open_project(state: State<AppState>, path: String) -> Result<(), String> {
    let p = Project::open(path).map_err(|e| e.to_string())?;
    *state.project.lock().unwrap() = Some(p);
    Ok(())
}

#[tauri::command]
pub fn save_card(state: State<AppState>, card: Card) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_card(&card).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_cards(state: State<AppState>) -> Result<Vec<Card>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_all_cards().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_card_types(state: State<AppState>) -> Result<Vec<CardType>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_card_types().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_card_type(state: State<AppState>, card_type: CardType) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let mut types = p.load_card_types().map_err(|e| e.to_string())?;
    match types.iter_mut().find(|t| t.id == card_type.id) {
        Some(existing) => *existing = card_type,
        None => types.push(card_type),
    }
    p.save_card_types(&types).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn seed_example_world(state: State<AppState>) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.seed_example_world().map_err(|e| e.to_string())
}