mod security;

use chrono::Local;
use security::{safe_content_join, safe_join, safe_project_name};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
    time::SystemTime,
};
use tauri::{WebviewUrl, WebviewWindowBuilder};

static WINDOW_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LearningProject {
    #[serde(default = "schema_version")]
    schema_version: u32,
    path: String,
    name: String,
    description: Option<String>,
    created_at: String,
    status: String,
    target_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectInput {
    name: String,
    path: String,
    description: Option<String>,
    target_date: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiskDocument {
    path: String,
    content: String,
    modified_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeedbackDocument {
    path: String,
    created_at: String,
    title: Option<String>,
    requests_adjustment: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectFile {
    name: String,
    path: String,
    kind: String,
    extension: Option<String>,
    modified_at: Option<String>,
    children: Option<Vec<ProjectFile>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitCommit {
    hash: String,
    message: String,
    author: String,
    timestamp: String,
    kind: String,
    related_feedback_path: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct GitChangedFile {
    path: String,
    status: String,
    old_path: Option<String>,
}

fn timestamp(meta: &fs::Metadata) -> String {
    meta.modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string()
}
fn schema_version() -> u32 {
    1
}
fn config_path(root: &Path) -> PathBuf {
    root.join(".learning-machine").join("project.json")
}
fn project_template(name: &str) -> String {
    format!("# {name}\n")
}

fn read_project_from(root: &Path) -> Result<LearningProject, String> {
    let mut project: LearningProject = serde_json::from_str(
        &fs::read_to_string(config_path(root)).map_err(|e| format!("PROJECT_NOT_FOUND: {e}"))?,
    )
    .map_err(|e| format!("CONFIG_INVALID: {e}"))?;
    project.path = root.to_string_lossy().to_string();
    Ok(project)
}

fn run_git(root: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|_| "GIT_UNAVAILABLE: Git was not found".to_string())?;
    if !output.status.success() {
        return Err(format!(
            "GIT_FAILED: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn validate_git_hash(hash: &str) -> Result<&str, String> {
    if (7..=64).contains(&hash.len()) && hash.chars().all(|character| character.is_ascii_hexdigit())
    {
        Ok(hash)
    } else {
        Err("INVALID_GIT_HASH: commit hash is not valid".into())
    }
}

fn validate_feedback_relative_path(path: &str) -> Result<&str, String> {
    let candidate = Path::new(path);
    let parts: Vec<_> = candidate.components().collect();
    let valid = !candidate.is_absolute()
        && parts.len() == 2
        && parts[0].as_os_str() == "feedback"
        && candidate.extension().and_then(|value| value.to_str()) == Some("md")
        && candidate
            .file_stem()
            .and_then(|value| value.to_str())
            .is_some_and(|value| !value.is_empty());
    if valid {
        Ok(path)
    } else {
        Err("INVALID_FEEDBACK_PATH: expected feedback/<name>.md".into())
    }
}

#[tauri::command]
fn delete_feedback(project_root: String, relative_path: String) -> Result<(), String> {
    let feedback_path = validate_feedback_relative_path(&relative_path)?;
    let path = safe_join(Path::new(&project_root), feedback_path)?;
    if !path.is_file() {
        return Err("FEEDBACK_NOT_FOUND: feedback file does not exist".into());
    }
    fs::remove_file(path).map_err(|error| format!("DELETE_FAILED: {error}"))
}

fn related_feedback_from_body(body: &str) -> Option<String> {
    body.lines().find_map(|line| {
        let path = line.strip_prefix("Learning-Machine-Feedback: ")?.trim();
        validate_feedback_relative_path(path).ok().map(String::from)
    })
}

fn parse_changed_files(raw: &str) -> Vec<GitChangedFile> {
    raw.lines()
        .filter_map(|line| {
            let mut parts = line.split('\t');
            let marker = parts.next()?;
            let first_path = parts.next()?.to_string();
            let status = match marker.chars().next()? {
                'A' => "added",
                'M' => "modified",
                'D' => "deleted",
                'R' => "renamed",
                _ => return None,
            };
            if status == "renamed" {
                let path = parts.next()?.to_string();
                Some(GitChangedFile {
                    path,
                    status: status.into(),
                    old_path: Some(first_path),
                })
            } else {
                Some(GitChangedFile {
                    path: first_path,
                    status: status.into(),
                    old_path: None,
                })
            }
        })
        .collect()
}

fn next_window_label() -> String {
    format!("project-{}", WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed))
}

#[tauri::command]
fn create_project(input: CreateProjectInput) -> Result<LearningProject, String> {
    let name = safe_project_name(&input.name)?.to_string();
    let root = Path::new(&input.path).join(&name);
    if root.exists()
        && root
            .read_dir()
            .map_err(|e| format!("PERMISSION_DENIED: {e}"))?
            .next()
            .is_some()
    {
        return Err("NAME_CONFLICT: target directory is not empty".into());
    }
    fs::create_dir_all(&root).map_err(|e| format!("CREATE_FAILED: {e}"))?;
    for dir in [
        "feedback",
        "materials",
        "notes",
        "archive",
        ".learning-machine",
    ] {
        fs::create_dir_all(root.join(dir)).map_err(|e| format!("CREATE_FAILED: {e}"))?;
    }
    let document = root.join("project.md");
    if document.exists() {
        return Err("NAME_CONFLICT: project.md already exists".into());
    }
    fs::write(document, project_template(&name)).map_err(|e| format!("WRITE_FAILED: {e}"))?;
    let project = LearningProject {
        schema_version: 1,
        path: root.to_string_lossy().to_string(),
        name,
        description: input.description,
        created_at: Local::now().to_rfc3339(),
        status: "active".into(),
        target_date: input.target_date,
    };
    fs::write(
        config_path(&root),
        serde_json::to_string_pretty(&project).unwrap(),
    )
    .map_err(|e| format!("WRITE_FAILED: {e}"))?;
    if run_git(&root, &["init"]).is_ok() {
        let _ = run_git(&root, &["add", "."]);
        let _ = run_git(
            &root,
            &[
                "-c",
                "user.name=Learning Machine",
                "-c",
                "user.email=local@learning.machine",
                "commit",
                "-m",
                "chore: initialize learning project",
            ],
        );
    }
    Ok(project)
}

#[tauri::command]
fn read_project(path: String) -> Result<LearningProject, String> {
    read_project_from(Path::new(&path))
}

#[tauri::command]
fn initialize_existing_project(path: String) -> Result<LearningProject, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err("PROJECT_NOT_FOUND: selected folder does not exist".into());
    }
    if config_path(root).exists() {
        return read_project_from(root);
    }
    let name = root
        .file_name()
        .and_then(|part| part.to_str())
        .ok_or("INVALID_NAME: folder has no name")?
        .to_string();
    safe_project_name(&name)?;
    for dir in [
        "feedback",
        "materials",
        "notes",
        "archive",
        ".learning-machine",
    ] {
        fs::create_dir_all(root.join(dir)).map_err(|e| format!("CREATE_FAILED: {e}"))?;
    }
    if !root.join("project.md").exists() {
        fs::write(root.join("project.md"), project_template(&name))
            .map_err(|e| format!("WRITE_FAILED: {e}"))?;
    }
    let project = LearningProject {
        schema_version: 1,
        path: path.clone(),
        name,
        description: None,
        created_at: Local::now().to_rfc3339(),
        status: "active".into(),
        target_date: None,
    };
    fs::write(
        config_path(root),
        serde_json::to_string_pretty(&project).unwrap(),
    )
    .map_err(|e| format!("WRITE_FAILED: {e}"))?;
    if run_git(root, &["init"]).is_ok() {
        let _ = run_git(root, &["add", "."]);
        let _ = run_git(
            root,
            &[
                "-c",
                "user.name=Learning Machine",
                "-c",
                "user.email=local@learning.machine",
                "commit",
                "-m",
                "chore: initialize learning project",
            ],
        );
    }
    Ok(project)
}

#[tauri::command]
fn read_document(project_root: String, relative_path: String) -> Result<DiskDocument, String> {
    let path = safe_join(Path::new(&project_root), &relative_path)?;
    let meta = fs::metadata(&path).map_err(|e| format!("READ_FAILED: {e}"))?;
    Ok(DiskDocument {
        path: relative_path,
        content: fs::read_to_string(&path).map_err(|e| format!("READ_FAILED: {e}"))?,
        modified_at: timestamp(&meta),
    })
}

#[tauri::command]
fn read_binary_document(
    project_root: String,
    relative_path: String,
) -> Result<tauri::ipc::Response, String> {
    let path = safe_content_join(Path::new(&project_root), &relative_path)?;
    if path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("pdf"))
        != Some(true)
    {
        return Err("UNSUPPORTED_PREVIEW: only PDF binary preview is supported".into());
    }
    let bytes = fs::read(path).map_err(|error| format!("READ_FAILED: {error}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
fn write_document(
    project_root: String,
    relative_path: String,
    content: String,
    expected_modified_at: Option<String>,
) -> Result<DiskDocument, String> {
    let path = safe_join(Path::new(&project_root), &relative_path)?;
    if let (Some(expected), Ok(meta)) = (&expected_modified_at, fs::metadata(&path)) {
        if &timestamp(&meta) != expected {
            return Err("EXTERNAL_MODIFICATION: file changed on disk".into());
        }
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("WRITE_FAILED: {e}"))?;
    }
    fs::write(&path, content).map_err(|e| format!("WRITE_FAILED: {e}"))?;
    read_document(project_root, relative_path)
}

#[tauri::command]
fn create_feedback(project_root: String, content: String) -> Result<DiskDocument, String> {
    let date = Local::now().format("%Y-%m-%d").to_string();
    let root = Path::new(&project_root);
    let mut index = 1;
    let relative = loop {
        let value = format!("feedback/{date}-{index:02}.md");
        if !safe_join(root, &value)?.exists() {
            break value;
        }
        index += 1;
    };
    write_document(project_root, relative, content, None)
}

#[tauri::command]
fn list_feedback(project_root: String) -> Result<Vec<FeedbackDocument>, String> {
    let dir = safe_join(Path::new(&project_root), "feedback")?;
    let mut result = vec![];
    for entry in fs::read_dir(dir).map_err(|e| format!("READ_FAILED: {e}"))? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|x| x.to_str()) != Some("md") {
            continue;
        }
        let content = fs::read_to_string(entry.path()).unwrap_or_default();
        let name = entry.file_name().to_string_lossy().to_string();
        result.push(FeedbackDocument {
            path: format!("feedback/{name}"),
            created_at: entry.metadata().map(|m| timestamp(&m)).unwrap_or_default(),
            title: content
                .lines()
                .find_map(|l| l.strip_prefix("# "))
                .map(String::from),
            requests_adjustment: content.contains("[x] 需要") || content.contains("[X] 需要"),
        });
    }
    sort_feedback_documents(&mut result);
    Ok(result)
}

fn sort_feedback_documents(feedback: &mut [FeedbackDocument]) {
    feedback.sort_by(|a, b| {
        let a_time = a.created_at.parse::<u128>().unwrap_or(0);
        let b_time = b.created_at.parse::<u128>().unwrap_or(0);
        b_time.cmp(&a_time).then_with(|| a.path.cmp(&b.path))
    });
}

fn build_tree(root: &Path, dir: &Path, relative: &str) -> Result<Vec<ProjectFile>, String> {
    let mut items = vec![];
    for entry in fs::read_dir(dir).map_err(|e| format!("READ_FAILED: {e}"))? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let rel = if relative.is_empty() {
            name.clone()
        } else {
            format!("{relative}/{name}")
        };
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = meta.is_dir();
        items.push(ProjectFile {
            name,
            path: rel.clone(),
            kind: if is_dir { "directory" } else { "file" }.into(),
            extension: entry
                .path()
                .extension()
                .and_then(|x| x.to_str())
                .map(String::from),
            modified_at: Some(timestamp(&meta)),
            children: if is_dir {
                Some(build_tree(root, &entry.path(), &rel)?)
            } else {
                None
            },
        });
    }
    items.sort_by(|a, b| a.kind.cmp(&b.kind).then(a.name.cmp(&b.name)));
    Ok(items)
}

#[tauri::command]
fn list_project_files(project_root: String) -> Result<Vec<ProjectFile>, String> {
    let root = Path::new(&project_root);
    let mut all = vec![];
    for section in ["materials", "notes"] {
        let dir = safe_join(root, section)?;
        all.push(ProjectFile {
            name: section.into(),
            path: section.into(),
            kind: "directory".into(),
            extension: None,
            modified_at: None,
            children: Some(build_tree(root, &dir, section)?),
        });
    }
    Ok(all)
}
#[tauri::command]
fn create_entry(project_root: String, relative_path: String, kind: String) -> Result<(), String> {
    let path = safe_content_join(Path::new(&project_root), &relative_path)?;
    if path.exists() {
        return Err("NAME_CONFLICT: entry already exists".into());
    }
    if kind == "directory" {
        fs::create_dir(&path)
    } else {
        fs::write(&path, "").map(|_| ())
    }
    .map_err(|e| format!("CREATE_FAILED: {e}"))
}
#[tauri::command]
fn rename_entry(
    project_root: String,
    relative_path: String,
    new_name: String,
) -> Result<(), String> {
    safe_project_name(&new_name)?;
    let source = safe_content_join(Path::new(&project_root), &relative_path)?;
    if matches!(relative_path.as_str(), "materials" | "notes") {
        return Err("PROTECTED_PATH: core content directory".into());
    }
    let target = source.parent().ok_or("INVALID_PATH")?.join(new_name);
    if target.exists() {
        return Err("NAME_CONFLICT: target exists".into());
    }
    fs::rename(source, target).map_err(|e| format!("RENAME_FAILED: {e}"))
}
#[tauri::command]
fn move_entry(
    project_root: String,
    source_relative_path: String,
    destination_directory: String,
) -> Result<String, String> {
    if matches!(source_relative_path.as_str(), "materials" | "notes") {
        return Err("PROTECTED_PATH: core content directory".into());
    }
    if destination_directory == source_relative_path
        || destination_directory.starts_with(&format!("{source_relative_path}/"))
    {
        return Err("INVALID_MOVE: cannot move a folder into itself".into());
    }
    let root = Path::new(&project_root);
    let source = safe_content_join(root, &source_relative_path)?;
    let destination = safe_content_join(root, &destination_directory)?;
    if !source.exists() {
        return Err("READ_FAILED: source does not exist".into());
    }
    if !destination.is_dir() {
        return Err("INVALID_PATH: destination is not a directory".into());
    }
    if source.parent() == Some(destination.as_path()) {
        return Err("MOVE_NOOP: item is already in this folder".into());
    }
    let name = source
        .file_name()
        .ok_or("INVALID_PATH: source has no name")?;
    let target = destination.join(name);
    if target.exists() {
        return Err("NAME_CONFLICT: target already exists".into());
    }
    fs::rename(&source, &target).map_err(|error| format!("MOVE_FAILED: {error}"))?;
    Ok(format!(
        "{destination_directory}/{}",
        name.to_string_lossy()
    ))
}
#[tauri::command]
fn delete_entry(project_root: String, relative_path: String) -> Result<(), String> {
    let path = safe_content_join(Path::new(&project_root), &relative_path)?;
    if matches!(relative_path.as_str(), "materials" | "notes") {
        return Err("PROTECTED_PATH: core content directory".into());
    }
    if path.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
    .map_err(|e| format!("DELETE_FAILED: {e}"))
}
#[tauri::command]
fn import_file(
    project_root: String,
    source_path: String,
    destination_directory: String,
) -> Result<(), String> {
    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err("INVALID_SOURCE: selected item is not a file".into());
    }
    let name = source
        .file_name()
        .ok_or("INVALID_SOURCE: missing file name")?
        .to_string_lossy();
    let directory = safe_content_join(Path::new(&project_root), &destination_directory)?;
    if !directory.is_dir() {
        return Err("INVALID_PATH: destination is not a directory".into());
    }
    let target = directory.join(name.as_ref());
    if target.exists() {
        return Err("NAME_CONFLICT: imported file already exists".into());
    }
    fs::copy(source, target)
        .map(|_| ())
        .map_err(|e| format!("IMPORT_FAILED: {e}"))
}

#[tauri::command]
fn import_markdown_template(
    project_root: String,
    source_path: String,
) -> Result<DiskDocument, String> {
    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err("INVALID_SOURCE: selected template does not exist".into());
    }
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("md") && !extension.eq_ignore_ascii_case("markdown") {
        return Err(
            "MARKDOWN_TEMPLATE_REQUIRED:请选择 Markdown（.md 或 .markdown）模板文件".into(),
        );
    }
    let content =
        fs::read_to_string(source).map_err(|error| format!("TEMPLATE_READ_FAILED: {error}"))?;
    let root = Path::new(&project_root);
    let directory = safe_content_join(root, "materials/templates")?;
    fs::create_dir_all(&directory).map_err(|error| format!("IMPORT_FAILED: {error}"))?;
    let stem = source
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or("INVALID_SOURCE: template has no file name")?;
    let mut index = 1;
    let (target, relative_path) = loop {
        let file_name = if index == 1 {
            format!("{stem}.{extension}")
        } else {
            format!("{stem}-{index}.{extension}")
        };
        let target = directory.join(&file_name);
        if !target.exists() {
            break (target, format!("materials/templates/{file_name}"));
        }
        index += 1;
    };
    fs::copy(source, &target).map_err(|error| format!("IMPORT_FAILED: {error}"))?;
    let meta = fs::metadata(&target).map_err(|error| format!("IMPORT_FAILED: {error}"))?;
    Ok(DiskDocument {
        path: relative_path,
        content,
        modified_at: timestamp(&meta),
    })
}
#[tauri::command]
fn reveal_entry(
    app: tauri::AppHandle,
    project_root: String,
    relative_path: String,
) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let path = safe_join(Path::new(&project_root), &relative_path)?;
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn git_history(project_root: String) -> Result<Vec<GitCommit>, String> {
    let raw = run_git(
        Path::new(&project_root),
        &[
            "log",
            "--pretty=format:%H%x1f%an%x1f%aI%x1f%s%x1f%b%x1e",
            "--",
            "project.md",
        ],
    )?;
    let mut commits = vec![];
    for record in raw.split('\u{1e}').filter(|s| !s.trim().is_empty()) {
        let parts: Vec<_> = record
            .trim_matches(['\r', '\n'])
            .splitn(5, '\u{1f}')
            .collect();
        if parts.len() == 5 {
            let msg = parts[3].to_string();
            let kind = if msg.starts_with("plan:") {
                "project"
            } else if msg.starts_with("feedback:") {
                "feedback"
            } else {
                "system"
            };
            commits.push(GitCommit {
                hash: parts[0].into(),
                author: parts[1].into(),
                timestamp: parts[2].into(),
                message: msg,
                kind: kind.into(),
                related_feedback_path: related_feedback_from_body(parts[4]),
            });
        }
    }
    Ok(commits)
}
#[tauri::command]
fn git_commit_files(project_root: String, hash: String) -> Result<Vec<GitChangedFile>, String> {
    let hash = validate_git_hash(&hash)?;
    let raw = run_git(
        Path::new(&project_root),
        &[
            "diff-tree",
            "--root",
            "--no-commit-id",
            "--name-status",
            "-r",
            "-M",
            hash,
        ],
    )?;
    Ok(parse_changed_files(&raw))
}

#[tauri::command]
fn git_file_diff(
    project_root: String,
    hash: String,
    relative_path: String,
) -> Result<String, String> {
    let hash = validate_git_hash(&hash)?;
    safe_join(Path::new(&project_root), &relative_path)?;
    run_git(
        Path::new(&project_root),
        &[
            "show",
            "--format=",
            "--find-renames",
            "--unified=3",
            hash,
            "--",
            &relative_path,
        ],
    )
}

#[tauri::command]
async fn open_project_window(app: tauri::AppHandle) -> Result<(), String> {
    WebviewWindowBuilder::new(
        &app,
        next_window_label(),
        WebviewUrl::App("index.html".into()),
    )
    .title("Learning Machine · 选择项目")
    .inner_size(1180.0, 780.0)
    .min_inner_size(1000.0, 680.0)
    .disable_drag_drop_handler()
    .center()
    .build()
    .map(|_| ())
    .map_err(|error| format!("WINDOW_OPEN_FAILED: {error}"))
}
#[tauri::command]
fn git_commit(project_root: String, message: String) -> Result<(), String> {
    let root = Path::new(&project_root);
    run_git(
        root,
        &[
            "add",
            "project.md",
            "feedback",
            ".learning-machine/project.json",
        ],
    )?;
    run_git(root, &["commit", "-m", &message])?;
    Ok(())
}

#[tauri::command]
fn git_commit_project_version(
    project_root: String,
    summary: String,
    feedback_relative_path: String,
) -> Result<(), String> {
    let summary = summary.trim();
    if summary.is_empty() || summary.contains(['\r', '\n']) {
        return Err("INVALID_VERSION_SUMMARY: enter a single-line summary".into());
    }
    let feedback_path = validate_feedback_relative_path(&feedback_relative_path)?;
    let root = Path::new(&project_root);
    if !safe_join(root, feedback_path)?.is_file() {
        return Err("INVALID_FEEDBACK_PATH: feedback file does not exist".into());
    }
    let subject = format!("plan: {summary}");
    let trailer = format!("Learning-Machine-Feedback: {feedback_path}");
    run_git(root, &["add", "project.md"])?;
    run_git(
        root,
        &[
            "-c",
            "user.name=Learning Machine",
            "-c",
            "user.email=local@learning.machine",
            "commit",
            "-m",
            &subject,
            "-m",
            &trailer,
        ],
    )?;
    Ok(())
}

#[tauri::command]
fn archive_project(project_root: String) -> Result<LearningProject, String> {
    let root = Path::new(&project_root);
    let mut project = read_project_from(root)?;
    project.status = "archived".into();
    fs::write(
        config_path(root),
        serde_json::to_string_pretty(&project).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
fn reveal_project(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            create_project,
            read_project,
            initialize_existing_project,
            read_document,
            read_binary_document,
            write_document,
            create_feedback,
            delete_feedback,
            import_markdown_template,
            list_feedback,
            list_project_files,
            create_entry,
            rename_entry,
            move_entry,
            delete_entry,
            import_file,
            reveal_entry,
            git_history,
            git_commit_files,
            git_file_diff,
            open_project_window,
            git_commit,
            git_commit_project_version,
            archive_project,
            reveal_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running Learning Machine");
}

#[cfg(test)]
mod tests {
    use super::{
        create_entry, delete_feedback, git_commit_project_version, git_history,
        import_markdown_template, next_window_label, parse_changed_files, project_template,
        read_binary_document, run_git, sort_feedback_documents, validate_feedback_relative_path,
        validate_git_hash, FeedbackDocument,
    };
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

    #[test]
    fn validates_git_hashes_before_passing_them_to_git() {
        assert!(validate_git_hash("a1b2c3d").is_ok());
        assert!(validate_git_hash("0123456789abcdef0123456789abcdef01234567").is_ok());
        assert!(validate_git_hash("--help").is_err());
        assert!(validate_git_hash("abc123;echo").is_err());
    }

    #[test]
    fn parses_changed_files_including_renames() {
        let files = parse_changed_files(
            "A\tfeedback/2026-08-30-01.md\nM\tproject.md\nD\tnotes/old.md\nR100\tnotes/before.md\tnotes/after.md\n",
        );

        assert_eq!(files.len(), 4);
        assert_eq!(files[0].status, "added");
        assert_eq!(files[1].status, "modified");
        assert_eq!(files[2].status, "deleted");
        assert_eq!(files[3].status, "renamed");
        assert_eq!(files[3].old_path.as_deref(), Some("notes/before.md"));
        assert_eq!(files[3].path, "notes/after.md");
    }

    #[test]
    fn creates_a_unique_label_for_each_project_window() {
        let first = next_window_label();
        let second = next_window_label();
        assert!(first.starts_with("project-"));
        assert_ne!(first, second);
    }

    #[test]
    fn project_history_excludes_feedback_only_commits() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-history-{suffix}"));
        fs::create_dir_all(root.join("feedback")).unwrap();
        run_git(&root, &["init"]).unwrap();
        fs::write(root.join("project.md"), "# 初始项目书\n").unwrap();
        run_git(&root, &["add", "project.md"]).unwrap();
        run_git(
            &root,
            &[
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.com",
                "commit",
                "-m",
                "plan: initial project document",
            ],
        )
        .unwrap();
        fs::write(root.join("feedback/one.md"), "# 本次反馈\n").unwrap();
        run_git(&root, &["add", "feedback/one.md"]).unwrap();
        run_git(
            &root,
            &[
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.com",
                "commit",
                "-m",
                "feedback: add one",
            ],
        )
        .unwrap();

        let commits = git_history(root.to_string_lossy().to_string()).unwrap();

        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "plan: initial project document");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn validates_feedback_paths_before_storing_them_in_git_history() {
        assert_eq!(
            validate_feedback_relative_path("feedback/2026-09-28-01.md").unwrap(),
            "feedback/2026-09-28-01.md"
        );
        assert!(validate_feedback_relative_path("feedback/nested/review.md").is_err());
        assert!(validate_feedback_relative_path("notes/review.md").is_err());
        assert!(validate_feedback_relative_path("../feedback/review.md").is_err());
        assert!(validate_feedback_relative_path("C:\\feedback\\review.md").is_err());
        assert!(validate_feedback_relative_path("feedback/review.txt").is_err());
    }

    #[test]
    fn deletes_only_feedback_markdown_files() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-delete-feedback-{suffix}"));
        fs::create_dir_all(root.join("feedback/nested")).unwrap();
        fs::create_dir_all(root.join("notes")).unwrap();
        fs::write(root.join("feedback/review.md"), "# 阶段复盘\n").unwrap();
        fs::write(root.join("feedback/review.txt"), "not markdown").unwrap();
        fs::write(root.join("feedback/nested/review.md"), "# nested\n").unwrap();
        fs::write(root.join("notes/review.md"), "# notes\n").unwrap();

        delete_feedback(
            root.to_string_lossy().to_string(),
            "feedback/review.md".into(),
        )
        .unwrap();

        assert!(!root.join("feedback/review.md").exists());
        assert!(delete_feedback(
            root.to_string_lossy().to_string(),
            "feedback/review.txt".into()
        )
        .is_err());
        assert!(delete_feedback(
            root.to_string_lossy().to_string(),
            "feedback/nested/review.md".into()
        )
        .is_err());
        assert!(
            delete_feedback(root.to_string_lossy().to_string(), "notes/review.md".into()).is_err()
        );
        assert!(root.join("feedback/review.txt").exists());
        assert!(root.join("feedback/nested/review.md").exists());
        assert!(root.join("notes/review.md").exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn imports_markdown_templates_without_overwriting_same_named_files() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-template-project-{suffix}"));
        let source_dir =
            std::env::temp_dir().join(format!("learning-machine-template-source-{suffix}"));
        fs::create_dir_all(root.join("materials")).unwrap();
        fs::create_dir_all(&source_dir).unwrap();
        let source = source_dir.join("复盘模板.md");
        fs::write(&source, "# 本地复盘模板\n\n## 观察\n").unwrap();

        let first = import_markdown_template(
            root.to_string_lossy().to_string(),
            source.to_string_lossy().to_string(),
        )
        .unwrap();
        let second = import_markdown_template(
            root.to_string_lossy().to_string(),
            source.to_string_lossy().to_string(),
        )
        .unwrap();

        assert_eq!(first.path, "materials/templates/复盘模板.md");
        assert_eq!(second.path, "materials/templates/复盘模板-2.md");
        assert_eq!(first.content, "# 本地复盘模板\n\n## 观察\n");
        assert!(root.join("materials/templates/复盘模板.md").is_file());
        assert!(root.join("materials/templates/复盘模板-2.md").is_file());
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(source_dir);
    }

    #[test]
    fn rejects_non_markdown_templates_and_starts_projects_with_only_the_title() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-template-format-{suffix}"));
        fs::create_dir_all(root.join("materials")).unwrap();
        let source = root.join("template.txt");
        fs::write(&source, "not markdown").unwrap();

        let result = import_markdown_template(
            root.to_string_lossy().to_string(),
            source.to_string_lossy().to_string(),
        );

        assert!(result.unwrap_err().contains("MARKDOWN_TEMPLATE_REQUIRED"));
        assert_eq!(project_template("我的学习项目"), "# 我的学习项目\n");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn sorts_feedback_by_modified_time_newest_first_with_a_stable_path_tiebreaker() {
        let mut feedback = vec![
            FeedbackDocument {
                path: "feedback/older.md".into(),
                created_at: "100".into(),
                title: None,
                requests_adjustment: false,
            },
            FeedbackDocument {
                path: "feedback/b.md".into(),
                created_at: "200".into(),
                title: None,
                requests_adjustment: false,
            },
            FeedbackDocument {
                path: "feedback/a.md".into(),
                created_at: "200".into(),
                title: None,
                requests_adjustment: false,
            },
        ];

        sort_feedback_documents(&mut feedback);

        assert_eq!(
            feedback
                .into_iter()
                .map(|item| item.path)
                .collect::<Vec<_>>(),
            vec!["feedback/a.md", "feedback/b.md", "feedback/older.md"]
        );
    }

    #[test]
    fn project_version_commit_keeps_its_related_feedback_in_history() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-related-feedback-{suffix}"));
        fs::create_dir_all(root.join("feedback")).unwrap();
        run_git(&root, &["init"]).unwrap();
        fs::write(root.join("project.md"), "# 初始项目书\n").unwrap();
        fs::write(root.join("feedback/2026-09-28-01.md"), "# 阶段复盘\n").unwrap();
        run_git(&root, &["add", "."]).unwrap();
        run_git(
            &root,
            &[
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.com",
                "commit",
                "-m",
                "chore: initial state",
            ],
        )
        .unwrap();
        fs::write(root.join("project.md"), "# 调整后的项目书\n").unwrap();

        git_commit_project_version(
            root.to_string_lossy().to_string(),
            "缩小下一阶段范围".into(),
            "feedback/2026-09-28-01.md".into(),
        )
        .unwrap();
        let commits = git_history(root.to_string_lossy().to_string()).unwrap();

        assert_eq!(commits[0].message, "plan: 缩小下一阶段范围");
        assert_eq!(
            commits[0].related_feedback_path.as_deref(),
            Some("feedback/2026-09-28-01.md")
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn project_version_commit_rejects_an_empty_summary() {
        let result =
            git_commit_project_version("unused".into(), "   ".into(), "feedback/review.md".into());
        assert!(result.unwrap_err().contains("INVALID_VERSION_SUMMARY"));
    }

    #[test]
    fn create_entry_rejects_paths_outside_materials_and_notes() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-content-scope-{suffix}"));
        fs::create_dir_all(root.join("feedback")).unwrap();

        let result = create_entry(
            root.to_string_lossy().to_string(),
            "feedback/not-allowed.md".into(),
            "file".into(),
        );

        assert!(result.is_err());
        assert!(!root.join("feedback/not-allowed.md").exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn reads_pdf_as_raw_binary_response() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("learning-machine-pdf-{suffix}"));
        fs::create_dir_all(root.join("materials")).unwrap();
        fs::write(root.join("materials/guide.pdf"), b"%PDF-1.7").unwrap();

        let response = read_binary_document(
            root.to_string_lossy().to_string(),
            "materials/guide.pdf".into(),
        )
        .unwrap();
        let body = response.body().unwrap();

        assert!(matches!(body, InvokeResponseBody::Raw(bytes) if bytes == b"%PDF-1.7"));
        let _ = fs::remove_dir_all(root);
    }
}
