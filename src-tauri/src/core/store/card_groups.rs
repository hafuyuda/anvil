use super::project::Project;
use crate::core::model::card_group::CardGroup;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn card_groups_dir(&self) -> PathBuf {
        self.root.join("card_groups")
    }

    pub fn card_group_path(&self, id: &str) -> PathBuf {
        self.card_groups_dir().join(format!("{id}.json"))
    }

    pub fn load_card_groups(&self) -> anyhow::Result<Vec<CardGroup>> {
        let dir = self.card_groups_dir();
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
            match serde_json::from_slice::<CardGroup>(&bytes) {
                Ok(g) => out.push(g),
                Err(e) => eprintln!("card_group {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_card_group(&self, group: &CardGroup) -> anyhow::Result<()> {
        std::fs::create_dir_all(self.card_groups_dir())?;
        let path = self.card_group_path(&group.id);
        let json = serde_json::to_vec_pretty(group)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_card_group(&self, id: &str) -> anyhow::Result<()> {
        let path = self.card_group_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    /// 从所有卡组中移除指定卡 ID。删除卡片时调用。
    pub fn remove_card_from_all_groups(&self, card_id: &str) -> anyhow::Result<()> {
        let groups = self.load_card_groups()?;
        for mut g in groups {
            let before = g.card_ids.len();
            g.card_ids.retain(|id| id != card_id);
            if g.card_ids.len() != before {
                g.updated_at = crate::core::util::now_ms();
                self.save_card_group(&g)?;
            }
        }
        Ok(())
    }
}
