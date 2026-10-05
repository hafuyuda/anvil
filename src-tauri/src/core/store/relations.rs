use super::project::Project;
use crate::core::model::relation::Relation;
use crate::core::model::relation_kind::RelationKind;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
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

    pub fn upsert_relation(&self, relation: &Relation) -> anyhow::Result<()> {
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

    pub fn relation_kinds_path(&self) -> PathBuf {
        self.root.join("types").join("relation_kinds.json")
    }

    pub fn load_relation_kinds(&self) -> anyhow::Result<Vec<RelationKind>> {
        let path = self.relation_kinds_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let bytes = std::fs::read(&path)?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub fn save_relation_kinds(&self, kinds: &[RelationKind]) -> anyhow::Result<()> {
        let path = self.relation_kinds_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(kinds)?;
        write_atomic(&path, &json)?;
        Ok(())
    }
}
