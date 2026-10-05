use crate::core::index as idx;
use crate::core::model::card::Card;
use crate::core::model::card_type::{CardType, FieldType};
use crate::core::model::helpers::{fdef, values};
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
use crate::core::store::atomic::write_atomic;
use crate::core::util::now_ms;
use rusqlite::Connection;
use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Project {
    pub root: PathBuf,
    index: Mutex<Connection>,
}

impl Project {
    pub fn open(root: impl Into<PathBuf>) -> anyhow::Result<Self> {
        let root = root.into();
        std::fs::create_dir_all(root.join("cards"))?;
        std::fs::create_dir_all(root.join("types"))?;
        std::fs::create_dir_all(root.join("relations").join("from"))?;
        std::fs::create_dir_all(root.join(".anvil"))?;
        std::fs::create_dir_all(root.join("scenarios"))?;
        std::fs::create_dir_all(root.join("boards"))?;
        std::fs::create_dir_all(root.join("sessions"))?;

        let db_path = root.join(".anvil").join("index.db");
        let conn = crate::core::index::open_or_create(&db_path)?;

        let project = Self {
            root,
            index: Mutex::new(conn),
        };
        if project.needs_rebuild(&db_path) {
            project.rebuild_index()?;
        }
        Ok(project)
    }

    pub fn rebuild_index(&self) -> anyhow::Result<()> {
        let cards = self.load_all_cards()?;
        let relations = self.list_all_relations()?;
        let mut conn = self.index.lock().unwrap();
        idx::rebuild(&mut conn, &cards, &relations)?;
        Ok(())
    }

    pub fn search_cards(&self, query: &str, limit: usize) -> anyhow::Result<Vec<String>> {
        let conn = self.index.lock().unwrap();
        idx::search(&conn, query, limit)
    }

    pub fn card_path(&self, id: &str) -> PathBuf {
        let prefix = &id[..2.min(id.len())];
        self.root
            .join("cards")
            .join(prefix)
            .join(format!("{id}.json"))
    }

    pub fn save_card(&self, card: &Card) -> anyhow::Result<()> {
        let path = self.card_path(&card.id);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(card)?;
        write_atomic(&path, &json)?;

        let conn = self.index.lock().unwrap();
        idx::upsert_card(&conn, card)?;
        Ok(())
    }

    pub fn load_card(&self, id: &str) -> anyhow::Result<Card> {
        let path = self.card_path(id);
        let bytes = std::fs::read(&path)?;
        let card: Card = serde_json::from_slice(&bytes)?;
        Ok(card)
    }

    pub fn list_card_ids(&self) -> anyhow::Result<Vec<String>> {
        let cards_dir = self.root.join("cards");
        let mut ids = Vec::new();
        if !cards_dir.exists() {
            return Ok(ids);
        }
        for prefix in std::fs::read_dir(&cards_dir)? {
            let prefix = prefix?;
            if !prefix.file_type()?.is_dir() {
                continue;
            }
            for entry in std::fs::read_dir(prefix.path())? {
                let entry = entry?;
                if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    ids.push(stem.to_string());
                }
            }
        }
        Ok(ids)
    }

    pub fn load_all_cards(&self) -> anyhow::Result<Vec<Card>> {
        let mut cards = Vec::new();
        for id in self.list_card_ids()? {
            match self.load_card(&id) {
                Ok(c) => cards.push(c),
                Err(e) => eprintln!("load card {id} failed: {e}"),
            }
        }
        Ok(cards)
    }

    pub fn card_types_path(&self) -> PathBuf {
        self.root.join("types").join("card_types.json")
    }

    pub fn load_card_types(&self) -> anyhow::Result<Vec<crate::core::model::card_type::CardType>> {
        let path = self.card_types_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let bytes = std::fs::read(&path)?;
        let types = serde_json::from_slice(&bytes)?;
        Ok(types)
    }

    pub fn save_card_types(
        &self,
        types: &[crate::core::model::card_type::CardType],
    ) -> anyhow::Result<()> {
        let path = self.card_types_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(types)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_card(&self, id: &str) -> anyhow::Result<()> {
        let path = self.card_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        let conn = self.index.lock().unwrap();
        idx::delete_card(&conn, id)?;
        Ok(())
    }

    pub fn reload(
        &self,
    ) -> anyhow::Result<(
        Vec<Card>,
        Vec<CardType>,
        Vec<crate::core::model::relation_kind::RelationKind>,
        Vec<Relation>,
        Vec<crate::core::model::scenario::Scenario>,
        Vec<crate::core::model::board::Board>,
        Vec<crate::core::model::session::Session>,
    )> {
        let cards = self.load_all_cards()?;
        let card_types = self.load_card_types()?;
        let relation_kinds = self.load_relation_kinds()?;
        let relations = self.list_all_relations()?;
        let scenarios = self.load_scenarios()?;
        let boards = self.load_boards()?;
        let sessions = self.load_sessions()?;
        {
            let mut conn = self.index.lock().unwrap();
            idx::rebuild(&mut conn, &cards, &relations)?;
        }
        Ok((
            cards,
            card_types,
            relation_kinds,
            relations,
            scenarios,
            boards,
            sessions,
        ))
    }

    pub fn seed_example_world(&self) -> anyhow::Result<()> {
        let existing_types = self.load_card_types()?;
        let existing_cards = self.load_all_cards()?;
        if !existing_types.is_empty() || !existing_cards.is_empty() {
            return Err(anyhow::anyhow!("项目已有内容，不会覆盖"));
        }

        let now = now_ms();

        let npc_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "角色".into(),
            icon: Some("user".into()),
            color: Some("#8b6f47".into()),
            description: Some("世界观中的 NPC 或人物".into()),
            fields: vec![
                fdef("race", "种族", FieldType::Text, 0, false),
                fdef("occupation", "职业", FieldType::Text, 1, false),
                fdef("appearance", "外貌", FieldType::RichText, 2, false),
                fdef("personality", "性格", FieldType::RichText, 3, false),
                fdef("alive", "存活", FieldType::Bool, 4, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
            created_at: now,
            updated_at: now,
        };

        let location_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "地点".into(),
            icon: Some("map-pin".into()),
            color: Some("#4a7a8c".into()),
            description: Some("城镇、遗迹、房间".into()),
            fields: vec![
                fdef("region", "区域", FieldType::Text, 0, false),
                fdef("description", "描述", FieldType::RichText, 1, false),
                fdef(
                    "danger",
                    "危险等级",
                    FieldType::Enum {
                        options: vec!["安全".into(), "警戒".into(), "危险".into(), "致命".into()],
                    },
                    2,
                    false,
                ),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: None,
            created_at: now,
            updated_at: now,
        };

        let item_type = CardType {
            id: uuid::Uuid::new_v4().to_string(),
            name: "物品".into(),
            icon: Some("package".into()),
            color: Some("#a05a2c".into()),
            description: Some("武器、工具、宝物".into()),
            fields: vec![
                fdef("material", "材质", FieldType::Text, 0, false),
                fdef("value", "价值", FieldType::Number, 1, false),
                fdef("description", "描述", FieldType::RichText, 2, false),
                fdef("tags", "标签", FieldType::Tags, 3, false),
            ],
            allowed_relation_kinds: vec![],
            views: vec![],
            card_frame: Some(crate::core::model::card_type::CardFrameConfig {
                style: Some("yugioh".into()),
                title: None,
                subtitle: Some("material".into()),
                image: None,
                level: None,
                type_line: None,
                body: vec!["description".into(), "tags".into()],
                atk: Some("value".into()),
                def: None,
                hp: None,
            }),
            created_at: now,
            updated_at: now,
        };

        let npc_id = npc_type.id.clone();
        let location_id = location_type.id.clone();
        let item_id = item_type.id.clone();

        self.save_card_types(&[npc_type, location_type, item_type])?;

        let cards = vec![
        Card {
            id: uuid::Uuid::new_v4().to_string(),
            type_id: location_id.clone(),
            name: "铁砧堡".into(),
            values: values(&[
                ("region", serde_json::json!("北境山脉")),
                (
                    "description",
                    serde_json::json!(
                        "依山而建的矮人要塞，炉火终年不熄。城中最大的建筑是中央熔炉，铁匠们在那里日夜锻造。"
                    ),
                ),
                ("danger", serde_json::json!("安全")),
            ]),
            created_at: now,
            updated_at: now,
        },
        Card {
            id: uuid::Uuid::new_v4().to_string(),
            type_id: npc_id.clone(),
            name: "铁匠布洛克".into(),
            values: values(&[
                ("race", serde_json::json!("矮人")),
                ("occupation", serde_json::json!("铁匠铺主人")),
                (
                    "appearance",
                    serde_json::json!("须发灰白，右臂上有灼伤旧痕，常穿沾满炉灰的皮革围裙。"),
                ),
                (
                    "personality",
                    serde_json::json!("沉默寡言，但对手艺极为自负。不喜欢讨价还价。"),
                ),
                ("alive", serde_json::json!(true)),
            ]),
            created_at: now,
            updated_at: now,
        },
        Card {
            id: uuid::Uuid::new_v4().to_string(),
            type_id: npc_id.clone(),
            name: "学徒格蕾塔".into(),
            values: values(&[
                ("race", serde_json::json!("人类")),
                ("occupation", serde_json::json!("布洛克的学徒")),
                (
                    "appearance",
                    serde_json::json!("短发，手指常被烫出水泡，眼睛很亮。"),
                ),
                (
                    "personality",
                    serde_json::json!("好奇，话多，总想打听外来者的事。"),
                ),
                ("alive", serde_json::json!(true)),
            ]),
            created_at: now,
            updated_at: now,
        },
        Card {
            id: uuid::Uuid::new_v4().to_string(),
            type_id: item_id.clone(),
            name: "熔炉之锤".into(),
            values: values(&[
                ("material", serde_json::json!("星铁 + 古橡木")),
                ("value", serde_json::json!(1200)),
                (
                    "description",
                    serde_json::json!(
                        "布洛克的传家宝，据说锤头的星铁来自坠落的陨石。锻造时锤面会泛起暗红微光。"
                    ),
                ),
                ("tags", serde_json::json!(["传家宝", "锻造", "稀有"])),
            ]),
            created_at: now,
            updated_at: now,
        },
    ];

        for c in &cards {
            self.save_card(c)?;
        }

        // 加几条关系做示范
        let brokkr = cards.iter().find(|c| c.name == "铁匠布洛克").unwrap();
        let gretta = cards.iter().find(|c| c.name == "学徒格蕾塔").unwrap();
        let anvil = cards.iter().find(|c| c.name == "铁砧堡").unwrap();
        let hammer = cards.iter().find(|c| c.name == "熔炉之锤").unwrap();

        let located_in = RelationKind {
            id: "located_in".into(),
            name: "位于".into(),
            inverse_name: Some("包含".into()),
            directed: true,
            color: Some("#4a7a8c".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };
        let apprentice_of = RelationKind {
            id: "apprentice_of".into(),
            name: "学徒于".into(),
            inverse_name: Some("师傅是".into()),
            directed: true,
            color: Some("#8b6f47".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };
        let owns = RelationKind {
            id: "owns".into(),
            name: "持有".into(),
            inverse_name: Some("被持有".into()),
            directed: true,
            color: Some("#a05a2c".into()),
            from_types: vec![],
            to_types: vec![],
            fields: vec![],
            created_at: now,
            updated_at: now,
        };

        self.save_relation_kinds(&[located_in, apprentice_of, owns])?;

        let rels = vec![
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: brokkr.id.clone(),
                to: anvil.id.clone(),
                kind: "located_in".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: gretta.id.clone(),
                to: anvil.id.clone(),
                kind: "located_in".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: gretta.id.clone(),
                to: brokkr.id.clone(),
                kind: "apprentice_of".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
            Relation {
                id: uuid::Uuid::new_v4().to_string(),
                from: brokkr.id.clone(),
                to: hammer.id.clone(),
                kind: "owns".into(),
                label: None,
                meta: BTreeMap::new(),
                created_at: now,
            },
        ];

        // 按 from 分组写入
        let mut by_from: std::collections::BTreeMap<String, Vec<Relation>> = BTreeMap::new();
        for r in rels {
            by_from.entry(r.from.clone()).or_default().push(r);
        }
        for (from, list) in by_from {
            self.save_relations_from(&from, &list)?;
        }

        Ok(())
    }

    pub fn relation_kinds_path(&self) -> PathBuf {
        self.root.join("types").join("relation_kinds.json")
    }

    pub fn load_relation_kinds(
        &self,
    ) -> anyhow::Result<Vec<crate::core::model::relation_kind::RelationKind>> {
        let path = self.relation_kinds_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let bytes = std::fs::read(&path)?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub fn save_relation_kinds(
        &self,
        kinds: &[crate::core::model::relation_kind::RelationKind],
    ) -> anyhow::Result<()> {
        let path = self.relation_kinds_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(kinds)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn relations_from_path(&self, card_id: &str) -> PathBuf {
        self.root
            .join("relations")
            .join("from")
            .join(format!("{card_id}.jsonl"))
    }

    pub fn load_relations_from(&self, card_id: &str) -> anyhow::Result<Vec<Relation>> {
        let path = self.relations_from_path(card_id);
        if !path.exists() {
            return Ok(Vec::new());
        }
        let text = std::fs::read_to_string(&path)?;
        let mut out = Vec::new();
        for (lineno, line) in text.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            match serde_json::from_str::<Relation>(line) {
                Ok(r) => out.push(r),
                Err(e) => eprintln!("relations {} line {}: {}", path.display(), lineno + 1, e),
            }
        }
        Ok(out)
    }

    pub fn save_relations_from(&self, card_id: &str, rels: &[Relation]) -> anyhow::Result<()> {
        let path = self.relations_from_path(card_id);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        if rels.is_empty() {
            if path.exists() {
                std::fs::remove_file(&path)?;
            }
            return Ok(());
        }
        let mut buf = String::new();
        for r in rels {
            buf.push_str(&serde_json::to_string(r)?);
            buf.push('\n');
        }
        write_atomic(&path, buf.as_bytes())?;
        Ok(())
    }

    pub fn list_all_relations(&self) -> anyhow::Result<Vec<Relation>> {
        let dir = self.root.join("relations").join("from");
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("jsonl") {
                continue;
            }
            let text = std::fs::read_to_string(&path)?;
            for line in text.lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                if let Ok(r) = serde_json::from_str::<Relation>(line) {
                    out.push(r);
                }
            }
        }
        Ok(out)
    }

    pub fn upsert_relation(
        &self,
        relation: &crate::core::model::relation::Relation,
    ) -> anyhow::Result<()> {
        let mut rels = self.load_relations_from(&relation.from)?;
        match rels.iter_mut().find(|r| r.id == relation.id) {
            Some(existing) => *existing = relation.clone(),
            None => rels.push(relation.clone()),
        }
        self.save_relations_from(&relation.from, &rels)?;

        let conn = self.index.lock().unwrap();
        crate::core::index::upsert_relation(&conn, relation)?;
        Ok(())
    }

    pub fn delete_relation(&self, from_id: &str, relation_id: &str) -> anyhow::Result<()> {
        let mut rels = self.load_relations_from(from_id)?;
        let before = rels.len();
        rels.retain(|r| r.id != relation_id);
        if rels.len() == before {
            return Ok(());
        }
        self.save_relations_from(from_id, &rels)?;

        let conn = self.index.lock().unwrap();
        crate::core::index::delete_relation(&conn, relation_id)?;
        Ok(())
    }

    fn needs_rebuild(&self, db_path: &std::path::Path) -> bool {
        // 未索引过（user_version == 0）→ 需要
        let user_version: i64 = {
            let conn = self.index.lock().unwrap();
            conn.query_row("PRAGMA user_version", [], |r| r.get(0))
                .unwrap_or(0)
        };
        if user_version == 0 {
            return true;
        }

        // 比较 db mtime 和项目目录里最新文件的 mtime
        let db_mtime = match std::fs::metadata(db_path).and_then(|m| m.modified()) {
            Ok(t) => t,
            Err(_) => return true,
        };

        for dir in [
            self.root.join("cards"),
            self.root.join("types"),
            self.root.join("relations"),
        ] {
            if let Some(newest) = newest_mtime_recursive(&dir) {
                if newest > db_mtime {
                    return true;
                }
            }
        }
        false
    }

    pub fn scenarios_dir(&self) -> PathBuf {
        self.root.join("scenarios")
    }

    pub fn scenario_path(&self, id: &str) -> PathBuf {
        self.scenarios_dir().join(format!("{id}.json"))
    }

    pub fn load_scenarios(&self) -> anyhow::Result<Vec<crate::core::model::scenario::Scenario>> {
        let dir = self.scenarios_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let bytes = std::fs::read(&path)?;
            match serde_json::from_slice::<crate::core::model::scenario::Scenario>(&bytes) {
                Ok(s) => out.push(s),
                Err(e) => eprintln!("scenario {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_scenario(
        &self,
        scenario: &crate::core::model::scenario::Scenario,
    ) -> anyhow::Result<()> {
        let dir = self.scenarios_dir();
        std::fs::create_dir_all(&dir)?;
        let path = self.scenario_path(&scenario.id);
        let json = serde_json::to_vec_pretty(scenario)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_scenario(&self, id: &str) -> anyhow::Result<()> {
        let path = self.scenario_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    pub fn boards_dir(&self) -> PathBuf {
        self.root.join("boards")
    }

    pub fn board_path(&self, id: &str) -> PathBuf {
        self.boards_dir().join(format!("{id}.json"))
    }

    pub fn load_boards(&self) -> anyhow::Result<Vec<crate::core::model::board::Board>> {
        let dir = self.boards_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let bytes = std::fs::read(&path)?;
            match serde_json::from_slice::<crate::core::model::board::Board>(&bytes) {
                Ok(b) => out.push(b),
                Err(e) => eprintln!("board {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_board(&self, board: &crate::core::model::board::Board) -> anyhow::Result<()> {
        std::fs::create_dir_all(self.boards_dir())?;
        let path = self.board_path(&board.id);
        let json = serde_json::to_vec_pretty(board)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_board(&self, id: &str) -> anyhow::Result<()> {
        let path = self.board_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    pub fn sessions_dir(&self) -> PathBuf {
        self.root.join("sessions")
    }

    pub fn session_dir(&self, id: &str) -> PathBuf {
        self.sessions_dir().join(id)
    }

    pub fn session_path(&self, id: &str) -> PathBuf {
        self.session_dir(id).join("session.json")
    }

    pub fn events_path(&self, id: &str) -> PathBuf {
        self.session_dir(id).join("events.jsonl")
    }

    pub fn load_sessions(&self) -> anyhow::Result<Vec<crate::core::model::session::Session>> {
        let dir = self.sessions_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            let path = entry.path().join("session.json");
            if !path.exists() {
                continue;
            }
            let bytes = std::fs::read(&path)?;
            match serde_json::from_slice::<crate::core::model::session::Session>(&bytes) {
                Ok(s) => out.push(s),
                Err(e) => eprintln!("session {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_session(
        &self,
        session: &crate::core::model::session::Session,
    ) -> anyhow::Result<()> {
        let dir = self.session_dir(&session.id);
        std::fs::create_dir_all(&dir)?;
        let path = dir.join("session.json");
        let json = serde_json::to_vec_pretty(session)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_session(&self, id: &str) -> anyhow::Result<()> {
        let dir = self.session_dir(id);
        if dir.exists() {
            std::fs::remove_dir_all(&dir)?;
        }
        Ok(())
    }

    pub fn load_events(
        &self,
        session_id: &str,
    ) -> anyhow::Result<Vec<crate::core::model::session::Event>> {
        let path = self.events_path(session_id);
        if !path.exists() {
            return Ok(Vec::new());
        }
        let text = std::fs::read_to_string(&path)?;
        let mut out = Vec::new();
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Ok(ev) = serde_json::from_str::<crate::core::model::session::Event>(line) {
                out.push(ev);
            }
        }
        Ok(out)
    }

    pub fn append_event(
        &self,
        session_id: &str,
        mut event: crate::core::model::session::Event,
    ) -> anyhow::Result<()> {
        let dir = self.session_dir(session_id);
        std::fs::create_dir_all(&dir)?;

        // 自动分配 seq
        let existing = self.load_events(session_id)?;
        let next_seq = existing.iter().map(|e| e.seq).max().unwrap_or(0) + 1;
        if event.seq == 0 {
            event.seq = next_seq;
        }

        let path = self.events_path(session_id);
        use std::io::Write;
        let mut f = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        let line = serde_json::to_string(&event)?;
        writeln!(f, "{}", line)?;
        Ok(())
    }
}

fn newest_mtime_recursive(dir: &std::path::Path) -> Option<std::time::SystemTime> {
    if !dir.exists() {
        return None;
    }
    let mut newest: Option<std::time::SystemTime> = None;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let entries = match std::fs::read_dir(&current) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if let Ok(meta) = std::fs::metadata(&path) {
                if let Ok(t) = meta.modified() {
                    if newest.map_or(true, |n| t > n) {
                        newest = Some(t);
                    }
                }
            }
        }
    }
    newest
}
