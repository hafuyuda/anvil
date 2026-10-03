mod core;
mod features;

use core::ipc::card_cmd::{
    list_card_types, list_cards, open_project, save_card, seed_example_world, upsert_card_type,
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
            open_project,
            save_card,
            list_cards,
            list_card_types,
            upsert_card_type,
            seed_example_world
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
