use super::project::Project;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn scripts_dir(&self) -> PathBuf {
        self.root.join("scripts")
    }

    pub fn script_path(&self, card_id: &str) -> PathBuf {
        self.scripts_dir().join(format!("{card_id}.md"))
    }

    /// 读取剧本。不存在时返回 None。
    pub fn load_script(&self, card_id: &str) -> anyhow::Result<Option<String>> {
        let path = self.script_path(card_id);
        if !path.exists() {
            return Ok(None);
        }
        let content = std::fs::read_to_string(&path)?;
        Ok(Some(content))
    }

    /// 保存剧本。内容为空时删除文件。
    pub fn save_script(&self, card_id: &str, content: &str) -> anyhow::Result<()> {
        let path = self.script_path(card_id);
        if content.trim().is_empty() {
            if path.exists() {
                std::fs::remove_file(&path)?;
            }
            return Ok(());
        }
        std::fs::create_dir_all(self.scripts_dir())?;
        write_atomic(&path, content.as_bytes())?;
        Ok(())
    }

    pub fn delete_script(&self, card_id: &str) -> anyhow::Result<()> {
        let path = self.script_path(card_id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    /// 列出所有有剧本的场景卡 ID。
    pub fn list_script_card_ids(&self) -> anyhow::Result<Vec<String>> {
        let dir = self.scripts_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                continue;
            }
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                out.push(stem.to_string());
            }
        }
        Ok(out)
    }
}