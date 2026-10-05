use super::project::Project;
use crate::core::model::theme::Theme;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn themes_dir(&self) -> PathBuf {
        self.root.join("themes")
    }

    pub fn theme_path(&self, id: &str) -> PathBuf {
        self.themes_dir().join(format!("{id}.json"))
    }

    pub fn load_themes(&self) -> anyhow::Result<Vec<Theme>> {
        let dir = self.themes_dir();
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
            match serde_json::from_slice::<Theme>(&bytes) {
                Ok(t) => out.push(t),
                Err(e) => eprintln!("theme {}: {}", path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_theme(&self, theme: &Theme) -> anyhow::Result<()> {
        std::fs::create_dir_all(self.themes_dir())?;
        let path = self.theme_path(&theme.id);
        let json = serde_json::to_vec_pretty(theme)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    pub fn delete_theme(&self, id: &str) -> anyhow::Result<()> {
        let path = self.theme_path(id);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }
}