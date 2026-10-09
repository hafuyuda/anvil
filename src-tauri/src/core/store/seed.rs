use super::project::Project;
use std::io::Read;

/// 内置示例世界包。编译进二进制。
const EXAMPLE_PACK: &[u8] = include_bytes!("../../../assets/example_world.anvilpack");

impl Project {
    /// 把内置示例世界解压到当前项目。
    /// 要求项目为空（无类型、无卡片），否则返回错误。
    pub fn seed_example_world(&self) -> anyhow::Result<()> {
        let existing_types = self.load_card_types()?;
        let existing_cards = self.load_all_cards()?;
        if !existing_types.is_empty() || !existing_cards.is_empty() {
            return Err(anyhow::anyhow!("项目已有内容，不会覆盖"));
        }

        let reader = std::io::Cursor::new(EXAMPLE_PACK);
        let mut archive = zip::ZipArchive::new(reader)?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            let name = entry.name().to_string();

            // 跳过 manifest——项目已有自己的
            if name == "manifest.json" {
                continue;
            }

            // 防路径遍历
            if name.contains("..") || name.starts_with('/') || name.starts_with('\\') {
                continue;
            }

            let out_path = self.root.join(&name);

            if entry.is_dir() {
                std::fs::create_dir_all(&out_path)?;
                continue;
            }

            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let mut buf = Vec::with_capacity(entry.size() as usize);
            entry.read_to_end(&mut buf)?;
            std::fs::write(&out_path, &buf)?;
        }

        self.rebuild_index()?;
        Ok(())
    }
}
