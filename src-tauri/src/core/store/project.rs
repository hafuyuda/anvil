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

        // ── 版本门禁：schema 0.4 硬切，不迁移旧项目 ──
        // manifest 缺失视为新项目（load_manifest 会按当前版本创建）。
        let manifest_path = root.join("manifest.json");
        if manifest_path.exists() {
            let bytes = std::fs::read(&manifest_path)?;
            let version =
                match serde_json::from_slice::<crate::core::model::manifest::Manifest>(&bytes) {
                    Ok(m) => m.schema_version,
                    Err(_) => "<无法解析>".to_string(),
                };
            if version != crate::core::model::manifest::CURRENT_SCHEMA_VERSION {
                return Err(anyhow::anyhow!(
                    "项目格式版本 {version} 不受支持。Anvil 0.4 起剧本格式为破坏性变更，不支持打开旧项目。请新建项目。"
                ));
            }
        }

        std::fs::create_dir_all(root.join("cards"))?;
        std::fs::create_dir_all(root.join("types"))?;
        std::fs::create_dir_all(root.join("relations").join("from"))?;
        std::fs::create_dir_all(root.join("boards"))?;
        std::fs::create_dir_all(root.join("scenarios"))?;
        std::fs::create_dir_all(root.join("sessions"))?;
        std::fs::create_dir_all(root.join(".anvil"))?;
        std::fs::create_dir_all(root.join("docs"))?;
        std::fs::create_dir_all(root.join("card_groups"))?;

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
        let docs = self.collect_docs()?;
        let mut conn = self.index.lock().unwrap();
        crate::core::index::rebuild(&mut conn, &cards, &relations, &docs)?;
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
        Vec<crate::core::model::card_group::CardGroup>,
    )> {
        let cards = self.load_all_cards()?;
        let card_types = self.load_card_types()?;
        let relation_kinds = self.load_relation_kinds()?;
        let relations = self.list_all_relations()?;
        let scenarios = self.load_scenarios()?;
        let boards = self.load_boards()?;
        let sessions = self.load_sessions()?;
        let card_groups = self.load_card_groups()?;
        let docs = self.collect_docs()?;
        {
            let mut conn = self.index.lock().unwrap();
            crate::core::index::rebuild(&mut conn, &cards, &relations, &docs)?;
        }
        Ok((
            cards,
            card_types,
            relation_kinds,
            relations,
            scenarios,
            boards,
            sessions,
            card_groups,
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

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("anvil_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn open_rejects_old_schema_version() {
        let dir = temp_dir();
        let manifest = serde_json::json!({
            "kind": "anvil-project",
            "schema_version": "0.3",
            "name": "旧项目",
            "version": "0.1.0",
            "created_at": 0,
            "updated_at": 0
        });
        std::fs::write(
            dir.join("manifest.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();

        let err = match Project::open(&dir) {
            Err(e) => e,
            Ok(_) => panic!("旧版本必须被拒绝"),
        };
        let msg = err.to_string();
        assert!(msg.contains("0.3"), "错误信息应包含旧版本号：{msg}");
        assert!(
            msg.contains("不受支持"),
            "错误信息应说明版本不受支持：{msg}"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn open_rejects_unparsable_manifest() {
        let dir = temp_dir();
        std::fs::write(dir.join("manifest.json"), b"not json at all").unwrap();

        let err = match Project::open(&dir) {
            Err(e) => e,
            Ok(_) => panic!("无法解析的 manifest 必须被拒绝"),
        };
        assert!(err.to_string().contains("不受支持"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn open_accepts_current_version() {
        let dir = temp_dir();
        let result = Project::open(&dir);
        assert!(result.is_ok(), "无 manifest 的新目录应正常打开");
        // load_manifest 已按当前版本落盘
        let manifest = result.unwrap().load_manifest().unwrap();
        assert_eq!(
            manifest.schema_version,
            crate::core::model::manifest::CURRENT_SCHEMA_VERSION
        );

        let _ = std::fs::remove_dir_all(&dir);
    }
}
