//! 引用扫描的 IPC 命令。
//!
//! 只负责回答「谁在引用它」。真正的清理发生在删除命令里——
//! 扫描本身不改动任何数据，可以随便调用。

use super::state::AppState;
use crate::core::store::refs::RefHit;
use tauri::State;

/// 扫描对某张卡的引用。
#[tauri::command]
pub fn scan_card_refs(state: State<AppState>, id: String) -> Result<Vec<RefHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.scan_card_refs(&id).map_err(|e| e.to_string())
}

/// 一次性扫描对多张卡的引用。卡墙批量删除走它，只遍历一遍文件。
#[tauri::command]
pub fn scan_card_refs_batch(
    state: State<AppState>,
    ids: Vec<String>,
) -> Result<Vec<RefHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.scan_card_refs_batch(&ids).map_err(|e| e.to_string())
}

/// 扫描对某个棋盘的引用（哪些会话拿它当战场）。
#[tauri::command]
pub fn scan_board_refs(state: State<AppState>, id: String) -> Result<Vec<RefHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.scan_board_refs(&id).map_err(|e| e.to_string())
}

/// 扫描对某个卡组的引用（哪些卡盒用它做的）。
#[tauri::command]
pub fn scan_card_group_refs(state: State<AppState>, id: String) -> Result<Vec<RefHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.scan_card_group_refs(&id).map_err(|e| e.to_string())
}

/// 扫描对某个卡类型的引用（哪些卡还在用它）。
#[tauri::command]
pub fn scan_card_type_refs(state: State<AppState>, id: String) -> Result<Vec<RefHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.scan_card_type_refs(&id).map_err(|e| e.to_string())
}

/// 全项目体检：列出所有指向不存在卡牌的悬空引用。
///
/// 老项目在引用清理机制上线前攒下的悬空边，靠它一次性找出来。
#[tauri::command]
pub fn scan_dangling_refs(state: State<AppState>) -> Result<Vec<RefHit>, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.scan_dangling_refs().map_err(|e| e.to_string())
}

/// 清理所有悬空引用。返回清理的处数。
///
/// 不可逆。调用方必须先 scan_dangling_refs 把数量摆给用户看。
#[tauri::command]
pub fn purge_dangling_refs(state: State<AppState>) -> Result<usize, String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    p.purge_dangling_refs().map_err(|e| e.to_string())
}
