use crate::core::model::card::Card;
use crate::core::model::card_type::CardType;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Project {
    pub root: PathBuf,
    pub(crate) index: Mutex<Connection>,
}

impl Project {
    pub fn open(root: impl Into<PathBuf>) -> anyhow::Result<Self> {
        let root = root.into();
        std::fs::create_dir_all(root.join("cards"))?;
        std::fs::create_dir_all(root.join("types"))?;
        std::fs::create_dir_all(root.join("relations").join("from"))?;
        std::fs::create_dir_all(root.join("boards"))?;
        std::fs::create_dir_all(root.join("scenarios"))?;
        std::fs::create_dir_all(root.join("sessions"))?;
        std::fs::create_dir_all(root.join(".anvil"))?;

        let db_path = root.join(".anvil").join("index.db");
        let conn = crate::core::index::open_or_create(&db_path)?;

        let project = Self {
            root,
            index: Mutex::new(conn),
        };

        if project.needs_rebuild(&db_path) {
            project.rebuild_index()?;
        }

        if let Err(e) = project.load_manifest() {
            eprintln!("warning: load manifest failed: {e}");
        }

        Ok(project)
    }

    pub fn rebuild_index(&self) -> anyhow::Result<()> {
        let cards = self.load_all_cards()?;
        let relations = self.list_all_relations()?;
        let mut conn = self.index.lock().unwrap();
        crate::core::index::rebuild(&mut conn, &cards, &relations)?;
        Ok(())
    }

    pub fn reload(
        &self,
    ) -> anyhow::Result<(
        Vec<Card>,
        Vec<CardType>,
        Vec<crate::core::model::relation_kind::RelationKind>,
        Vec<crate::core::model::relation::Relation>,
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
            crate::core::index::rebuild(&mut conn, &cards, &relations)?;
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

    fn needs_rebuild(&self, db_path: &std::path::Path) -> bool {
        let user_version: i64 = {
            let conn = self.index.lock().unwrap();
            conn.query_row("PRAGMA user_version", [], |r| r.get(0))
                .unwrap_or(0)
        };
        if user_version == 0 {
            return true;
        }

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
