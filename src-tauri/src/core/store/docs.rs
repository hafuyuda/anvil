use super::project::Project;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn docs_dir(&self) -> PathBuf {
        self.root.join("docs")
    }

    pub fn doc_path(&self, card_id: &str) -> PathBuf {
        self.docs_dir().join(format!("{card_id}.md"))
    }

    /// 读取文档。不存在时返回 None。
    pub fn load_doc(&self, card_id: &str) -> anyhow::Result<Option<String>> {
        let path = self.doc_path(card_id);
        if !path.exists() {
            return Ok(None);
        }
        let content = std::fs::read_to_string(&path)?;
        Ok(Some(content))
    }

    /// 保存文档。内容为空时删除文件。
    pub fn save_doc(&self, card_id: &str, content: &str) -> anyhow::Result<()> {
        let path = self.doc_path(card_id);
        if content.trim().is_empty() {
            if path.exists() {
                std::fs::remove_file(&path)?;
            }
            let conn = self.index.lock().unwrap();
            crate::core::index::delete_doc(&conn, card_id)?;
            return Ok(());
        }
        std::fs::create_dir_all(self.docs_dir())?;
        write_atomic(&path, content.as_bytes())?;
        let conn = self.index.lock().unwrap();
        crate::core::index::upsert_doc(&conn, card_id, content)?;
        Ok(())
    }

    pub fn delete_doc(&self, card_id: &str) -> anyhow::Result<()> {
        let path = self.doc_path(card_id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        let conn = self.index.lock().unwrap();
        crate::core::index::delete_doc(&conn, card_id)?;
        Ok(())
    }

    /// 收集全部文档内容，供索引全量重建使用。
    pub fn collect_docs(&self) -> anyhow::Result<Vec<(String, String)>> {
        let mut out = Vec::new();
        for card_id in self.list_doc_card_ids()? {
            if let Some(content) = self.load_doc(&card_id)? {
                out.push((card_id, content));
            }
        }
        Ok(out)
    }

    /// 列出所有有文档的卡牌 ID。
    pub fn list_doc_card_ids(&self) -> anyhow::Result<Vec<String>> {
        let dir = self.docs_dir();
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
