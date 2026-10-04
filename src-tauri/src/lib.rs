mod core;
mod features;

use core::ipc::card_cmd::{
    close_project, delete_board, delete_card, delete_relation, delete_scenario, eval_condition,
    list_all_relations, list_boards, list_card_types, list_cards, list_relation_kinds,
    list_scenarios, open_project, rebuild_index, reload_project, save_card, search_cards,
    seed_example_world, upsert_board, upsert_card_type, upsert_relation, upsert_relation_kind,
    upsert_scenario, validate_condition, AppState,
};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            project: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // 项目
            open_project,
            close_project,
            reload_project,
            rebuild_index,
            seed_example_world,
            // 卡牌
            save_card,
            list_cards,
            delete_card,
            search_cards,
            // 卡牌类型
            list_card_types,
            upsert_card_type,
            // 关系类型
            list_relation_kinds,
            upsert_relation_kind,
            // 关系实例
            list_all_relations,
            upsert_relation,
            delete_relation,
            // 剧情
            list_scenarios,
            upsert_scenario,
            delete_scenario,
            // 棋盘
            list_boards,
            upsert_board,
            delete_board,
            // 条件求值
            validate_condition,
            eval_condition,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
