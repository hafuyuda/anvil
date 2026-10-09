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

    // ────────────────────────────────────────────────────────
    // 音频
    // ────────────────────────────────────────────────────────

    pub fn audio_dir(&self) -> PathBuf {
        self.assets_dir().join("audio")
    }

    pub fn audio_path(&self, filename: &str) -> PathBuf {
        self.audio_dir().join(filename)
    }

    /// 把外部音频复制进项目，返回相对路径 `assets/audio/<uuid>.<ext>`
    pub fn import_audio(&self, src: &std::path::Path) -> anyhow::Result<String> {
        const ALLOWED_AUDIO_EXT: &[&str] = &["mp3", "ogg", "wav", "m4a"];

        if !src.exists() || !src.is_file() {
            return Err(anyhow::anyhow!("源文件不存在"));
        }

        std::fs::create_dir_all(self.audio_dir())?;

        let ext = src
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !ALLOWED_AUDIO_EXT.contains(&ext.as_str()) {
            return Err(anyhow::anyhow!(
                "不支持的音频格式：{}（允许：{}）",
                if ext.is_empty() { "无扩展名" } else { &ext },
                ALLOWED_AUDIO_EXT.join(", ")
            ));
        }

        let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
        let dest = self.audio_path(&filename);

        std::fs::copy(src, &dest)?;

        Ok(format!("assets/audio/{filename}"))
    }

    pub fn delete_audio(&self, relative: &str) -> anyhow::Result<()> {
        if !relative.starts_with("assets/audio/") {
            return Err(anyhow::anyhow!("只能删除 assets/audio/ 下的文件"));
        }
        if relative.contains("..") {
            return Err(anyhow::anyhow!("非法路径"));
        }
        let path = self.resolve_asset(relative);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    /// 列出所有音频，返回相对路径 `assets/audio/xxx`
    pub fn list_audios(&self) -> anyhow::Result<Vec<String>> {
        let dir = self.audio_dir();
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
            out.push(format!("assets/audio/{name}"));
        }
        out.sort();
        Ok(out)
    }

    /// 返回音频文件的绝对路径（供前端 convertFileSrc 用）
    pub fn audio_abs_path(&self, relative: &str) -> anyhow::Result<String> {
        if !relative.starts_with("assets/") {
            return Err(anyhow::anyhow!("只能访问 assets/ 下的文件"));
        }
        if relative.contains("..") {
            return Err(anyhow::anyhow!("非法路径"));
        }
        let path = self.resolve_asset(relative);
        Ok(path.to_string_lossy().into_owned())
    }

    /// 列出所有音频 + 元数据（大小、被多少剧本引用）。
    pub fn list_audios_with_meta(&self) -> anyhow::Result<Vec<AudioMeta>> {
        let list = self.list_audios()?;

        // 扫描所有剧本，统计每个音频路径被引用次数
        let mut ref_counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        let scripts_dir = self.scripts_dir();
        if scripts_dir.exists() {
            for entry in std::fs::read_dir(&scripts_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) != Some("md") {
                    continue;
                }
                let content = match std::fs::read_to_string(&path) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                for audio_path in &list {
                    if content.contains(audio_path) {
                        *ref_counts.entry(audio_path.clone()).or_insert(0) += 1;
                    }
                }
            }
        }

        let mut out = Vec::with_capacity(list.len());
        for p in list {
            let abs = self.resolve_asset(&p);
            let size = std::fs::metadata(&abs).map(|m| m.len()).unwrap_or(0);
            let ref_count = ref_counts.get(&p).copied().unwrap_or(0);
            out.push(AudioMeta {
                path: p,
                size,
                ref_count,
            });
        }
        Ok(out)
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AudioMeta {
    pub path: String,
    pub size: u64,
    pub ref_count: usize,
}
