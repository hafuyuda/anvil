//! 引用扫描与清理。
//!
//! 项目里「一切实体皆卡牌」只建立了正向引用（token 指向 card），
//! 反向一直没人维护：删掉一张卡，棋盘上的棋子还蹲在那儿。
//! 本模块负责回答两件事——
//!   1. 谁在引用它（scan_*，只报不改）
//!   2. 把这些引用摘掉（purge_*，改数据）
//!
//! 清理分两种力度：
//!   Remove —— 把引用者整个摘掉（棋子消失、卡盒移除）
//!   Detach —— 保留引用者，但断开指针并留下名字（棋子退化成灰占位块）
//! 让用户选哪个，由 UI 决定；本模块不做静默级联删除。

use crate::core::model::board::{PileData, Token};
use serde::{Deserialize, Serialize};

use super::project::Project;

/// 引用来源的种类。前端按它决定图标与文案。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RefKind {
    /// 棋盘上的棋子
    BoardToken,
    /// 棋盘上的卡盒（牌堆里有它）
    BoardPile,
    /// 会话拿它当队伍
    SessionParty,
    /// 关系边（指向它或被它指向）
    Relation,
    /// 卡组成员
    CardGroup,
    /// 还在用这个卡类型的卡
    CardType,
}

impl RefKind {
    /// 能否被自动清理。为 false 的只报给用户，由用户自己处理。
    pub fn auto_clearable(&self) -> bool {
        !matches!(self, RefKind::CardType)
    }
}

/// 一条引用记录。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefHit {
    pub kind: RefKind,
    /// 宿主实体 id（棋盘 / 会话 / 卡组）
    pub owner_id: String,
    /// 宿主实体名
    pub owner_name: String,
    /// 更细的定位：token id / 关系 id
    #[serde(default)]
    pub detail: Option<String>,
    /// 完整中文描述，UI 可直接展示
    pub label: String,
    /// 能否自动清理。false 表示需要用户手动处理
    pub auto: bool,
}

impl RefHit {
    fn new(kind: RefKind, owner_id: &str, owner_name: &str, label: String) -> Self {
        Self {
            kind,
            owner_id: owner_id.to_string(),
            owner_name: owner_name.to_string(),
            detail: None,
            label,
            auto: kind.auto_clearable(),
        }
    }
}

/// 清理力度。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClearMode {
    /// 移除引用者本身
    Remove,
    /// 保留引用者，断开指针
    Detach,
}

impl ClearMode {
    pub fn from_str_opt(s: Option<&str>) -> Self {
        match s {
            Some("detach") => ClearMode::Detach,
            _ => ClearMode::Remove,
        }
    }
}

/// 摘掉指向不存在卡牌的 token（含牌堆里的悬空卡）。
///
/// 这里没有 Detach 一说：卡本来就不存在，留个墓碑只会更让人困惑。
fn strip_missing_tokens(
    tokens: &mut Vec<Token>,
    alive: &std::collections::HashSet<String>,
) -> usize {
    let mut changed = 0;

    let before = tokens.len();
    tokens.retain(|t| match &t.card_id {
        Some(cid) => alive.contains(cid),
        None => true,
    });
    changed += before - tokens.len();

    for t in tokens.iter_mut() {
        let Some(p) = t.pile.as_mut() else { continue };
        let r = p.remaining.len();
        let i = p.initial.len();
        p.remaining.retain(|id| alive.contains(id));
        p.initial.retain(|id| alive.contains(id));
        if p.remaining.len() != r || p.initial.len() != i {
            p.total = p.initial.len();
            changed += 1;
        }
    }

    changed
}

/// 把一条引用记录挂到对应卡的名下。
fn push_hit(
    map: &mut std::collections::BTreeMap<String, Vec<RefHit>>,
    card_id: &str,
    hit: RefHit,
) {
    map.entry(card_id.to_string()).or_default().push(hit);
}

/// 从一堆 token 里摘掉对某张卡的引用。返回被摘掉的数量。
fn strip_tokens(tokens: &mut Vec<Token>, card_id: &str, card_name: &str, mode: ClearMode) -> usize {
    let mut changed = 0;

    if mode == ClearMode::Remove {
        let before = tokens.len();
        tokens.retain(|t| t.card_id.as_deref() != Some(card_id));
        changed += before - tokens.len();
    } else {
        for t in tokens.iter_mut() {
            if t.card_id.as_deref() != Some(card_id) {
                continue;
            }
            // 保留棋子，但断开指针 —— 前端会渲染成灰占位块
            t.card_id = None;
            let base = t.name_override.clone().unwrap_or_else(|| card_name.to_string());
            t.name_override = Some(format!("{base}（已删除）"));
            changed += 1;
        }
    }

    // 卡盒里的牌堆。无论哪种力度都要清理 —— 牌堆里不能留悬空 id，
    // 否则 total 与实际不符，抽出来是个空壳。
    for t in tokens.iter_mut() {
        let Some(pile) = t.pile.as_mut() else { continue };
        if strip_pile(pile, card_id) {
            changed += 1;
        }
    }

    changed
}

/// 从牌堆里移除一张卡。返回是否改动。
fn strip_pile(pile: &mut PileData, card_id: &str) -> bool {
    let r_before = pile.remaining.len();
    let i_before = pile.initial.len();
    pile.remaining.retain(|id| id != card_id);
    pile.initial.retain(|id| id != card_id);
    if pile.remaining.len() == r_before && pile.initial.len() == i_before {
        return false;
    }
    // total 是「初始总张数」，跟着 initial 走
    pile.total = pile.initial.len();
    true
}

impl Project {
    // ───────────────── 扫描 ─────────────────

    /// 谁在引用这张卡。
    pub fn scan_card_refs(&self, card_id: &str) -> anyhow::Result<Vec<RefHit>> {
        let mut ids = std::collections::HashSet::new();
        ids.insert(card_id.to_string());
        let mut map = self.collect_card_refs(&ids)?;
        Ok(map.remove(card_id).unwrap_or_default())
    }

    /// 谁在引用这些卡。卡墙批量删除时走它 —— 只遍历一遍所有文件。
    pub fn scan_card_refs_batch(&self, ids: &[String]) -> anyhow::Result<Vec<RefHit>> {
        let set: std::collections::HashSet<String> = ids.iter().cloned().collect();
        if set.is_empty() {
            return Ok(Vec::new());
        }
        let map = self.collect_card_refs(&set)?;
        Ok(map.into_values().flatten().collect())
    }

    /// 一次遍历所有文件，收集一组卡的引用，按卡 id 分组。
    fn collect_card_refs(
        &self,
        ids: &std::collections::HashSet<String>,
    ) -> anyhow::Result<std::collections::BTreeMap<String, Vec<RefHit>>> {
        let mut map: std::collections::BTreeMap<String, Vec<RefHit>> =
            std::collections::BTreeMap::new();

        for b in self.load_boards()? {
            for t in &b.tokens {
                if let Some(p) = &t.pile {
                    // 卡盒里可能同时有多张待删的卡，每张都要报。
                    // 同一个 id 在 remaining 与 initial 里各出现一次，去重。
                    let mut seen: Vec<&String> = Vec::new();
                    for cid in p.remaining.iter().chain(p.initial.iter()) {
                        if ids.contains(cid) && !seen.contains(&cid) {
                            seen.push(cid);
                            push_hit(
                                &mut map,
                                cid,
                                RefHit::new(
                                    RefKind::BoardPile,
                                    &b.id,
                                    &b.name,
                                    format!("棋盘「{}」的卡盒「{}」里有它", b.name, p.label),
                                ),
                            );
                        }
                    }
                } else if let Some(cid) = t.card_id.as_deref().filter(|c| ids.contains(*c)) {
                    push_hit(
                        &mut map,
                        cid,
                        RefHit::new(
                            RefKind::BoardToken,
                            &b.id,
                            &b.name,
                            format!("棋盘「{}」上有它的棋子", b.name),
                        ),
                    );
                }
            }
        }

        for r in self.list_all_relations()? {
            if ids.contains(&r.from) {
                push_hit(
                    &mut map,
                    &r.from,
                    RefHit::new(
                        RefKind::Relation,
                        &r.to,
                        &r.to,
                        format!("它指向「{}」的关系「{}」", r.to, r.kind),
                    ),
                );
            }
            if ids.contains(&r.to) {
                push_hit(
                    &mut map,
                    &r.to,
                    RefHit::new(
                        RefKind::Relation,
                        &r.from,
                        &r.from,
                        format!("「{}」指向它的关系「{}」", r.from, r.kind),
                    ),
                );
            }
        }

        for g in self.load_card_groups()? {
            for cid in &g.card_ids {
                if ids.contains(cid) {
                    push_hit(
                        &mut map,
                        cid,
                        RefHit::new(
                            RefKind::CardGroup,
                            &g.id,
                            &g.name,
                            format!("它在卡组「{}」里", g.name),
                        ),
                    );
                }
            }
        }

        Ok(map)
    }

    /// 谁在引用这个棋盘。会话不再绑定棋盘，因此没有引用者 ——
    /// 保留这个空实现是为了让删除棋盘的调用方不必特判。
    pub fn scan_board_refs(&self, _board_id: &str) -> anyhow::Result<Vec<RefHit>> {
        Ok(Vec::new())
    }

    /// 谁在引用这个卡组（棋盘/会话上用它做的卡盒）。
    pub fn scan_card_group_refs(&self, group_id: &str) -> anyhow::Result<Vec<RefHit>> {
        let mut hits = Vec::new();

        for b in self.load_boards()? {
            for t in &b.tokens {
                if t.pile.as_ref().map(|p| p.group_id.as_str()) == Some(group_id) {
                    hits.push(RefHit::new(
                        RefKind::BoardPile,
                        &b.id,
                        &b.name,
                        format!("棋盘「{}」上有用它做的卡盒", b.name),
                    ));
                }
            }
        }
        for s in self.load_sessions()? {
            if s.group_id.as_deref() == Some(group_id) {
                hits.push(RefHit::new(
                    RefKind::SessionParty,
                    &s.id,
                    &s.name,
                    format!("会话「{}」用它当队伍", s.name),
                ));
            }
        }

        Ok(hits)
    }

    /// 谁在引用这个卡类型（还在用它的卡）。
    pub fn scan_card_type_refs(&self, type_id: &str) -> anyhow::Result<Vec<RefHit>> {
        let mut hits = Vec::new();
        for c in self.load_all_cards()? {
            if c.type_id == type_id {
                hits.push(RefHit::new(
                    RefKind::CardType,
                    &c.id,
                    &c.name,
                    format!("卡牌「{}」在用这个类型", c.name),
                ));
            }
        }
        Ok(hits)
    }

    // ───────────────── 清理 ─────────────────

    /// 摘掉所有指向这张卡的引用。
    ///
    /// 注意：卡组引用也在这里一并清理，调用方不必再调
    /// `remove_card_from_all_groups`。
    pub fn purge_card_refs(
        &self,
        card_id: &str,
        card_name: &str,
        mode: ClearMode,
    ) -> anyhow::Result<usize> {
        let mut n = 0;

        for mut b in self.load_boards()? {
            let c = strip_tokens(&mut b.tokens, card_id, card_name, mode);
            if c > 0 {
                b.updated_at = crate::core::util::now_ms();
                self.save_board(&b)?;
                n += c;
            }
        }

        // 会话不再持有棋子，也不再持有先攻序列。它引用卡的唯一途径是队伍卡组，
        // 由下面的 remove_card_from_all_groups 一并处理。

        n += self.delete_relations_touching(card_id)?;
        n += self.remove_card_from_all_groups(card_id)?;
        Ok(n)
    }

    /// 摘掉会话对这个棋盘的绑定。
    ///
    /// 会话已不再绑定棋盘，这里恒为 0。保留函数是为了让删除棋盘的调用方
    /// 不必特判 —— 哪天棋盘又有了引用者，只改这一处。
    pub fn purge_board_refs(&self, _board_id: &str) -> anyhow::Result<usize> {
        Ok(0)
    }

    /// 摘掉棋盘上用这个卡组做的卡盒，并解绑以它当队伍的会话。
    pub fn purge_card_group_refs(&self, group_id: &str) -> anyhow::Result<usize> {
        let mut n = 0;

        for mut b in self.load_boards()? {
            let before = b.tokens.len();
            b.tokens.retain(|t| {
                t.pile.as_ref().map(|p| p.group_id.as_str()) != Some(group_id)
            });
            if b.tokens.len() != before {
                b.updated_at = crate::core::util::now_ms();
                self.save_board(&b)?;
                n += before - b.tokens.len();
            }
        }
        for mut s in self.load_sessions()? {
            if s.group_id.as_deref() != Some(group_id) {
                continue;
            }
            s.group_id = None;
            s.updated_at = crate::core::util::now_ms();
            self.save_session(&s)?;
            n += 1;
        }

        Ok(n)
    }

    /// 删除所有与这张卡相关的关系边（两侧都删）。
    ///
    /// 关系按 from 分文件存储，指向它的边存在别人的文件里 —— 只删自己
    /// 那一份会留下反向悬空边。
    fn delete_relations_touching(&self, card_id: &str) -> anyhow::Result<usize> {
        let all = self.list_all_relations()?;
        let mut touched: Vec<String> = Vec::new();
        for r in &all {
            if r.from == card_id || r.to == card_id {
                if !touched.contains(&r.from) {
                    touched.push(r.from.clone());
                }
            }
        }
        if touched.is_empty() {
            return Ok(0);
        }

        let mut removed = 0;
        let mut gone_ids: Vec<String> = Vec::new();
        for from in &touched {
            let mut rels = self.load_relations_from(from)?;
            let before = rels.len();
            let mut dropped: Vec<String> = Vec::new();
            rels.retain(|r| {
                let hit = r.from == card_id || r.to == card_id;
                if hit {
                    dropped.push(r.id.clone());
                }
                !hit
            });
            if rels.len() != before {
                self.save_relations_from(from, &rels)?;
                removed += before - rels.len();
                gone_ids.extend(dropped);
            }
        }

        let conn = self.index.lock().unwrap();
        for id in gone_ids {
            crate::core::index::delete_relation(&conn, &id)?;
        }
        Ok(removed)
    }

    /// 清理所有指向不存在卡牌的悬空引用。返回清理的处数。
    ///
    /// 用于给老项目做体检：在引用清理机制上线之前攒下的悬空边，
    /// 靠它一次性拔掉。清理是不可逆的，所以调用方必须先扫描并让用户确认。
    pub fn purge_dangling_refs(&self) -> anyhow::Result<usize> {
        let alive: std::collections::HashSet<String> =
            self.load_all_cards()?.into_iter().map(|c| c.id).collect();
        let mut n = 0;

        for mut b in self.load_boards()? {
            let c = strip_missing_tokens(&mut b.tokens, &alive);
            if c > 0 {
                b.updated_at = crate::core::util::now_ms();
                self.save_board(&b)?;
                n += c;
            }
        }

        // 会话不再持有棋子与先攻序列，无需清理。

        // 关系：两端只要有一端没了，这条边就失去意义
        let all = self.list_all_relations()?;
        let mut touched: Vec<String> = Vec::new();
        for r in &all {
            if !alive.contains(&r.from) || !alive.contains(&r.to) {
                if !touched.contains(&r.from) {
                    touched.push(r.from.clone());
                }
            }
        }
        let mut gone: Vec<String> = Vec::new();
        for from in &touched {
            let mut rels = self.load_relations_from(from)?;
            let before = rels.len();
            let mut dropped = Vec::new();
            rels.retain(|r| {
                let dead = !alive.contains(&r.from) || !alive.contains(&r.to);
                if dead {
                    dropped.push(r.id.clone());
                }
                !dead
            });
            if rels.len() != before {
                self.save_relations_from(from, &rels)?;
                n += before - rels.len();
                gone.extend(dropped);
            }
        }
        {
            let conn = self.index.lock().unwrap();
            for id in gone {
                crate::core::index::delete_relation(&conn, &id)?;
            }
        }

        // 卡组里的悬空成员
        for mut g in self.load_card_groups()? {
            let before = g.card_ids.len();
            g.card_ids.retain(|id| alive.contains(id));
            if g.card_ids.len() != before {
                g.updated_at = crate::core::util::now_ms();
                self.save_card_group(&g)?;
                n += before - g.card_ids.len();
            }
        }

        Ok(n)
    }

    /// 列出仍指向不存在的卡的悬空引用。
    ///
    /// 用于「体检」：老项目在引用清理机制上线前攒下的悬空边，
    /// 扫描出来让用户自己决定怎么处理。
    pub fn scan_dangling_refs(&self) -> anyhow::Result<Vec<RefHit>> {
        let alive: std::collections::HashSet<String> =
            self.load_all_cards()?.into_iter().map(|c| c.id).collect();
        let mut hits = Vec::new();

        for b in self.load_boards()? {
            for t in &b.tokens {
                if let Some(cid) = &t.card_id {
                    if !alive.contains(cid) {
                        hits.push(RefHit::new(
                            RefKind::BoardToken,
                            &b.id,
                            &b.name,
                            format!("棋盘「{}」上有悬空棋子 {}", b.name, cid),
                        ));
                    }
                }
                if let Some(p) = &t.pile {
                    for cid in p.remaining.iter().chain(p.initial.iter()) {
                        if !alive.contains(cid) {
                            hits.push(RefHit::new(
                                RefKind::BoardPile,
                                &b.id,
                                &b.name,
                                format!("棋盘「{}」的卡盒「{}」里有悬空卡 {}", b.name, p.label, cid),
                            ));
                        }
                    }
                }
            }
        }

        // 会话只通过队伍卡组引用卡，且卡组成员由后端同步维护，
        // 不存在悬空引用 —— 无需扫描。

        for r in self.list_all_relations()? {
            for cid in [&r.from, &r.to] {
                if !alive.contains(cid) {
                    hits.push(RefHit::new(
                        RefKind::Relation,
                        &r.from,
                        &r.from,
                        format!("关系「{}」指向了不存在的卡 {}", r.kind, cid),
                    ));
                }
            }
        }

        for g in self.load_card_groups()? {
            for cid in &g.card_ids {
                if !alive.contains(cid) {
                    hits.push(RefHit::new(
                        RefKind::CardGroup,
                        &g.id,
                        &g.name,
                        format!("卡组「{}」里有悬空卡 {}", g.name, cid),
                    ));
                }
            }
        }

        Ok(hits)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::model::board::{Board, PileData, Token};
    use crate::core::model::card::Card;
    use crate::core::model::card_group::CardGroup;
    use crate::core::model::relation::Relation;
    use crate::core::model::session::Session;
    use std::collections::BTreeMap;

    const T: i64 = 1_700_000_000_000;

    fn proj(name: &str) -> (Project, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!(
            "anvil_refs_{}_{}",
            name,
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let p = Project::open(&dir).expect("open temp project");
        (p, dir)
    }

    fn card(id: &str, name: &str, type_id: &str) -> Card {
        Card {
            id: id.into(),
            type_id: type_id.into(),
            name: name.into(),
            values: BTreeMap::new(),
            image_crop_override: None,
            created_at: T,
            updated_at: T,
        }
    }

    fn token(id: &str, card_id: Option<&str>) -> Token {
        Token {
            id: id.into(),
            card_id: card_id.map(|s| s.to_string()),
            name_override: None,
            value_overrides: BTreeMap::new(),
            x: 0.0,
            y: 0.0,
            w: None,
            h: None,
            rotation: 0.0,
            layer: 0,
            visible: true,
            face_down: false,
            pile: None,
        }
    }

    fn pile_token(id: &str, group_id: &str, ids: &[&str]) -> Token {
        Token {
            id: id.into(),
            card_id: None,
            name_override: None,
            value_overrides: BTreeMap::new(),
            x: 0.0,
            y: 0.0,
            w: None,
            h: None,
            rotation: 0.0,
            layer: 0,
            visible: true,
            face_down: false,
            pile: Some(PileData {
                group_id: group_id.into(),
                label: "遭遇堆".into(),
                remaining: ids.iter().map(|s| s.to_string()).collect(),
                initial: ids.iter().map(|s| s.to_string()).collect(),
                total: ids.len(),
            }),
        }
    }

    fn board(id: &str, name: &str, tokens: Vec<Token>) -> Board {
        Board {
            id: id.into(),
            name: name.into(),
            width: 800.0,
            height: 600.0,
            grid: Default::default(),
            background: None,
            tokens,
            show_relations: false,
            visible_relation_kinds: vec![],
            created_at: T,
            updated_at: T,
        }
    }

    fn session(id: &str, name: &str, group_id: Option<&str>) -> Session {
        Session {
            id: id.into(),
            name: name.into(),
            group_id: group_id.map(|s| s.to_string()),
            state: BTreeMap::new(),
            created_at: T,
            updated_at: T,
        }
    }

    fn rel(id: &str, from: &str, to: &str, kind: &str) -> Relation {
        Relation {
            id: id.into(),
            from: from.into(),
            to: to.into(),
            kind: kind.into(),
            label: None,
            meta: BTreeMap::new(),
            created_at: T,
        }
    }

    fn group(id: &str, name: &str, ids: &[&str]) -> CardGroup {
        CardGroup {
            id: id.into(),
            name: name.into(),
            description: None,
            card_ids: ids.iter().map(|s| s.to_string()).collect(),
            created_at: T,
            updated_at: T,
        }
    }

    /// 建一个有棋盘、会话、关系、卡组都引用 card_dragon 的项目
    fn wired() -> (Project, std::path::PathBuf) {
        let (p, dir) = proj("wired");
        p.save_card(&card("card_dragon", "红龙", "type_m")).unwrap();
        p.save_card(&card("card_dwarf", "索林", "type_c")).unwrap();

        p.save_board(&board(
            "board_tavern",
            "酒馆",
            vec![
                token("tok_dragon", Some("card_dragon")),
                token("tok_dwarf", Some("card_dwarf")),
                pile_token("tok_pile", "grp_enc", &["card_dragon", "card_dwarf"]),
            ],
        ))
        .unwrap();

        // 会话需要有目录，save_session 会建
        std::fs::create_dir_all(p.session_dir("sess_1")).unwrap();
        p.save_session(&session("sess_1", "第一夜", Some("grp_enc")))
            .unwrap();

        p.upsert_relation(&rel("rel_1", "card_dwarf", "card_dragon", "敌对"))
            .unwrap();
        p.upsert_relation(&rel("rel_2", "card_dragon", "card_dwarf", "焚毁"))
            .unwrap();
        p.save_card_group(&group("grp_enc", "遭遇堆", &["card_dragon", "card_dwarf"]))
            .unwrap();
        (p, dir)
    }

    #[test]
    fn scan_finds_every_reference_site() {
        let (p, dir) = wired();
        let hits = p.scan_card_refs("card_dragon").unwrap();
        let kinds: Vec<RefKind> = hits.iter().map(|h| h.kind).collect();
        assert!(kinds.contains(&RefKind::BoardToken), "棋盘棋子未扫到");
        assert!(kinds.contains(&RefKind::BoardPile), "棋盘卡盒未扫到");
        assert!(kinds.contains(&RefKind::Relation), "关系未扫到");
        assert!(kinds.contains(&RefKind::CardGroup), "卡组未扫到");
        // 两侧关系都要报：一条它指向别人，一条别人指向它
        assert_eq!(
            kinds.iter().filter(|k| **k == RefKind::Relation).count(),
            2,
            "关系只扫了一侧"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn batch_scan_matches_individual_scans() {
        let (p, dir) = wired();
        let ids = vec!["card_dragon".to_string(), "card_dwarf".to_string()];

        let batch = p.scan_card_refs_batch(&ids).unwrap();
        let mut individual = p.scan_card_refs("card_dragon").unwrap();
        individual.extend(p.scan_card_refs("card_dwarf").unwrap());

        // 两条路径必须给出同一份答案，否则 UI 上会出现「批量删没提示、单张删有提示」
        assert_eq!(batch.len(), individual.len());
        let mut a: Vec<String> = batch.iter().map(|h| h.label.clone()).collect();
        let mut b: Vec<String> = individual.iter().map(|h| h.label.clone()).collect();
        a.sort();
        b.sort();
        assert_eq!(a, b);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn scan_ignores_unrelated_card() {
        let (p, dir) = wired();
        let hits = p.scan_card_refs("card_nobody").unwrap();
        assert!(hits.is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn remove_clears_every_reference() {
        let (p, dir) = wired();
        p.purge_card_refs("card_dragon", "红龙", ClearMode::Remove)
            .unwrap();

        // 棋子消失，但卡盒本体保留（它不只是这张卡的容器）
        let b = p.load_boards().unwrap().remove(0);
        assert_eq!(b.tokens.len(), 2, "应剩矮人棋子与卡盒");
        assert!(b
            .tokens
            .iter()
            .all(|t| t.card_id.as_deref() != Some("card_dragon")));
        let pile = b.tokens.iter().find_map(|t| t.pile.as_ref()).unwrap();
        assert_eq!(pile.remaining, vec!["card_dwarf".to_string()]);
        assert_eq!(pile.total, 1, "卡盒 total 应跟着牌堆降");

        // 关系两侧都清了
        assert!(p.list_all_relations().unwrap().is_empty(), "关系没清干净");

        // 卡组不再含它
        let g = p.load_card_groups().unwrap().remove(0);
        assert_eq!(g.card_ids, vec!["card_dwarf".to_string()]);

        let hits = p.scan_card_refs("card_dragon").unwrap();
        assert!(hits.is_empty(), "清理后仍有残留引用");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn remove_keeps_pile_but_drops_that_card() {
        let (p, dir) = proj("pile");
        p.save_card(&card("card_a", "A", "t")).unwrap();
        p.save_card(&card("card_b", "B", "t")).unwrap();
        p.save_board(&board(
            "b1",
            "棋盘",
            vec![pile_token("tok_pile", "g1", &["card_a", "card_b"])],
        ))
        .unwrap();

        p.purge_card_refs("card_a", "A", ClearMode::Remove).unwrap();

        let b = p.load_boards().unwrap().remove(0);
        let pile = b.tokens[0].pile.as_ref().expect("卡盒本体应保留");
        assert_eq!(pile.remaining, vec!["card_b".to_string()]);
        assert_eq!(pile.initial, vec!["card_b".to_string()]);
        assert_eq!(pile.total, 1, "total 必须跟着 initial 走");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn detach_keeps_token_with_a_memory_of_the_name() {
        let (p, dir) = wired();
        p.purge_card_refs("card_dragon", "红龙", ClearMode::Detach)
            .unwrap();

        let b = p.load_boards().unwrap().remove(0);
        let t = b
            .tokens
            .iter()
            .find(|t| t.id == "tok_dragon")
            .expect("detach 应保留棋子");
        assert_eq!(t.card_id, None, "detach 后不应还指向卡");
        assert_eq!(t.name_override.as_deref(), Some("红龙（已删除）"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn deleting_card_group_unbinds_the_party_session() {
        let (p, dir) = proj("grp");
        p.save_board(&board(
            "b1",
            "棋盘",
            vec![
                pile_token("tok_pile", "g1", &["x"]),
                token("tok_plain", Some("card_x")),
            ],
        ))
        .unwrap();
        std::fs::create_dir_all(p.session_dir("s1")).unwrap();
        p.save_session(&session("s1", "夜", Some("g1"))).unwrap();

        let hits = p.scan_card_group_refs("g1").unwrap();
        assert_eq!(hits.len(), 2, "棋盘上一个卡盒，会话拿它当队伍");
        assert!(hits.iter().any(|h| h.kind == RefKind::SessionParty));

        p.purge_card_group_refs("g1").unwrap();

        let b = p.load_boards().unwrap().remove(0);
        assert_eq!(b.tokens.len(), 1, "只剩普通棋子");
        let s = p.load_sessions().unwrap().remove(0);
        assert!(s.group_id.is_none(), "会话应解绑队伍，而不是留个指向空卡组的 id");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn board_has_no_referrers_after_decoupling() {
        // 会话不再绑定棋盘，删棋盘不需要解绑任何东西。
        // 这条用例锁住的是「棋盘可以随便删」这个结论。
        let (p, dir) = proj("brd");
        std::fs::create_dir_all(p.session_dir("s1")).unwrap();
        p.save_session(&session("s1", "夜", Some("g1"))).unwrap();

        assert!(p.scan_board_refs("b1").unwrap().is_empty());
        assert_eq!(p.purge_board_refs("b1").unwrap(), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn dangling_scan_reports_orphans_from_old_projects() {
        let (p, dir) = proj("dangling");
        // 卡根本不存在，但棋盘/卡组/关系都在引用它
        p.save_board(&board("b1", "棋盘", vec![token("t1", Some("card_gone"))]))
            .unwrap();
        p.save_card_group(&group("g1", "组", &["card_gone"])).unwrap();
        p.upsert_relation(&rel("r1", "card_gone", "card_also_gone", "敌对"))
            .unwrap();

        let hits = p.scan_dangling_refs().unwrap();
        let kinds: Vec<RefKind> = hits.iter().map(|h| h.kind).collect();
        assert!(kinds.contains(&RefKind::BoardToken));
        assert!(kinds.contains(&RefKind::CardGroup));
        // 关系两头都不存在，报两条
        assert_eq!(
            kinds.iter().filter(|k| **k == RefKind::Relation).count(),
            2
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn purge_dangling_refs_leaves_nothing_behind() {
        let (p, dir) = wired();
        // 手工造一批悬空引用：卡根本没建，但各处都在引用它
        let mut b = p.load_boards().unwrap().remove(0);
        b.tokens.push(token("tok_ghost", Some("card_ghost")));
        b.tokens
            .push(pile_token("tok_ghost_pile", "g9", &["card_ghost", "card_dwarf"]));
        p.save_board(&b).unwrap();

        p.upsert_relation(&rel("rel_ghost", "card_ghost", "card_dwarf", "缠绕"))
            .unwrap();
        p.save_card_group(&group("g2", "幽灵组", &["card_ghost"])).unwrap();

        let before = p.scan_dangling_refs().unwrap().len();
        assert!(before >= 5, "悬空引用太少，测试没造出来：{before}");

        let n = p.purge_dangling_refs().unwrap();
        assert!(n > 0);
        assert_eq!(
            p.scan_dangling_refs().unwrap().len(),
            0,
            "清理后仍有悬空引用"
        );

        // 活着的卡不能被误伤
        assert!(p.scan_card_refs("card_dwarf").unwrap().len() > 0);
        let b2 = p.load_boards().unwrap().remove(0);
        assert!(b2.tokens.iter().any(|t| t.id == "tok_dwarf"));

        // 原本那个卡盒里两张卡都活着，一个都不能少
        let pile = b2
            .tokens
            .iter()
            .find(|t| t.id == "tok_pile")
            .and_then(|t| t.pile.as_ref())
            .unwrap();
        assert_eq!(
            pile.remaining,
            vec!["card_dragon".to_string(), "card_dwarf".to_string()]
        );
        assert_eq!(pile.total, 2);

        // ghost 卡盒本体保留，但幽灵卡被摘掉，total 跟着降
        let ghost = b2
            .tokens
            .iter()
            .find(|t| t.id == "tok_ghost_pile")
            .and_then(|t| t.pile.as_ref())
            .unwrap();
        assert_eq!(ghost.remaining, vec!["card_dwarf".to_string()]);
        assert_eq!(ghost.total, 1);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn clean_project_has_no_dangling_refs() {
        let (p, dir) = wired();
        assert!(p.scan_dangling_refs().unwrap().is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
