use super::project::Project;
use crate::core::model::card::Card;
use crate::core::model::card_type::CardType;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
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
        crate::core::index::upsert_card(&conn, card)?;
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
                let path = entry.path();
                // 只收 .json。这里原来是照单全收 file_stem，于是
                // `write_atomic` 失败残留的 `<uuid>.json.tmp` 也会被当成
                // 一张卡，同一个 id 进两遍，索引里就是重复项。
                if path.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
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

    /// 删除一张卡。
    ///
    /// 顺序很重要：先在牌桌上摘掉指向它的引用，再删本体。
    /// 反过来就取不到卡名了 —— 而 detach 模式要靠卡名给棋子留个墓碑。
    pub fn delete_card(
        &self,
        id: &str,
        mode: crate::core::store::refs::ClearMode,
    ) -> anyhow::Result<()> {
        let name = self
            .load_card(id)
            .ok()
            .map(|c| c.name)
            .unwrap_or_else(|| id.to_string());
        // 摘引用：棋盘/会话棋子、卡盒、先攻条目、关系两侧、卡组
        self.purge_card_refs(id, &name, mode)?;

        let path = self.card_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        {
            let conn = self.index.lock().unwrap();
            crate::core::index::delete_card(&conn, id)?;
        }
        // 同步清理文档
        self.delete_doc(id)?;
        Ok(())
    }

    pub fn search_cards(&self, query: &str, limit: usize) -> anyhow::Result<Vec<String>> {
        let conn = self.index.lock().unwrap();
        let mut ids = crate::core::index::search(&conn, query, limit)?;
        let doc_ids = crate::core::index::search_docs(&conn, query, limit)?;
        for id in doc_ids {
            if !ids.contains(&id) && ids.len() < limit {
                ids.push(id);
            }
        }
        Ok(ids)
    }

    pub fn card_types_path(&self) -> PathBuf {
        self.root.join("types").join("card_types.json")
    }

    pub fn load_card_types(&self) -> anyhow::Result<Vec<CardType>> {
        let path = self.card_types_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let bytes = std::fs::read(&path)?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub fn save_card_types(&self, types: &[CardType]) -> anyhow::Result<()> {
        let path = self.card_types_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_vec_pretty(types)?;
        write_atomic(&path, &json)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_project() -> (Project, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!("anvil_cards_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let project = Project::open(&dir).expect("open temp project");
        (project, dir)
    }

    fn card(id: &str) -> Card {
        Card {
            id: id.into(),
            type_id: "t1".into(),
            name: format!("卡 {id}"),
            values: std::collections::BTreeMap::new(),
            image_crop_override: None,
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn list_card_ids_ignores_stray_tmp_files() {
        let (project, dir) = temp_project();
        project.save_card(&card("aaa")).unwrap();

        // 模拟 write_atomic 失败后的残留。这里原来是照单全收 file_stem，
        // 残留会让同一个 id 进两遍
        let prefix = project.card_path("aaa").parent().unwrap().to_path_buf();
        std::fs::write(prefix.join("aaa.json.tmp"), b"{truncated").unwrap();
        std::fs::write(prefix.join("bbb.json.tmp"), b"{truncated").unwrap();

        let ids = project.list_card_ids().unwrap();
        assert_eq!(ids, vec!["aaa".to_string()], "只认 .json，残留 tmp 不算卡");
        assert_eq!(
            project.load_all_cards().unwrap().len(),
            1,
            "加载也不该被残留影响"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }
}
