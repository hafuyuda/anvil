use super::state::AppState;
use crate::core::model::manifest::Manifest;
use crate::core::store::project::Project;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub fn open_project(state: State<AppState>, path: String) -> Result<(), String> {
    let p = Project::open(path).map_err(|e| e.to_string())?;
    *state.project.lock().unwrap() = Some(p);
    Ok(())
}

#[tauri::command]
pub fn close_project(state: State<AppState>) -> Result<(), String> {
    *state.project.lock().unwrap() = None;
    Ok(())
}

#[derive(serde::Serialize)]
pub struct ProjectSnapshot {
    pub cards: Vec<crate::core::model::card::Card>,
    pub card_types: Vec<crate::core::model::card_type::CardType>,
    pub relation_kinds: Vec<crate::core::model::relation_kind::RelationKind>,
    pub relations: Vec<crate::core::model::relation::Relation>,
    pub scenarios: Vec<crate::core::model::scenario::Scenario>,
    pub boards: Vec<crate::core::model::board::Board>,
    pub sessions: Vec<crate::core::model::session::Session>,
}

#[tauri::command]
pub fn reload_project(state: State<AppState>) -> Result<ProjectSnapshot, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let (cards, card_types, relation_kinds, relations, scenarios, boards, sessions) =
        p.reload().map_err(|e| e.to_string())?;
    Ok(ProjectSnapshot {
        cards,
        card_types,
        relation_kinds,
        relations,
        scenarios,
        boards,
        sessions,
    })
}

#[tauri::command]
pub fn rebuild_index(state: State<AppState>) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.rebuild_index().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn seed_example_world(state: State<AppState>) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.seed_example_world().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_manifest(state: State<AppState>) -> Result<Manifest, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_manifest().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_manifest(state: State<AppState>, manifest: Manifest) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_manifest(&manifest).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_pack(state: State<AppState>, output_path: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.export_pack(&PathBuf::from(output_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_pack(src: String, dest: String) -> Result<(), String> {
    Project::import_pack_to(&PathBuf::from(src), &PathBuf::from(dest)).map_err(|e| e.to_string())
}
