use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

/// 一次跑团记录。
///
/// 精简后的边界：会话只负责「记下发生了什么」，不负责棋盘，也不负责战斗。
/// 队伍成员来自一个卡组 —— 角色的一切数据仍在卡牌上，会话只持有引用。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    /// 队伍卡组 id。成员 = 该卡组的 card_ids。
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub state: BTreeMap<String, Value>,
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
}
