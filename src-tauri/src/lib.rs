mod core;
//mod features;

use core::ipc::{
    board_cmd::*, card_cmd::*, project_cmd::*, relation_cmd::*, scenario_cmd::*, session_cmd::*,
    AppState,
};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            project: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // project
            open_project,
            close_project,
            reload_project,
            rebuild_index,
            seed_example_world,
            load_manifest,
            save_manifest,
            export_pack,
            import_pack,
            create_project,
            is_directory_empty,
            list_themes,
            upsert_theme,
            delete_theme,
            import_image,
            delete_image,
            list_images,
            read_image_data_url,
            inspect_pack_cmd,
            merge_pack,
            // cards
            save_card,
            list_cards,
            delete_card,
            search_cards,
            list_card_types,
            upsert_card_type,
            delete_card_type,
            // relations
            list_relation_kinds,
            upsert_relation_kind,
            list_all_relations,
            upsert_relation,
            delete_relation,
            delete_relation_kind,
            // scenarios
            list_scenarios,
            upsert_scenario,
            delete_scenario,
            validate_condition,
            eval_condition,
            // boards
            list_boards,
            upsert_board,
            delete_board,
            // sessions
            list_sessions,
            upsert_session,
            delete_session,
            list_events,
            append_event,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
