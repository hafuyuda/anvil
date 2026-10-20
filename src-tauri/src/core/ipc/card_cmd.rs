use super::state::AppState;
use crate::core::model::card::Card;
use crate::core::model::card_type::CardType;
use tauri::State;

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
pub fn delete_card(
    state: State<AppState>,
    id: String,
    // "remove" = 一并移除引用它的棋子；"detach" = 保留棋子但断开指针。缺省 remove。
    mode: Option<String>,
) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    let mode = crate::core::store::refs::ClearMode::from_str_opt(mode.as_deref());
    p.delete_card(&id, mode).map_err(|e| e.to_string())
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
pub fn delete_card_type(state: State<AppState>, id: String) -> Result<(), String> {
    let guard = state.project.lock().unwrap();
    let p = guard.as_ref().ok_or("no project open")?;
    // 卡没有类型就渲染不出来，所以最后一道防线放在后端：
    // 还有卡在用的类型不允许删，宁可让用户先改类型。
    let using = p.scan_card_type_refs(&id).map_err(|e| e.to_string())?;
    if !using.is_empty() {
        return Err(format!(
            "还有 {} 张卡在使用这个类型，先删除或改类型。",
            using.len()
        ));
    }
    let mut types = p.load_card_types().map_err(|e| e.to_string())?;
    let before = types.len();
    types.retain(|t| t.id != id);
    if types.len() == before {
        return Ok(());
    }
    p.save_card_types(&types).map_err(|e| e.to_string())
}
