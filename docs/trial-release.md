# Learning Machine 熟人试用版发布说明

## 生成 Windows 安装包

在项目根目录打开 PowerShell，执行：

```powershell
corepack pnpm bundle:windows
```

构建成功后，将下面目录中名称以 `-setup.exe` 结尾的文件发送给试用者：

```text
src-tauri\target\release\bundle\nsis\
```

不要发送 `target\release\learning-machine.exe`。NSIS 安装包会创建卸载信息和应用快捷方式，也会在需要时处理 WebView2 Runtime。

## 试用者安装条件

- 支持 Windows 10/11 64 位系统。
- 安装到当前用户目录，通常不需要管理员权限。
- 如果电脑没有 WebView2 Runtime，安装过程需要联网下载。
- 当前安装包没有商业代码签名，Windows 可能显示“未知发布者”。只应从你本人提供的渠道获取安装包。
- Git 是可选依赖。未安装 Git 时，项目书版本历史不可用，但项目、反馈、资料和笔记功能仍可使用。

## 建议一并发送给试用者的信息

1. 这是 `0.1.0` 小范围试用版，不要用于保存唯一副本的重要资料。
2. 项目内容保存在试用者自己选择的文件夹中，卸载应用不会主动删除这些项目文件。
3. 遇到问题时，请记录操作步骤、页面名称和错误提示，并尽量附带截图。
4. 升级到下一试用版前，建议先备份项目文件夹。

## 发布下一版本

发布新版本前，需要同步更新以下三个文件中的版本号：

- `package.json` 的 `version`
- `src-tauri/Cargo.toml` 的 `package.version`
- `src-tauri/tauri.conf.json` 的 `version`

例如下一版可统一更新为 `0.1.1`，然后重新执行打包命令。不要把不同内容的安装包重复使用同一个版本号。
