use super::project::Project;
use crate::core::model::manifest::Manifest;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn manifest_path(&self) -> PathBuf {
        self.root.join("manifest.json")
    }

    pub fn load_manifest(&self) -> anyhow::Result<Manifest> {
        let path = self.manifest_path();
        if !path.exists() {
            let name = self
                .root
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("未命名项目")
                .to_string();
            let m = Manifest::new(name);
            self.save_manifest(&m)?;
            return Ok(m);
        }
        let bytes = std::fs::read(&path)?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub fn save_manifest(&self, manifest: &Manifest) -> anyhow::Result<()> {
        let json = serde_json::to_vec_pretty(manifest)?;
        write_atomic(&self.manifest_path(), &json)?;
        Ok(())
    }
}