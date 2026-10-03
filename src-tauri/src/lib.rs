mod core;
mod features;

use core::ipc::card_cmd::{
    delete_card, list_card_types, list_cards, open_project, rebuild_index, reload_project,
    save_card, search_cards, seed_example_world, upsert_card_type, AppState,
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
            open_project,
            save_card,
            list_cards,
            list_card_types,
            upsert_card_type,
            seed_example_world,
            search_cards,
            rebuild_index,
            delete_card,
            reload_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
