use super::state::AppState;
use crate::core::model::board::Board;
use tauri::State;

#[tauri::command]
pub fn list_boards(state: State<AppState>) -> Result<Vec<Board>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_boards().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_board(state: State<AppState>, board: Board) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_board(&board).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_board(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_board(&id).map_err(|e| e.to_string())
}
