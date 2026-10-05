use super::project::Project;
use std::io::Write;
use std::path::Path;

impl Project {
    pub fn export_pack(&self, output_path: &Path) -> anyhow::Result<()> {
        // 确保 manifest 最新
        let mut manifest = self.load_manifest()?;
        manifest.updated_at = crate::core::util::now_ms();
        self.save_manifest(&manifest)?;

        let file = std::fs::File::create(output_path)?;
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o644);

        let allowed = [
            "manifest.json",
            "types",
            "cards",
            "relations",
            "boards",
            "scenarios",
            "sessions",
            "assets",
        ];

        let walker = walkdir::WalkDir::new(&self.root)
            .min_depth(1)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                if name.starts_with('.') {
                    return false;
                }
                if name == "node_modules" || name == "target" {
                    return false;
                }
                true
            });

        for entry in walker.filter_map(|e| e.ok()) {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            let rel = path.strip_prefix(&self.root)?;
            let rel_str = rel.to_string_lossy().replace('\\', "/");

            let first = rel_str.split('/').next().unwrap_or("");
            if !allowed.contains(&first) {
                continue;
            }

            zip.start_file(&rel_str, options)?;
            let content = std::fs::read(path)?;
            zip.write_all(&content)?;
        }

        zip.finish()?;
        Ok(())
    }

    pub fn import_pack_to(src: &Path, dest: &Path) -> anyhow::Result<()> {
        let file = std::fs::File::open(src)?;
        let mut archive = zip::ZipArchive::new(file)?;

        std::fs::create_dir_all(dest)?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            let name = entry.name().to_string();

            if name.contains("..") || name.starts_with('/') {
                continue;
            }

            let out_path = dest.join(&name);

            if entry.is_dir() {
                std::fs::create_dir_all(&out_path)?;
                continue;
            }

            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let mut out_file = std::fs::File::create(&out_path)?;
            std::io::copy(&mut entry, &mut out_file)?;
        }

        Ok(())
    }
}