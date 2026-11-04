# Jellyfin Library Filter

轻量的 Jellyfin Web 高级组合筛选扩展。中文优先，使用现有媒体元数据，不刮削、不移动文件、不创建合集。

**状态：0.1.0-alpha.1，本地开发版。** 已有可构建代码、离线演示与自动测试；未连接真实 Jellyfin 验收，不宣称兼容全部版本或客户端。这不是已经发布的服务端 DLL 插件。

## 功能

- 独立“高级筛选”入口，媒体库、人物（姓名或 ID）、标签、类型、年份、工作室、分级。
- 收藏、已播放、缺失集、未播出；字幕、语言、HD/4K/3D、视频载体、画面尺寸。
- 评分、日期范围、元数据完整性、排序、分页。
- 不同字段组合查询；分类字段第一版单选，避免含糊的 AND/OR 多选承诺。语言字段支持逗号列表，语义由服务器定义。
- 手动载入当前媒体库的候选项，最多 10,000 条元数据，达到上限明确显示不完整；结果查询本身不受此上限约束。

## 本地开发

需要 Node.js 20+，无第三方 npm 依赖。

```sh
npm test
npm run build
npm run demo
```

打开 http://127.0.0.1:18763，点击右下角“高级筛选”；Ctrl+C 停止。演示只有虚构数据，部分条件仅展示参数，不能代替真机验收。

## 接入方式（尚待验收）

构建产物 `dist/library-filter.js` 是可注入 Jellyfin Web 的自包含脚本。后续通过已审核的 JavaScript Injector 或专用服务端包装加载；本仓库没有自动改写 Jellyfin index.html、Docker 或安装任何依赖。请勿直接把 JS 文件放进服务端 plugins 目录，那不会加载。

依赖已登录网页提供 `window.ApiClient` 的 `getCurrentUserId`、`getUserViews`、`getItems`，图片使用 `getImageUrl`。不兼容时显示错误，不尝试读取浏览器存储或提取凭据。**Jellyfin 12.4 实机接口、网页登录全流程、普通账号隔离仍待验证。** 原生电视和手机客户端不自动获得网页入口。

撤销网页注入并刷新即可移除；没有媒体/数据库变更需要回退。

## 开源与协作

MIT 许可证；没有配置 GitHub remote，没有发布。参见 [开发规则](AGENTS.md)、[设计与范围](docs/design.md)、[验收清单](docs/acceptance.md)、[安全说明](SECURITY.md)。提交前运行 `npm test`、`npm run build`、`git diff --check`。不要提交服务器地址、凭据、真实媒体名单或截图。
