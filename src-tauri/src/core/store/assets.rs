use super::project::Project;
use crate::core::model::card_type::FieldType;
use std::path::PathBuf;

const ALLOWED_EXT: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg"];

impl Project {
    pub fn assets_dir(&self) -> PathBuf {
        self.root.join("assets")
    }

    pub fn images_dir(&self) -> PathBuf {
        self.assets_dir().join("images")
    }

    pub fn image_path(&self, filename: &str) -> PathBuf {
        self.images_dir().join(filename)
    }

    /// 把外部图片复制进项目，返回相对路径 `assets/images/<uuid>.<ext>`
    pub fn import_image(&self, src: &std::path::Path) -> anyhow::Result<String> {
        if !src.exists() || !src.is_file() {
            return Err(anyhow::anyhow!("源文件不存在"));
        }

        std::fs::create_dir_all(self.images_dir())?;

        let ext = src
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !ALLOWED_EXT.contains(&ext.as_str()) {
            return Err(anyhow::anyhow!(
                "不支持的图片格式：{}（允许：{}）",
                if ext.is_empty() { "无扩展名" } else { &ext },
                ALLOWED_EXT.join(", ")
            ));
        }

        let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
        let dest = self.images_dir().join(&filename);

        std::fs::copy(src, &dest)?;

        Ok(format!("assets/images/{filename}"))
    }

    /// 相对路径 → 绝对路径
    pub fn resolve_asset(&self, relative: &str) -> PathBuf {
        self.root.join(relative)
    }

    pub fn delete_image(&self, relative: &str) -> anyhow::Result<()> {
        if !relative.starts_with("assets/") {
            return Err(anyhow::anyhow!("只能删除 assets/ 下的文件"));
        }
        // 防路径遍历
        if relative.contains("..") {
            return Err(anyhow::anyhow!("非法路径"));
        }
        let path = self.resolve_asset(relative);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    pub fn list_images(&self) -> anyhow::Result<Vec<String>> {
        let dir = self.images_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            out.push(format!("assets/images/{name}"));
        }
        out.sort();
        Ok(out)
    }

    /// 读取图片并返回 data URL
    pub fn read_image_data_url(&self, relative: &str) -> anyhow::Result<String> {
        use base64::{engine::general_purpose, Engine as _};

        if !relative.starts_with("assets/") {
            return Err(anyhow::anyhow!("只能读取 assets/ 下的文件"));
        }
        if relative.contains("..") {
            return Err(anyhow::anyhow!("非法路径"));
        }

        let path = self.resolve_asset(relative);
        if !path.exists() {
            return Err(anyhow::anyhow!("图片不存在：{relative}"));
        }

        let bytes = std::fs::read(&path)?;
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("png")
            .to_lowercase();

        let mime = match ext.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            _ => "application/octet-stream",
        };

        let b64 = general_purpose::STANDARD.encode(&bytes);
        Ok(format!("data:{mime};base64,{b64}"))
    }

    /// 找出所有未被任何卡片引用的图片。
    pub fn find_unused_images(&self) -> anyhow::Result<Vec<String>> {
        let card_types = self.load_card_types()?;
        let cards = self.load_all_cards()?;
        let all_images = self.list_images()?;

        // 建立 type_id -> [image 字段 key] 映射
        let mut image_fields: std::collections::HashMap<String, Vec<String>> =
            std::collections::HashMap::new();
        for ct in &card_types {
            let keys: Vec<String> = ct
                .fields
                .iter()
                .filter(|f| matches!(f.ty, FieldType::Image))
                .map(|f| f.key.clone())
                .collect();
            image_fields.insert(ct.id.clone(), keys);
        }

        // 收集所有被引用的图片路径
        let mut used: std::collections::HashSet<String> = std::collections::HashSet::new();
        for card in &cards {
            if let Some(keys) = image_fields.get(&card.type_id) {
                for k in keys {
                    if let Some(serde_json::Value::String(s)) = card.values.get(k) {
                        let s = s.trim();
                        if !s.is_empty() {
                            used.insert(s.to_string());
                        }
                    }
                }
            }
        }

        let unused: Vec<String> = all_images
            .into_iter()
            .filter(|p| !used.contains(p))
            .collect();
        Ok(unused)
    }

    /// 删除所有未被引用的图片，返回删除的路径列表。
    pub fn cleanup_unused_images(&self) -> anyhow::Result<Vec<String>> {
        let unused = self.find_unused_images()?;
        let mut deleted = Vec::new();
        for p in unused {
            if self.delete_image(&p).is_ok() {
                deleted.push(p);
            }
        }
        Ok(deleted)
    }
}
