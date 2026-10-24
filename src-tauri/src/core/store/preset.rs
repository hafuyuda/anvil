use super::pack::{merge_asset_dir, read_json_or_default, MergeResult};
use super::project::Project;
use crate::core::model::board::{Board, PileData};
use crate::core::model::card::Card;
use crate::core::model::card_group::CardGroup;
use crate::core::model::card_type::CardType;
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
use crate::core::model::scenario::Scenario;
use crate::core::model::session::Session;
use serde::Serialize;
use std::collections::{BTreeMap, HashSet};
use std::io::Read;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct PresetInfo {
    pub id: String,
    pub label: String,
    pub description: String,
}

pub struct PresetDef {
    pub id: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub bytes: &'static [u8],
}

// 内置预设由 `build.rs` 从 `src-tauri/presets/<id>/` 目录压缩生成，
// 注册为 `PRESETS`（见 `OUT_DIR/preset_bundles.rs`）。
// 这样预设以可版本化的 0.4 项目目录形式维护，无需手写二进制 ZIP。
include!(concat!(env!("OUT_DIR"), "/preset_bundles.rs"));

pub fn list_presets() -> Vec<PresetInfo> {
    PRESETS
        .iter()
        .map(|p| PresetInfo {
            id: p.id.to_string(),
            label: p.label.to_string(),
            description: p.description.to_string(),
        })
        .collect()
}

impl Project {
    /// 把一个内置预设作为副本导入到当前项目。
    /// - 类型按名字复用；内容实体全部重新生成 uuid
    /// - 名字冲突加 " (2)" / " (3)"
    /// - 不要求空项目
    pub fn add_preset(&self, preset_id: &str) -> anyhow::Result<MergeResult> {
        let def = PRESETS
            .iter()
            .find(|p| p.id == preset_id)
            .ok_or_else(|| anyhow::anyhow!("预设不存在: {preset_id}"))?;

        let temp = std::env::temp_dir().join(format!("anvil_preset_{}", uuid::Uuid::new_v4()));
        extract_bytes_to_temp(def.bytes, &temp)?;

        let result = self.import_preset_from(&temp);

        let _ = std::fs::remove_dir_all(&temp);
        result
    }

    fn import_preset_from(&self, temp: &Path) -> anyhow::Result<MergeResult> {
        let now = crate::core::util::now_ms();

        // ── 0. 版本门禁：0.4 硬切 ──
        let manifest: crate::core::model::manifest::Manifest =
            serde_json::from_slice(&std::fs::read(temp.join("manifest.json"))
                .map_err(|_| anyhow::anyhow!("包缺少 manifest.json"))?)?;
        crate::core::store::pack::ensure_pack_schema(&manifest.schema_version)?;

        // ── 1. 读源包类型（旧包先跑 JSON 迁移） ──
        let remote_types = crate::core::model::card_type::read_card_types_migrated(
            &temp.join("types").join("card_types.json"),
        )?;
        let remote_kinds: Vec<RelationKind> =
            read_json_or_default(&temp.join("types").join("relation_kinds.json"))?;

        // ── 2. 卡牌类型映射：按名字匹配，同名复用 ──
        let mut local_types = self.load_card_types()?;
        let mut type_id_map: BTreeMap<String, String> = BTreeMap::new();
        let mut new_types: Vec<CardType> = Vec::new();

        for rt in &remote_types {
            if let Some(existing) = local_types.iter().find(|t| t.name == rt.name) {
                type_id_map.insert(rt.id.clone(), existing.id.clone());
            } else {
                let mut copy = rt.clone();
                let new_id = uuid::Uuid::new_v4().to_string();
                copy.id = new_id.clone();
                copy.created_at = now;
                copy.updated_at = now;
                type_id_map.insert(rt.id.clone(), new_id);
                new_types.push(copy);
            }
        }
        let imported_type_count = new_types.len();
        local_types.extend(new_types);
        self.save_card_types(&local_types)?;

        // 关系类型同理
        let mut local_kinds = self.load_relation_kinds()?;
        let mut kind_id_map: BTreeMap<String, String> = BTreeMap::new();
        let mut new_kinds: Vec<RelationKind> = Vec::new();

        for rk in &remote_kinds {
            if let Some(existing) = local_kinds.iter().find(|k| k.name == rk.name) {
                kind_id_map.insert(rk.id.clone(), existing.id.clone());
            } else {
                let mut copy = rk.clone();
                let new_id = uuid::Uuid::new_v4().to_string();
                copy.id = new_id.clone();
                copy.created_at = now;
                copy.updated_at = now;
                kind_id_map.insert(rk.id.clone(), new_id);
                new_kinds.push(copy);
            }
        }
        local_kinds.extend(new_kinds);
        self.save_relation_kinds(&local_kinds)?;

        // ── 3. 导入卡片（全部新 id，名字去重） ──
        let mut existing_card_names: HashSet<String> =
            self.load_all_cards()?.into_iter().map(|c| c.name).collect();
        let mut card_id_map: BTreeMap<String, String> = BTreeMap::new();
        let mut imported_cards = 0usize;

        let cards_dir = temp.join("cards");
        if cards_dir.exists() {
            for prefix in std::fs::read_dir(&cards_dir)? {
                let prefix = prefix?;
                if !prefix.file_type()?.is_dir() {
                    continue;
                }
                for entry in std::fs::read_dir(prefix.path())? {
                    let entry = entry?;
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) != Some("json") {
                        continue;
                    }
                    let bytes = std::fs::read(&p)?;
                    let mut card: Card = match serde_json::from_slice(&bytes) {
                        Ok(c) => c,
                        Err(_) => continue,
                    };

                    let new_type_id = match type_id_map.get(&card.type_id) {
                        Some(id) => id.clone(),
                        None => continue,
                    };
                    card.type_id = new_type_id;

                    let old_id = card.id.clone();
                    let new_id = uuid::Uuid::new_v4().to_string();
                    card.id = new_id.clone();
                    card_id_map.insert(old_id, new_id);

                    card.name = unique_name(&existing_card_names, &card.name);
                    existing_card_names.insert(card.name.clone());

                    card.created_at = now;
                    card.updated_at = now;

                    self.save_card(&card)?;
                    imported_cards += 1;
                }
            }
        }

        // ── 4. 导入关系 ──
        let mut imported_relations = 0usize;
        let rels_dir = temp.join("relations").join("from");
        if rels_dir.exists() {
            for entry in std::fs::read_dir(&rels_dir)? {
                let entry = entry?;
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("jsonl") {
                    continue;
                }
                let text = std::fs::read_to_string(&p)?;
                for line in text.lines() {
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }
                    let mut rel: Relation = match serde_json::from_str(line) {
                        Ok(r) => r,
                        Err(_) => continue,
                    };

                    let new_from = match card_id_map.get(&rel.from) {
                        Some(id) => id.clone(),
                        None => continue,
                    };
                    let new_to = match card_id_map.get(&rel.to) {
                        Some(id) => id.clone(),
                        None => continue,
                    };
                    let new_kind = match kind_id_map.get(&rel.kind) {
                        Some(id) => id.clone(),
                        None => continue,
                    };

                    rel.id = uuid::Uuid::new_v4().to_string();
                    rel.from = new_from;
                    rel.to = new_to;
                    rel.kind = new_kind;
                    rel.created_at = now;

                    self.upsert_relation(&rel)?;
                    imported_relations += 1;
                }
            }
        }

        // ── 5. 导入场景（目录：scenarios/<id>/scenario.json + *.md） ──
        let mut imported_scenarios = 0usize;
        let mut existing_scenario_names: HashSet<String> =
            self.load_scenarios()?.into_iter().map(|s| s.name).collect();
        let mut scenario_id_map: BTreeMap<String, String> = BTreeMap::new();

        let scen_dir = temp.join("scenarios");
        if scen_dir.exists() {
            for entry in std::fs::read_dir(&scen_dir)? {
                let entry = entry?;
                if !entry.file_type()?.is_dir() {
                    continue;
                }
                let meta_path = entry.path().join("scenario.json");
                if !meta_path.exists() {
                    continue;
                }
                let bytes = std::fs::read(&meta_path)?;
                let mut scenario: Scenario = match serde_json::from_slice(&bytes) {
                    Ok(s) => s,
                    Err(_) => continue,
                };

                let old_id = scenario.id.clone();
                let new_id = uuid::Uuid::new_v4().to_string();
                scenario.id = new_id.clone();
                scenario_id_map.insert(old_id, new_id);

                scenario.name = unique_name(&existing_scenario_names, &scenario.name);
                existing_scenario_names.insert(scenario.name.clone());

                scenario.created_at = now;
                scenario.updated_at = now;

                self.save_scenario(&scenario)?;

                // 剧本文件整体复制
                for md in std::fs::read_dir(entry.path())? {
                    let p = md?.path();
                    if p.extension().and_then(|s| s.to_str()) != Some("md") {
                        continue;
                    }
                    let Some(filename) = p.file_name().and_then(|s| s.to_str()) else {
                        continue;
                    };
                    let content = std::fs::read_to_string(&p)?;
                    self.save_script(&scenario.id, filename, &content)?;
                }

                imported_scenarios += 1;
            }
        }

        // ── 6. 导入卡组（先于棋盘，供 pile.group_id 映射） ──
        let mut imported_card_groups = 0usize;
        let mut existing_group_names: HashSet<String> = self
            .load_card_groups()?
            .into_iter()
            .map(|g| g.name)
            .collect();
        let mut group_id_map: BTreeMap<String, String> = BTreeMap::new();

        let cg_dir = temp.join("card_groups");
        if cg_dir.exists() {
            for entry in std::fs::read_dir(&cg_dir)? {
                let entry = entry?;
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }
                let bytes = std::fs::read(&p)?;
                let mut group: CardGroup = match serde_json::from_slice(&bytes) {
                    Ok(g) => g,
                    Err(_) => continue,
                };

                let old_id = group.id.clone();
                let new_id = uuid::Uuid::new_v4().to_string();
                group.id = new_id.clone();
                group_id_map.insert(old_id, new_id);

                group.card_ids = group
                    .card_ids
                    .iter()
                    .filter_map(|id| card_id_map.get(id).cloned())
                    .collect();

                if group.card_ids.is_empty() {
                    continue;
                }

                group.name = unique_name(&existing_group_names, &group.name);
                existing_group_names.insert(group.name.clone());

                group.created_at = now;
                group.updated_at = now;

                self.save_card_group(&group)?;
                imported_card_groups += 1;
            }
        }

        // ── 7. 导入棋盘（收集 board_id_map，供会话引用） ──
        let mut imported_boards = 0usize;
        let mut existing_board_names: HashSet<String> =
            self.load_boards()?.into_iter().map(|b| b.name).collect();
        let mut board_id_map: BTreeMap<String, String> = BTreeMap::new(); // ← 新增

        let board_dir = temp.join("boards");
        if board_dir.exists() {
            for entry in std::fs::read_dir(&board_dir)? {
                let entry = entry?;
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }
                let bytes = std::fs::read(&p)?;
                let mut board: Board = match serde_json::from_slice(&bytes) {
                    Ok(b) => b,
                    Err(_) => continue,
                };

                let old_id = board.id.clone(); // ← 新增
                let new_id = uuid::Uuid::new_v4().to_string();
                board.id = new_id.clone(); // ← 改动（原来是直接赋 uuid）
                board_id_map.insert(old_id, new_id); // ← 新增

                board.tokens = board
                    .tokens
                    .into_iter()
                    .filter_map(|mut t| {
                        if let Some(cid) = &t.card_id {
                            match card_id_map.get(cid) {
                                Some(new_id) => t.card_id = Some(new_id.clone()),
                                None => return None,
                            }
                        }
                        t.id = uuid::Uuid::new_v4().to_string();
                        // pile.group_id / remaining / initial 映射到新卡组 & 新卡
                        if let Some(pile) = &mut t.pile {
                            map_pile(pile, &card_id_map, &group_id_map);
                        }
                        Some(t)
                    })
                    .collect();

                board.name = unique_name(&existing_board_names, &board.name);
                existing_board_names.insert(board.name.clone());

                board.created_at = now;
                board.updated_at = now;

                self.save_board(&board)?;
                imported_boards += 1;
            }
        }

        // ── 8. 导入会话（board_id 走映射） ──
        let mut imported_sessions = 0usize;
        let mut existing_session_names: HashSet<String> =
            self.load_sessions()?.into_iter().map(|s| s.name).collect();

        let sess_dir = temp.join("sessions");
        if sess_dir.exists() {
            for entry in std::fs::read_dir(&sess_dir)? {
                let entry = entry?;
                if !entry.file_type()?.is_dir() {
                    continue;
                }
                let sp = entry.path().join("session.json");
                if !sp.exists() {
                    continue;
                }
                let bytes = std::fs::read(&sp)?;
                let mut session: Session = match serde_json::from_slice(&bytes) {
                    Ok(s) => s,
                    Err(_) => continue,
                };

                session.id = uuid::Uuid::new_v4().to_string();
                // 会话不再绑定棋盘、也不再持有棋子。它引用卡组的唯一途径是
                // group_id，按 group_id_map 映射；映射不到就置空。
                session.group_id = session
                    .group_id
                    .as_ref()
                    .and_then(|id| group_id_map.get(id).cloned());

                session.name = unique_name(&existing_session_names, &session.name);
                existing_session_names.insert(session.name.clone());

                session.created_at = now;
                session.updated_at = now;

                self.save_session(&session)?;

                let ev_path = entry.path().join("events.jsonl");
                if ev_path.exists() {
                    let text = std::fs::read_to_string(&ev_path)?;
                    for line in text.lines() {
                        let line = line.trim();
                        if line.is_empty() {
                            continue;
                        }
                        if let Ok(mut ev) =
                            serde_json::from_str::<crate::core::model::session::Event>(line)
                        {
                            ev.seq = 0;
                            let _ = self.append_event(&session.id, ev);
                        }
                    }
                }

                imported_sessions += 1;
            }
        }

        // ── 9. 导入资源（图片 + 音频） ──
        let imported_assets = merge_asset_dir(
            &temp.join("assets").join("images"),
            &self.images_dir(),
            &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
        )?;

        let imported_audios = merge_asset_dir(
            &temp.join("assets").join("audio"),
            &self.root.join("assets").join("audio"),
            &["mp3", "ogg", "wav", "m4a"],
        )?;

        self.rebuild_index()?;

        Ok(MergeResult {
            imported_types: imported_type_count,
            imported_cards,
            imported_relations,
            imported_scenarios,
            imported_boards,
            imported_sessions,
            imported_card_groups,
            imported_assets,
            imported_audios,
            skipped_types: Vec::new(),
        })
    }
}

/// 名字去重：已存在则追加 " (2)" / " (3)" …
fn unique_name(existing: &HashSet<String>, base: &str) -> String {
    if !existing.contains(base) {
        return base.to_string();
    }
    let mut i = 2;
    loop {
        let candidate = format!("{} ({})", base, i);
        if !existing.contains(&candidate) {
            return candidate;
        }
        i += 1;
    }
}

/// 卡盒 pile 内的卡 id / 卡组 id 映射到新项目。
/// group_id 未映射到时置空字符串（保留结构，退化为无来源卡盒）。
fn map_pile(
    pile: &mut PileData,
    card_id_map: &BTreeMap<String, String>,
    group_id_map: &BTreeMap<String, String>,
) {
    pile.group_id = group_id_map
        .get(&pile.group_id)
        .cloned()
        .unwrap_or_default();
    pile.remaining = pile
        .remaining
        .iter()
        .filter_map(|id| card_id_map.get(id).cloned())
        .collect();
    pile.initial = pile
        .initial
        .iter()
        .filter_map(|id| card_id_map.get(id).cloned())
        .collect();
    pile.total = pile.initial.len();
}

fn extract_bytes_to_temp(bytes: &[u8], dest: &Path) -> anyhow::Result<()> {
    let reader = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader)?;
    std::fs::create_dir_all(dest)?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let name = entry.name().to_string();
        if name.contains("..") || name.starts_with('/') || name.starts_with('\\') {
            continue;
        }
        let out = dest.join(&name);
        if entry.is_dir() {
            std::fs::create_dir_all(&out)?;
            continue;
        }
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut buf = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut buf)?;
        std::fs::write(&out, &buf)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 守卫：预设注册表为空时，下面的循环不会执行，测试会「平凡通过」。
    /// 这里显式锁定数量与 id，防止 build.rs 打包失败后无人察觉。
    #[test]
    fn builtin_presets_are_registered() {
        let ids: Vec<&str> = PRESETS.iter().map(|p| p.id).collect();
        let mut sorted = ids.clone();
        sorted.sort_unstable();
        assert_eq!(sorted, vec!["tcg", "ttrpg", "vn", "world"], "内置预设清单变了，请同步更新文档与断言");
        for def in PRESETS {
            assert!(!def.label.is_empty(), "预设 {} 缺 label", def.id);
            assert!(!def.description.is_empty(), "预设 {} 缺 description", def.id);
            assert!(!def.bytes.is_empty(), "预设 {} 的 zip 字节为空", def.id);
        }
    }

    #[test]
    fn builtin_presets_import_cleanly() {
        assert!(!PRESETS.is_empty(), "没有内置预设，导入测试无意义");
        for def in PRESETS {
            let dir = std::env::temp_dir().join(format!(
                "anvil_preset_test_{}",
                uuid::Uuid::new_v4()
            ));
            std::fs::create_dir_all(&dir).unwrap();
            let project = Project::open(&dir).expect("临时项目应可打开");
            let r = project
                .add_preset(def.id)
                .unwrap_or_else(|e| panic!("预设 {} 导入失败: {e}", def.id));

            assert!(r.imported_types > 0, "预设 {} 未导入任何卡类型", def.id);
            assert!(r.imported_cards > 0, "预设 {} 未导入任何卡", def.id);

            match def.id {
                "ttrpg" => {
                    assert!(r.imported_boards > 0, "ttrpg 应有棋盘");
                    assert!(r.imported_sessions > 0, "ttrpg 应有会话");
                }
                "vn" => {
                    assert!(r.imported_scenarios > 0, "vn 应有剧情");
                }
                "tcg" => {
                    assert!(r.imported_card_groups > 0, "tcg 应有卡组");
                }
                "world" => {
                    assert!(r.imported_relations > 0, "world 应有关系");
                }
                _ => {}
            }
            let _ = std::fs::remove_dir_all(&dir);
        }
    }
}
