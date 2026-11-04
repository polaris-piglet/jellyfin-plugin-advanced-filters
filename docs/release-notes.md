# Advanced Filters 0.1 — experimental

首次原生插件封装，使用 .NET 10 / Jellyfin 12.2 API 构建。不是全部客户端或全部筛选语义的兼容保证。

- 元数据高级组合筛选、服务端分页、手动读取候选。
- DLL 内嵌网页代码，在内存中处理网页响应，不修改服务器 index.html。
- 无遥测、无独立容器、不扫描媒体、不写入 NAS。
- 仅使用当前网页登录用户的 API 权限，不需要管理员 API key。

仓库地址：
`https://github.com/polaris-piglet/jellyfin-plugin-advanced-filters/releases/latest/download/manifest.json`

安装后空闲时重启 Jellyfin，刷新网页，右下角打开“高级筛选”。安装验证与权限隔离进展见仓库验收文档。原生手机客户端不包含此网页入口。
