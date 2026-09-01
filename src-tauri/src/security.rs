use std::path::{Component, Path, PathBuf};

pub fn safe_join(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute() || relative_path.components().any(|part| matches!(part, Component::ParentDir | Component::Prefix(_) | Component::RootDir)) {
        return Err("INVALID_PATH: path must stay inside the project".into());
    }
    let joined = root.join(relative_path);
    if root.exists() {
        let canonical_root = root.canonicalize().map_err(|e| format!("INVALID_PROJECT_ROOT: {e}"))?;
        let boundary = if joined.exists() {
            joined.canonicalize().map_err(|e| format!("INVALID_PATH: {e}"))?
        } else {
            joined.parent().ok_or_else(|| "INVALID_PATH: missing parent".to_string())?.canonicalize().map_err(|e| format!("INVALID_PATH: parent does not exist: {e}"))?
        };
        if !boundary.starts_with(&canonical_root) { return Err("INVALID_PATH: symlink escapes the project".into()); }
    }
    Ok(joined)
}

pub fn safe_content_join(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let first = Path::new(relative).components().next();
    if !matches!(first, Some(Component::Normal(value)) if value == "materials" || value == "notes") {
        return Err("CONTENT_PATH_REQUIRED: path must stay inside materials or notes".into());
    }
    safe_join(root, relative)
}

pub fn safe_project_name(name: &str) -> Result<&str, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.contains(['/', '\\']) || matches!(trimmed, "." | "..") {
        return Err("INVALID_NAME: project name is not valid".into());
    }
    Ok(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_parent_directory_escape() { assert!(safe_join(Path::new("C:/project"), "../secret.txt").is_err()); }
    #[test]
    fn accepts_nested_project_path() { assert_eq!(safe_join(Path::new("C:/project"), "notes/math/limit.md").unwrap(), Path::new("C:/project/notes/math/limit.md")); }
    #[test]
    fn rejects_project_name_as_path() { assert!(safe_project_name("folder/name").is_err()); }
}
