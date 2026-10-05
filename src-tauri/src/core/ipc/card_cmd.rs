use super::state::AppState;
use crate::core::model::card::Card;
use crate::core::model::card_type::CardType;
use tauri::State;

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
pub fn delete_card(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_card(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_cards(
    state: State<AppState>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<String>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.search_cards(&query, limit.unwrap_or(200))
        .map_err(|e| e.to_string())
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