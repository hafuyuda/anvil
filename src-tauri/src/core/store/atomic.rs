use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// 原子写：先写同目录的临时文件，fsync，再 rename 覆盖目标。
///
/// 三步缺一不可：
///
/// 1. **fsync 临时文件** —— 数据块真正落盘。少了它，rename 之后文件名
///    指向的可能还是一堆没写下去的块。
/// 2. **rename** —— 同文件系统内的原子替换。读者要么看到旧文件，
///    要么看到新文件，不会看到半截。
/// 3. **fsync 父目录** —— rename 改的是目录项，目录项本身也要落盘。
///    少了它，断电后可能变成「数据在新 inode 里，目录却还指向旧的」，
///    甚至整个文件消失。这一步只在 unix 上做：Windows 的 NTFS 自带日志，
///    目录项更新由日志覆盖，且没有便宜的便携接口去 fsync 目录句柄
///    （需要 `FILE_FLAG_BACKUP_SEMANTICS` + 原生调用，为它引一个 crate 不值当）。
///
/// 临时文件与被写文件同目录，否则 rename 会跨文件系统而失败。
pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let tmp = tmp_path(path);
    // 写失败时把临时文件收掉。别在 cards/ 里留一个 `<uuid>.tmp` ——
    // 那儿有加载器是按 file_stem 收文件名的，残留会被当成一张卡。
    let mut guard = TmpGuard::new(&tmp);

    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    guard.disarm();

    sync_parent_dir(path)?;
    Ok(())
}

/// `<name>.<ext>.tmp` 而不是 `<name>.tmp`。
/// 项目里的加载器基本按扩展名过滤，追加后缀才不会被误当成数据文件。
fn tmp_path(path: &Path) -> PathBuf {
    let mut s = path.as_os_str().to_os_string();
    s.push(".tmp");
    PathBuf::from(s)
}

struct TmpGuard<'a> {
    path: &'a Path,
    armed: bool,
}

impl<'a> TmpGuard<'a> {
    fn new(path: &'a Path) -> Self {
        Self { path, armed: true }
    }

    fn disarm(&mut self) {
        self.armed = false;
    }
}

impl Drop for TmpGuard<'_> {
    fn drop(&mut self) {
        if self.armed {
            let _ = fs::remove_file(self.path);
        }
    }
}

#[cfg(unix)]
fn sync_parent_dir(path: &Path) -> std::io::Result<()> {
    // parent() 对裸文件名返回 Some("")，空路径打不开，退到当前目录
    let dir = match path.parent() {
        Some(p) if !p.as_os_str().is_empty() => p,
        _ => Path::new("."),
    };
    // 目录以只读打开后 sync_all —— fsync 一个目录就是刷它的目录项
    let f = fs::OpenOptions::new().read(true).open(dir)?;
    f.sync_all()?;
    Ok(())
}

#[cfg(not(unix))]
fn sync_parent_dir(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!(
            "anvil_atomic_{name}_{}",
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    fn entry_names(d: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(d)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    #[test]
    fn overwrites_existing_file_and_leaves_no_tmp() {
        let d = temp_dir("overwrite");
        let path = d.join("data.json");
        fs::write(&path, b"old").unwrap();

        write_atomic(&path, b"new").unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
        assert_eq!(
            entry_names(&d),
            vec!["data.json".to_string()],
            "rename 成功后目录里只应剩下目标文件"
        );
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn tmp_suffix_keeps_the_original_extension() {
        // 项目里的加载器大多按扩展名过滤，tmp 必须是 `<name>.<ext>.tmp`
        let d = temp_dir("suffix");
        let path = d.join("events.jsonl");
        write_atomic(&path, b"{}\n").unwrap();

        assert_eq!(entry_names(&d), vec!["events.jsonl".to_string()]);
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn creates_the_file_when_it_does_not_exist() {
        let d = temp_dir("create");
        let path = d.join("brand_new.json");
        write_atomic(&path, b"hello").unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), "hello");
        assert_eq!(entry_names(&d), vec!["brand_new.json".to_string()]);
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn failed_rename_cleans_up_tmp_and_keeps_the_original() {
        let d = temp_dir("rename_fail");
        let path = d.join("data.json");
        // 把目标占位成一个非空目录：rename(文件, 非空目录) 在各平台都会失败，
        // 这是能稳定触发「rename 之后那一步出错」的办法
        fs::create_dir_all(path.join("blocker")).unwrap();
        fs::write(path.join("blocker/keep"), b"keep").unwrap();

        let result = write_atomic(&path, b"new");
        assert!(result.is_err(), "往非空目录上 rename 必须报错");

        assert!(
            !entry_names(&d).iter().any(|n| n.ends_with(".tmp")),
            "失败时不该留下 .tmp，实际留下: {:?}",
            entry_names(&d)
        );
        assert!(
            path.join("blocker/keep").exists(),
            "原有内容不能被这次失败的写破坏"
        );
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn write_into_missing_directory_reports_error() {
        let d = temp_dir("missing_dir");
        let path = d.join("nope").join("data.json");
        assert!(write_atomic(&path, b"x").is_err());
        let _ = fs::remove_dir_all(&d);
    }
}
