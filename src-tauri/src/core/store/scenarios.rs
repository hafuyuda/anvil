use super::project::Project;
use crate::core::model::scenario::Scenario;
use crate::core::store::atomic::write_atomic;
use std::path::PathBuf;

impl Project {
    pub fn scenarios_dir(&self) -> PathBuf {
        self.root.join("scenarios")
    }

    /// 单个剧情的目录：scenarios/<id>/
    pub fn scenario_dir(&self, id: &str) -> PathBuf {
        self.scenarios_dir().join(id)
    }

    /// 剧情元数据：scenarios/<id>/scenario.json
    pub fn scenario_meta_path(&self, id: &str) -> PathBuf {
        self.scenario_dir(id).join("scenario.json")
    }

    pub fn load_scenarios(&self) -> anyhow::Result<Vec<Scenario>> {
        let dir = self.scenarios_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            let meta_path = entry.path().join("scenario.json");
            if !meta_path.exists() {
                continue;
            }
            let bytes = std::fs::read(&meta_path)?;
            match serde_json::from_slice::<Scenario>(&bytes) {
                Ok(s) => out.push(s),
                Err(e) => eprintln!("scenario {}: {}", meta_path.display(), e),
            }
        }
        Ok(out)
    }

    pub fn save_scenario(&self, scenario: &Scenario) -> anyhow::Result<()> {
        std::fs::create_dir_all(self.scenario_dir(&scenario.id))?;
        let path = self.scenario_meta_path(&scenario.id);
        let json = serde_json::to_vec_pretty(scenario)?;
        write_atomic(&path, &json)?;
        Ok(())
    }

    /// 删除剧情：整个 scenarios/<id>/ 目录（含元数据与剧本文件）。
    pub fn delete_scenario(&self, id: &str) -> anyhow::Result<()> {
        let dir = self.scenario_dir(id);
        if dir.exists() {
            std::fs::remove_dir_all(&dir)?;
        }
        Ok(())
    }

    /// 校验剧本文件名：只允许 <name>.md，禁止路径分隔符与 ..
    fn validate_script_filename(filename: &str) -> anyhow::Result<()> {
        if filename.is_empty()
            || !filename.ends_with(".md")
            || filename.contains('/')
            || filename.contains('\\')
            || filename.contains("..")
        {
            return Err(anyhow::anyhow!("非法剧本文件名：{filename}"));
        }
        Ok(())
    }

    /// 列出剧情目录下的剧本文件名（字典序）。
    pub fn list_script_files(&self, scenario_id: &str) -> anyhow::Result<Vec<String>> {
        let dir = self.scenario_dir(scenario_id);
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                continue;
            }
            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                out.push(name.to_string());
            }
        }
        out.sort();
        Ok(out)
    }

    /// 读取剧本文件。不存在时返回 None。
    pub fn load_script(&self, scenario_id: &str, filename: &str) -> anyhow::Result<Option<String>> {
        Self::validate_script_filename(filename)?;
        let path = self.scenario_dir(scenario_id).join(filename);
        if !path.exists() {
            return Ok(None);
        }
        let content = std::fs::read_to_string(&path)?;
        Ok(Some(content))
    }

    /// 保存剧本文件。内容为空时删除文件。
    pub fn save_script(
        &self,
        scenario_id: &str,
        filename: &str,
        content: &str,
    ) -> anyhow::Result<()> {
        Self::validate_script_filename(filename)?;
        let dir = self.scenario_dir(scenario_id);
        let path = dir.join(filename);
        if content.trim().is_empty() {
            if path.exists() {
                std::fs::remove_file(&path)?;
            }
            return Ok(());
        }
        std::fs::create_dir_all(&dir)?;
        write_atomic(&path, content.as_bytes())?;
        Ok(())
    }

    /// 删除剧本文件。文件不存在时静默成功。
    pub fn delete_script(&self, scenario_id: &str, filename: &str) -> anyhow::Result<()> {
        Self::validate_script_filename(filename)?;
        let path = self.scenario_dir(scenario_id).join(filename);
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_project() -> (Project, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!("anvil_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let project = Project::open(&dir).expect("open temp project");
        (project, dir)
    }

    fn cleanup(dir: &std::path::PathBuf) {
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn scenario_script_file_lifecycle() {
        let (project, dir) = temp_project();
        let scenario = Scenario {
            id: "s1".into(),
            name: "测试剧情".into(),
            description: None,
            entry_knot: None,
            created_at: 0,
            updated_at: 0,
        };
        project.save_scenario(&scenario).unwrap();

        // 保存 + 读取
        project
            .save_script("s1", "main.md", "> 你好。\n")
            .unwrap();
        assert_eq!(
            project.load_script("s1", "main.md").unwrap(),
            Some("> 你好。\n".into())
        );
        assert_eq!(project.list_script_files("s1").unwrap(), vec!["main.md"]);

        // 文件名字典序
        project.save_script("s1", "aux.md", "x").unwrap();
        assert_eq!(
            project.list_script_files("s1").unwrap(),
            vec!["aux.md", "main.md"]
        );

        // 空内容 → 删除文件
        project.save_script("s1", "aux.md", "  \n").unwrap();
        assert_eq!(project.load_script("s1", "aux.md").unwrap(), None);

        // 删除剧本文件
        project.delete_script("s1", "main.md").unwrap();
        assert!(project.list_script_files("s1").unwrap().is_empty());

        cleanup(&dir);
    }

    #[test]
    fn delete_scenario_cascades_directory() {
        let (project, dir) = temp_project();
        let scenario = Scenario {
            id: "s2".into(),
            name: "会消失的剧情".into(),
            description: None,
            entry_knot: None,
            created_at: 0,
            updated_at: 0,
        };
        project.save_scenario(&scenario).unwrap();
        project.save_script("s2", "main.md", "=== 开场\n").unwrap();

        assert!(project.scenario_dir("s2").exists());
        project.delete_scenario("s2").unwrap();
        assert!(!project.scenario_dir("s2").exists());
        assert!(project.load_scenarios().unwrap().is_empty());

        cleanup(&dir);
    }

    #[test]
    fn script_filename_validation() {
        let (project, dir) = temp_project();
        assert!(project.load_script("s1", "../escape.md").is_err());
        assert!(project.load_script("s1", "a/b.md").is_err());
        assert!(project.load_script("s1", "not-md.txt").is_err());
        cleanup(&dir);
    }
}
