use super::state::AppState;
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
use tauri::State;

#[tauri::command]
pub fn list_relation_kinds(state: State<AppState>) -> Result<Vec<RelationKind>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_relation_kinds().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_relation_kind(
    state: State<AppState>,
    relation_kind: RelationKind,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let mut kinds = p.load_relation_kinds().map_err(|e| e.to_string())?;
    match kinds.iter_mut().find(|k| k.id == relation_kind.id) {
        Some(existing) => *existing = relation_kind,
        None => kinds.push(relation_kind),
    }
    p.save_relation_kinds(&kinds).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_all_relations(state: State<AppState>) -> Result<Vec<Relation>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.list_all_relations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_relation(state: State<AppState>, relation: Relation) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.upsert_relation(&relation).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_relation(
    state: State<AppState>,
    from_id: String,
    relation_id: String,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_relation(&from_id, &relation_id)
        .map_err(|e| e.to_string())
}
