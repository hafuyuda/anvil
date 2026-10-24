use super::state::AppState;
use crate::core::model::board::Board;
use crate::core::model::session::Event;
use crate::core::util::now_ms;
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

// ── 单棋盘导出 / 导入 ──

#[tauri::command]
pub fn export_board(
    state: State<AppState>,
    board_id: String,
    output_path: String,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.export_board(&board_id, std::path::Path::new(&output_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_board(state: State<AppState>, input_path: String) -> Result<Board, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.import_board(std::path::Path::new(&input_path))
        .map_err(|e| e.to_string())
}
// 与会话事件命令同构，只是挂在棋盘上：boards/<id>/events.jsonl

#[tauri::command]
pub fn list_board_events(
    state: State<AppState>,
    board_id: String,
) -> Result<Vec<Event>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_board_events(&board_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn append_board_event(
    state: State<AppState>,
    board_id: String,
    kind: String,
    payload: serde_json::Value,
    note: Option<String>,
) -> Result<Event, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let ev = Event {
        seq: 0,
        at: now_ms(),
        kind,
        payload,
        note,
    };
    p.append_board_event(&board_id, ev)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_board_event(
    state: State<AppState>,
    board_id: String,
    seq: u64,
    payload: serde_json::Value,
    note: Option<String>,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.update_board_event(&board_id, seq, payload, note)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_board_event(
    state: State<AppState>,
    board_id: String,
    seq: u64,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_board_event(&board_id, seq)
        .map_err(|e| e.to_string())
}
