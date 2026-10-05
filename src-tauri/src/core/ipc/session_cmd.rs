use super::state::AppState;
use crate::core::model::session::{Event, Session};
use crate::core::util::now_ms;
use tauri::State;

#[tauri::command]
pub fn list_sessions(state: State<AppState>) -> Result<Vec<Session>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_session(state: State<AppState>, session: Session) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_session(&session).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_session(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_session(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_events(state: State<AppState>, session_id: String) -> Result<Vec<Event>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_events(&session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn append_event(
    state: State<AppState>,
    session_id: String,
    kind: String,
    payload: serde_json::Value,
    note: Option<String>,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let ev = Event {
        seq: 0,
        at: now_ms(),
        kind,
        payload,
        note,
    };
    p.append_event(&session_id, ev).map_err(|e| e.to_string())
}
