use super::project::Project;
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
}