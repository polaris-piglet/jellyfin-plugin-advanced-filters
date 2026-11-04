# Repository Guidelines

## 结构

这是独立的 Jellyfin 网页扩展开发仓库，不是家庭运维仓库。`src/core.js` 定义筛选参数和验证，`src/ui.js` 提供界面与会话适配，`src/style.css` 限定在 Shadow DOM 内；`demo/` 只放虚构数据，`test/` 保存 Node 原生测试，`scripts/` 构建和启动本地演示。

## 开发与验证

Node.js 20+。运行 `npm test`、`npm run build`，必要时 `npm run demo` 观察界面。只监听 127.0.0.1，Ctrl+C 退出。新增筛选条件须核对 Jellyfin 官方 API，并同时增加边界与冲突测试。未经实际验证不得标记服务器版本兼容。

## 约束

使用四空格、无依赖 JavaScript；元数据仅通过 textContent 写入，禁止拼接为 HTML。查询必须使用当前登录用户并检查异步结果是否属于原会话，不使用管理员 API key。媒体读取仅限服务端元数据接口，不扫描 NAS 或下载原文件。

不自动部署、不重启远程服务、不修改已有插件。服务端 DLL 包装是后续独立步骤。文档使用中文，代码标识使用英文。只提交源代码、测试和脱敏文档，不提交凭据或真实媒体样本。

## Git

提交前检查 diff、状态和 `git diff --check`；提交标题说明具体动作。不自动添加 GitHub remote 或推送，公开发布前完成权限隔离与目标版本验收。
