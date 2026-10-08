use super::project::Project;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct PackInspection {
    pub manifest: crate::core::model::manifest::Manifest,
    pub card_types: Vec<InspectType>,
    pub relation_kinds: Vec<crate::core::model::relation_kind::RelationKind>,
    pub scenarios: Vec<InspectNamed>,
    pub boards: Vec<InspectNamed>,
    pub sessions: Vec<InspectNamed>,
    pub card_groups: Vec<InspectNamed>,
    pub total_cards: usize,
    pub total_relations: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectType {
    #[serde(flatten)]
    pub card_type: crate::core::model::card_type::CardType,
    pub card_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectNamed {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MergeOptions {
    #[serde(default)]
    pub types_only: bool,
    #[serde(default)]
    pub card_type_map: BTreeMap<String, TypeMapAction>,
    #[serde(default)]
    pub relation_kind_map: BTreeMap<String, TypeMapAction>,
    #[serde(default)]
    pub include_scenarios: Vec<String>,
    #[serde(default)]
    pub include_boards: Vec<String>,
    #[serde(default)]
    pub include_sessions: Vec<String>,
    #[serde(default)]
    pub include_card_groups: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum TypeMapAction {
    Existing { target_id: String },
    New,
    Skip,
}

#[derive(Debug, Clone, Serialize)]
pub struct MergeResult {
    pub imported_types: usize,
    pub imported_cards: usize,
    pub imported_relations: usize,
    pub imported_scenarios: usize,
    pub imported_boards: usize,
    pub imported_sessions: usize,
    pub imported_card_groups: usize,
    pub imported_assets: usize,
    pub skipped_types: Vec<String>,
}

impl Project {
    pub fn export_pack(&self, output_path: &Path) -> anyhow::Result<()> {
        // 确保 manifest 最新
        let mut manifest = self.load_manifest()?;
        manifest.updated_at = crate::core::util::now_ms();
        self.save_manifest(&manifest)?;

        let file = std::fs::File::create(output_path)?;
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o644);

        let allowed = [
            "manifest.json",
            "types",
            "cards",
            "relations",
            "boards",
            "scenarios",
            "sessions",
            "card_groups",
            "assets",
        ];

        let walker = walkdir::WalkDir::new(&self.root)
            .min_depth(1)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                if name.starts_with('.') {
                    return false;
                }
                if name == "node_modules" || name == "target" {
                    return false;
                }
                true
            });

        for entry in walker.filter_map(|e| e.ok()) {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            let rel = path.strip_prefix(&self.root)?;
            let rel_str = rel.to_string_lossy().replace('\\', "/");

            let first = rel_str.split('/').next().unwrap_or("");
            if !allowed.contains(&first) {
                continue;
            }

            zip.start_file(&rel_str, options)?;
            let content = std::fs::read(path)?;
            zip.write_all(&content)?;
        }

        zip.finish()?;
        Ok(())
    }

    pub fn import_pack_to(src: &Path, dest: &Path) -> anyhow::Result<()> {
        let file = std::fs::File::open(src)?;
        let mut archive = zip::ZipArchive::new(file)?;

        std::fs::create_dir_all(dest)?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            let name = entry.name().to_string();

            if name.contains("..") || name.starts_with('/') {
                continue;
            }

            let out_path = dest.join(&name);

            if entry.is_dir() {
                std::fs::create_dir_all(&out_path)?;
                continue;
            }

            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let mut out_file = std::fs::File::create(&out_path)?;
            std::io::copy(&mut entry, &mut out_file)?;
        }

        Ok(())
    }

    pub fn merge_pack(&self, src: &Path, options: &MergeOptions) -> anyhow::Result<MergeResult> {
        let temp = extract_to_temp(src)?;
        let result = self.merge_pack_from(&temp, options);
        let _ = std::fs::remove_dir_all(&temp);
        result
    }

    fn merge_pack_from(&self, temp: &Path, options: &MergeOptions) -> anyhow::Result<MergeResult> {
        let now = crate::core::util::now_ms();

        // ── 1. 读对方的类型定义 ──
        let remote_types: Vec<crate::core::model::card_type::CardType> =
            read_json_or_default(&temp.join("types").join("card_types.json"))?;
        let remote_kinds: Vec<crate::core::model::relation_kind::RelationKind> =
            read_json_or_default(&temp.join("types").join("relation_kinds.json"))?;

        // ── 2. 卡牌类型映射 ──
        let mut type_id_map: BTreeMap<String, Option<String>> = BTreeMap::new();
        let mut skipped_type_names: Vec<String> = Vec::new();
        let mut new_types: Vec<crate::core::model::card_type::CardType> = Vec::new();
        let mut imported_types = 0usize;

        let mut local_types = self.load_card_types()?;

        for rt in &remote_types {
            let action = options
                .card_type_map
                .get(&rt.id)
                .cloned()
                .unwrap_or(TypeMapAction::New);

            match action {
                TypeMapAction::Skip => {
                    type_id_map.insert(rt.id.clone(), None);
                    skipped_type_names.push(rt.name.clone());
                }
                TypeMapAction::Existing { target_id } => {
                    type_id_map.insert(rt.id.clone(), Some(target_id.clone()));
                    // 合并对方独有字段到本项目类型
                    if let Some(local) = local_types.iter_mut().find(|t| t.id == target_id) {
                        for rf in &rt.fields {
                            if !local.fields.iter().any(|f| f.key == rf.key) {
                                local.fields.push(rf.clone());
                            }
                        }
                        // 本地没卡背时，用对方的
                        if local.card_back.is_none() {
                            local.card_back = rt.card_back.clone();
                        }
                        // 裁剪 / 出框：仅当双方都有 card_frame 时逐项合并
                        // 本地 card_frame 为空时不动——避免塞入部分配置破坏启发式映射
                        if let (Some(local_cfg), Some(remote_cfg)) =
                            (local.card_frame.as_mut(), rt.card_frame.as_ref())
                        {
                            if local_cfg.image_crop.is_none() {
                                local_cfg.image_crop = remote_cfg.image_crop.clone();
                            }
                            if local_cfg.image_extend.is_none() {
                                local_cfg.image_extend = remote_cfg.image_extend.clone();
                            }
                        }
                    }
                    imported_types += 1;
                }

                TypeMapAction::New => {
                    let mut copy = rt.clone();
                    let new_id = uuid::Uuid::new_v4().to_string();
                    copy.id = new_id.clone();
                    copy.created_at = now;
                    copy.updated_at = now;
                    type_id_map.insert(rt.id.clone(), Some(new_id));
                    new_types.push(copy);
                    imported_types += 1;
                }
            }
        }

        local_types.extend(new_types);
        self.save_card_types(&local_types)?;

        // ── 3. 关系类型映射 ──
        let mut kind_id_map: BTreeMap<String, Option<String>> = BTreeMap::new();
        let mut new_kinds: Vec<crate::core::model::relation_kind::RelationKind> = Vec::new();
        let mut local_kinds = self.load_relation_kinds()?;

        for rk in &remote_kinds {
            let action = options
                .relation_kind_map
                .get(&rk.id)
                .cloned()
                .unwrap_or(TypeMapAction::New);

            match action {
                TypeMapAction::Skip => {
                    kind_id_map.insert(rk.id.clone(), None);
                }
                TypeMapAction::Existing { target_id } => {
                    kind_id_map.insert(rk.id.clone(), Some(target_id.clone()));
                }
                TypeMapAction::New => {
                    let mut copy = rk.clone();
                    let new_id = uuid::Uuid::new_v4().to_string();
                    copy.id = new_id.clone();
                    copy.created_at = now;
                    copy.updated_at = now;
                    kind_id_map.insert(rk.id.clone(), Some(new_id));
                    new_kinds.push(copy);
                }
            }
        }

        local_kinds.extend(new_kinds);
        self.save_relation_kinds(&local_kinds)?;

        // ── 4. types_only 模式 ──
        if options.types_only {
            return Ok(MergeResult {
                imported_types,
                imported_cards: 0,
                imported_relations: 0,
                imported_scenarios: 0,
                imported_boards: 0,
                imported_sessions: 0,
                imported_card_groups: 0,
                imported_assets: 0,
                skipped_types: skipped_type_names,
            });
        }

        // ── 5. 导入卡片 ──
        let mut imported_cards = 0usize;
        let mut imported_card_ids: std::collections::HashSet<String> =
            std::collections::HashSet::new();

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
                    let mut card: crate::core::model::card::Card =
                        match serde_json::from_slice(&bytes) {
                            Ok(c) => c,
                            Err(_) => continue,
                        };

                    // type 映射
                    let mapped = type_id_map.get(&card.type_id);
                    match mapped {
                        Some(Some(new_type_id)) => {
                            card.type_id = new_type_id.clone();
                        }
                        _ => continue, // Skip 或未映射
                    }

                    // 已存在则跳过
                    if self.load_card(&card.id).is_ok() {
                        continue;
                    }

                    self.save_card(&card)?;
                    imported_card_ids.insert(card.id.clone());
                    imported_cards += 1;
                }
            }
        }

        // ── 6. 导入关系 ──
        let mut imported_relations = 0usize;
        let existing_rel_ids: std::collections::HashSet<String> = self
            .list_all_relations()?
            .into_iter()
            .map(|r| r.id)
            .collect();

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
                    let mut rel: crate::core::model::relation::Relation =
                        match serde_json::from_str(line) {
                            Ok(r) => r,
                            Err(_) => continue,
                        };

                    if !imported_card_ids.contains(&rel.from)
                        || !imported_card_ids.contains(&rel.to)
                    {
                        continue;
                    }

                    match kind_id_map.get(&rel.kind) {
                        Some(Some(new_kind)) => {
                            rel.kind = new_kind.clone();
                        }
                        Some(None) => continue, // Skip
                        None => {}              // 未映射，保留
                    }

                    if existing_rel_ids.contains(&rel.id) {
                        continue;
                    }

                    self.upsert_relation(&rel)?;
                    imported_relations += 1;
                }
            }
        }

        // ── 7. Scenario ──
        let mut imported_scenarios = 0usize;
        let scen_dir = temp.join("scenarios");
        if scen_dir.exists() {
            let existing_ids: std::collections::HashSet<String> =
                self.load_scenarios()?.into_iter().map(|s| s.id).collect();

            for entry in std::fs::read_dir(&scen_dir)? {
                let entry = entry?;
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }
                let bytes = std::fs::read(&p)?;
                let mut scenario: crate::core::model::scenario::Scenario =
                    match serde_json::from_slice(&bytes) {
                        Ok(s) => s,
                        Err(_) => continue,
                    };

                if !options.include_scenarios.is_empty()
                    && !options.include_scenarios.contains(&scenario.id)
                {
                    continue;
                }

                if existing_ids.contains(&scenario.id) {
                    continue;
                }

                // 过滤节点
                scenario
                    .node_ids
                    .retain(|id| imported_card_ids.contains(id));
                scenario
                    .node_positions
                    .retain(|k, _| imported_card_ids.contains(k));

                // edge_kinds 映射
                let mut new_edge_kinds = Vec::new();
                for k in &scenario.edge_kinds {
                    match kind_id_map.get(k) {
                        Some(Some(mapped)) => new_edge_kinds.push(mapped.clone()),
                        Some(None) => {}
                        None => new_edge_kinds.push(k.clone()),
                    }
                }
                scenario.edge_kinds = new_edge_kinds;

                // entry_node 不在节点里则改
                if let Some(en) = &scenario.entry_node {
                    if !scenario.node_ids.contains(en) {
                        scenario.entry_node = scenario.node_ids.first().cloned();
                    }
                }

                self.save_scenario(&scenario)?;
                imported_scenarios += 1;
            }
        }

        // ── 8. Board ──
        let mut imported_boards = 0usize;
        let board_dir = temp.join("boards");
        if board_dir.exists() {
            let existing_ids: std::collections::HashSet<String> =
                self.load_boards()?.into_iter().map(|b| b.id).collect();

            for entry in std::fs::read_dir(&board_dir)? {
                let entry = entry?;
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }
                let bytes = std::fs::read(&p)?;
                let board: crate::core::model::board::Board = match serde_json::from_slice(&bytes) {
                    Ok(b) => b,
                    Err(_) => continue,
                };

                if !options.include_boards.is_empty() && !options.include_boards.contains(&board.id)
                {
                    continue;
                }

                if existing_ids.contains(&board.id) {
                    continue;
                }

                self.save_board(&board)?;
                imported_boards += 1;
            }
        }

        // ── 9. Session + Events ──
        let mut imported_sessions = 0usize;
        let sess_dir = temp.join("sessions");
        if sess_dir.exists() {
            let existing_ids: std::collections::HashSet<String> =
                self.load_sessions()?.into_iter().map(|s| s.id).collect();

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
                let session: crate::core::model::session::Session =
                    match serde_json::from_slice(&bytes) {
                        Ok(s) => s,
                        Err(_) => continue,
                    };

                if !options.include_sessions.is_empty()
                    && !options.include_sessions.contains(&session.id)
                {
                    continue;
                }

                if existing_ids.contains(&session.id) {
                    continue;
                }

                self.save_session(&session)?;

                // 事件
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
                            ev.seq = 0; // 重新分配
                            let _ = self.append_event(&session.id, ev);
                        }
                    }
                }

                imported_sessions += 1;
            }
        }

        // ── 10. CardGroup ──
        let mut imported_card_groups = 0usize;
        let cg_dir = temp.join("card_groups");
        if cg_dir.exists() {
            let existing_ids: std::collections::HashSet<String> =
                self.load_card_groups()?.into_iter().map(|g| g.id).collect();

            for entry in std::fs::read_dir(&cg_dir)? {
                let entry = entry?;
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }
                let bytes = std::fs::read(&p)?;
                let mut group: crate::core::model::card_group::CardGroup =
                    match serde_json::from_slice(&bytes) {
                        Ok(g) => g,
                        Err(_) => continue,
                    };

                if !options.include_card_groups.is_empty()
                    && !options.include_card_groups.contains(&group.id)
                {
                    continue;
                }

                if existing_ids.contains(&group.id) {
                    continue;
                }

                // 过滤掉未导入的卡
                group.card_ids.retain(|id| imported_card_ids.contains(id));
                if group.card_ids.is_empty() {
                    continue;
                }

                self.save_card_group(&group)?;
                imported_card_groups += 1;
            }
        }

        // ── 11. Assets ──
        let mut imported_assets = 0usize;
        let remote_assets = temp.join("assets").join("images");
        if remote_assets.exists() {
            let local_assets = self.images_dir();
            std::fs::create_dir_all(&local_assets)?;
            for entry in std::fs::read_dir(&remote_assets)? {
                let entry = entry?;
                if !entry.file_type()?.is_file() {
                    continue;
                }
                let name = entry.file_name();
                let dest = local_assets.join(&name);
                if dest.exists() {
                    continue;
                }
                std::fs::copy(entry.path(), &dest)?;
                imported_assets += 1;
            }
        }

        Ok(MergeResult {
            imported_types,
            imported_cards,
            imported_relations,
            imported_scenarios,
            imported_boards,
            imported_sessions,
            imported_card_groups,
            imported_assets,
            skipped_types: skipped_type_names,
        })
    }
}

/// 解压到临时目录，返回临时目录路径。
fn extract_to_temp(src: &Path) -> anyhow::Result<std::path::PathBuf> {
    let temp = std::env::temp_dir().join(format!("anvil_pack_{}", uuid::Uuid::new_v4()));
    Project::import_pack_to(src, &temp)?;
    Ok(temp)
}

pub fn inspect_pack(src: &Path) -> anyhow::Result<PackInspection> {
    let temp = extract_to_temp(src)?;
    let result = inspect_pack_dir(&temp);
    let _ = std::fs::remove_dir_all(&temp);
    result
}

fn inspect_pack_dir(temp: &Path) -> anyhow::Result<PackInspection> {
    // manifest
    let manifest_path = temp.join("manifest.json");
    if !manifest_path.exists() {
        return Err(anyhow::anyhow!("包缺少 manifest.json"));
    }
    let manifest: crate::core::model::manifest::Manifest =
        serde_json::from_slice(&std::fs::read(&manifest_path)?)?;

    // card types
    let types_path = temp.join("types").join("card_types.json");
    let card_types: Vec<crate::core::model::card_type::CardType> = if types_path.exists() {
        serde_json::from_slice(&std::fs::read(&types_path)?)?
    } else {
        Vec::new()
    };

    // 统计每类型卡片数
    let mut type_count: BTreeMap<String, usize> = BTreeMap::new();
    let mut total_cards = 0usize;
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
                if let Ok(card) = serde_json::from_slice::<crate::core::model::card::Card>(&bytes) {
                    *type_count.entry(card.type_id).or_insert(0) += 1;
                    total_cards += 1;
                }
            }
        }
    }

    // relation kinds
    let rk_path = temp.join("types").join("relation_kinds.json");
    let relation_kinds: Vec<crate::core::model::relation_kind::RelationKind> = if rk_path.exists() {
        serde_json::from_slice(&std::fs::read(&rk_path)?)?
    } else {
        Vec::new()
    };

    // 总关系数
    let mut total_relations = 0usize;
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
                if !line.trim().is_empty() {
                    total_relations += 1;
                }
            }
        }
    }

    // scenarios / boards
    let scenarios = list_named_json(&temp.join("scenarios"))?;
    let boards = list_named_json(&temp.join("boards"))?;

    let card_groups = list_named_json(&temp.join("card_groups"))?;

    // sessions
    let mut sessions = Vec::new();
    let sessions_dir = temp.join("sessions");
    if sessions_dir.exists() {
        for entry in std::fs::read_dir(&sessions_dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            let sp = entry.path().join("session.json");
            if !sp.exists() {
                continue;
            }
            let bytes = std::fs::read(&sp)?;
            if let Ok(s) = serde_json::from_slice::<crate::core::model::session::Session>(&bytes) {
                sessions.push(InspectNamed {
                    id: s.id,
                    name: s.name,
                });
            }
        }
    }

    let inspect_types: Vec<InspectType> = card_types
        .into_iter()
        .map(|ct| {
            let count = type_count.get(&ct.id).copied().unwrap_or(0);
            InspectType {
                card_type: ct,
                card_count: count,
            }
        })
        .collect();

    Ok(PackInspection {
        manifest,
        card_types: inspect_types,
        relation_kinds,
        scenarios,
        boards,
        sessions,
        card_groups,
        total_cards,
        total_relations,
    })
}

fn list_named_json(dir: &Path) -> anyhow::Result<Vec<InspectNamed>> {
    let mut out = Vec::new();
    if !dir.exists() {
        return Ok(out);
    }
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if p.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let bytes = std::fs::read(&p)?;
        let v: serde_json::Value = serde_json::from_slice(&bytes)?;
        let id = v
            .get("id")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let name = v
            .get("name")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        out.push(InspectNamed { id, name });
    }
    Ok(out)
}

fn read_json_or_default<T: serde::de::DeserializeOwned + Default>(
    path: &Path,
) -> anyhow::Result<T> {
    if !path.exists() {
        return Ok(T::default());
    }
    let bytes = std::fs::read(path)?;
    Ok(serde_json::from_slice(&bytes)?)
}
