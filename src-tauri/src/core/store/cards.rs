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

    pub fn delete_card(&self, id: &str) -> anyhow::Result<()> {
        let path = self.card_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        {
            let conn = self.index.lock().unwrap();
            crate::core::index::delete_card(&conn, id)?;
        }
        // 同步清理卡组引用
        self.remove_card_from_all_groups(id)?;
        Ok(())
    }

    pub fn search_cards(&self, query: &str, limit: usize) -> anyhow::Result<Vec<String>> {
        let conn = self.index.lock().unwrap();
        crate::core::index::search(&conn, query, limit)
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
