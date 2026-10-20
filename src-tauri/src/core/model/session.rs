use crate::core::model::board::Token;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

/// 事件可见性。缺省 public —— 旧数据没有该字段，天然是公开的。
pub const VIS_PUBLIC: &str = "public";
pub const VIS_SECRET: &str = "secret";

/// 先攻序列中的一条。参与者可以是棋盘上的 token，也可以是纯记录项。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitiativeEntry {
    /// 棋盘 token id（没有实体在场时为空）
    #[serde(default)]
    pub token_id: Option<String>,
    /// 参与者卡 id（KP 或临时 NPC 可为空）
    #[serde(default)]
    pub card_id: Option<String>,
    pub name: String,
    /// 先攻值，越大越先
    pub value: i32,
    /// 是否玩家角色（仅用于分组着色，不影响排序）
    #[serde(default)]
    pub is_pc: bool,
}

/// 战斗轮次追踪。存在 session 里，不在事件流里 —— 它是「当前状态」，不是「历史」。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitiativeTracker {
    /// 当前轮次，从 1 起
    #[serde(default)]
    pub round: u32,
    /// 当前行动者在 entries 中的下标
    #[serde(default)]
    pub turn_index: usize,
    /// 是否处于战斗追踪中
    #[serde(default)]
    pub active: bool,
    #[serde(default)]
    pub entries: Vec<InitiativeEntry>,
}

impl Default for InitiativeTracker {
    fn default() -> Self {
        Self {
            round: 1,
            turn_index: 0,
            active: false,
            entries: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub board_id: Option<String>,
    #[serde(default)]
    pub state: BTreeMap<String, Value>,
    /// 规则集 id：generic / coc7 / dnd5e。只决定掷骰结果的呈现方式，不做规则求解。
    #[serde(default)]
    pub rule_set: Option<String>,
    /// 先攻追踪。None 表示本会话不追踪战斗。
    #[serde(default)]
    pub tracker: Option<InitiativeTracker>,
    #[serde(default)]
    pub tokens: Vec<Token>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub seq: u64,
    pub at: i64,
    pub kind: String,
    #[serde(default)]
    pub payload: Value,
    #[serde(default)]
    pub note: Option<String>,
    /// "public" | "secret"。None 等价于 public，保证旧数据向后兼容。
    #[serde(default)]
    pub visibility: Option<String>,
    /// 这条秘密事件是否已被揭示。揭示后本体仍是 secret，公开的是另追加的 chat.reveal 副本。
    #[serde(default)]
    pub revealed: bool,
}

impl Event {
    pub fn is_secret(&self) -> bool {
        self.visibility.as_deref() == Some(VIS_SECRET)
    }
}
