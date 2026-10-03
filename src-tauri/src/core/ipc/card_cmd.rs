use crate::core::model::card::Card;
use crate::core::model::card_type::CardType;
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
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
pub fn rebuild_index(state: State<AppState>) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.rebuild_index().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_card(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_card(&id).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct ProjectSnapshot {
    pub cards: Vec<Card>,
    pub card_types: Vec<CardType>,
    pub relation_kinds: Vec<RelationKind>,
    pub relations: Vec<Relation>,
}

#[tauri::command]
pub fn reload_project(state: State<AppState>) -> Result<ProjectSnapshot, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let (cards, card_types, relation_kinds, relations) = p.reload().map_err(|e| e.to_string())?;
    Ok(ProjectSnapshot { 
        cards, 
        card_types, 
        relation_kinds, 
        relations,
      })
}

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
