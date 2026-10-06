use super::state::AppState;
use crate::core::model::manifest::Manifest;
use crate::core::model::theme::Theme;
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

#[tauri::command]
pub fn create_project(path: String, name: String) -> Result<(), String> {
    let root = PathBuf::from(&path);

    // 1. 目录存在性检查（在写任何东西之前）
    if root.exists() {
        if !root.is_dir() {
            return Err("目标不是文件夹".into());
        }
        let entries = std::fs::read_dir(&root).map_err(|e| e.to_string())?;
        let mut names: Vec<String> = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            names.push(entry.file_name().to_string_lossy().into_owned());
        }
        if !names.is_empty() {
            // 明确告诉用户目录里有什么
            let preview: Vec<&str> = names.iter().take(5).map(|s| s.as_str()).collect();
            let suffix = if names.len() > 5 {
                format!(" 等 {} 项", names.len())
            } else {
                String::new()
            };
            return Err(format!(
                "目标目录不是空的，包含：{}{}。请选择一个空文件夹，或使用「打开」",
                preview.join("、"),
                suffix
            ));
        }
    } else {
        std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    }

    // 2. 到这里目录必然为空，开始创建
    let project = Project::open(&root).map_err(|e| e.to_string())?;

    // 3. 写 manifest
    let mut manifest = crate::core::model::manifest::Manifest::new(name);
    manifest.updated_at = crate::core::util::now_ms();
    if let Err(e) = project.save_manifest(&manifest) {
        // 出错时清理已经创建的目录结构
        let _ = std::fs::remove_dir_all(root.join("cards"));
        let _ = std::fs::remove_dir_all(root.join("types"));
        let _ = std::fs::remove_dir_all(root.join("relations"));
        let _ = std::fs::remove_dir_all(root.join("boards"));
        let _ = std::fs::remove_dir_all(root.join("scenarios"));
        let _ = std::fs::remove_dir_all(root.join("sessions"));
        let _ = std::fs::remove_dir_all(root.join(".anvil"));
        return Err(format!("写入 manifest 失败: {e}"));
    }

    Ok(())
}

#[tauri::command]
pub fn is_directory_empty(path: String) -> Result<bool, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Ok(true);
    }
    if !root.is_dir() {
        return Err("不是文件夹".into());
    }
    let mut entries = std::fs::read_dir(&root).map_err(|e| e.to_string())?;
    Ok(entries.next().is_none())
}

#[tauri::command]
pub fn list_themes(state: State<AppState>) -> Result<Vec<Theme>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.load_themes().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_theme(state: State<AppState>, theme: Theme) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.save_theme(&theme).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_theme(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_theme(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_image(state: State<AppState>, src: String) -> Result<String, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.import_image(&PathBuf::from(src))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_image(state: State<AppState>, relative: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.delete_image(&relative).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_images(state: State<AppState>) -> Result<Vec<String>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.list_images().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_image_data_url(state: State<AppState>, relative: String) -> Result<String, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.read_image_data_url(&relative).map_err(|e| e.to_string())
}

use crate::core::store::pack::{
    inspect_pack, InspectNamed, MergeOptions, MergeResult, PackInspection,
};

#[tauri::command]
pub fn inspect_pack_cmd(src: String) -> Result<PackInspection, String> {
    inspect_pack(&PathBuf::from(src)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn merge_pack(
    state: State<AppState>,
    src: String,
    options: MergeOptions,
) -> Result<MergeResult, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.merge_pack(&PathBuf::from(src), &options)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_unused_images(state: State<AppState>) -> Result<Vec<String>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.find_unused_images().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cleanup_unused_images(state: State<AppState>) -> Result<Vec<String>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.cleanup_unused_images().map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct ProjectStats {
    pub card_types: usize,
    pub relation_kinds: usize,
    pub cards: usize,
    pub relations: usize,
    pub scenarios: usize,
    pub boards: usize,
    pub sessions: usize,
    pub events: usize,
    pub images: usize,
}

#[tauri::command]
pub fn project_stats(state: State<AppState>) -> Result<ProjectStats, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;

    let card_types = p.load_card_types().map_err(|e| e.to_string())?.len();
    let relation_kinds = p.load_relation_kinds().map_err(|e| e.to_string())?.len();
    let cards = p.load_all_cards().map_err(|e| e.to_string())?.len();
    let relations = p.list_all_relations().map_err(|e| e.to_string())?.len();
    let scenarios = p.load_scenarios().map_err(|e| e.to_string())?.len();
    let boards = p.load_boards().map_err(|e| e.to_string())?.len();

    let sessions_list = p.load_sessions().map_err(|e| e.to_string())?;
    let sessions = sessions_list.len();
    let mut events = 0usize;
    for s in &sessions_list {
        events += p.load_events(&s.id).map(|v| v.len()).unwrap_or(0);
    }

    let images = p.list_images().map_err(|e| e.to_string())?.len();

    Ok(ProjectStats {
        card_types,
        relation_kinds,
        cards,
        relations,
        scenarios,
        boards,
        sessions,
        events,
        images,
    })
}
