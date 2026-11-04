# 设计与范围

## 需求

在本地库中组合人物、标签以及 Jellyfin 原生支持的其他条件；保持原生详情和播放，不引入独立媒体索引服务。

## 调研（2026-11-04）

- [Filter Search](https://github.com/rimseg/jellyfin-filter-search)：增强现有筛选选项列表，不新增人物组合筛选。
- [Enhanced Discovery](https://n00bcodr.github.io/Jellyfin-Enhanced/seerr/seerr-features/)：TMDB/Seerr 目录发现，不等于任意本地标签查询。
- [Auto Collections](https://github.com/KeksBombe/jellyfin-plugin-auto-collections)：可用演员、标签表达式创建合集，但不是交互式筛选面板。
- 未找到直接满足当前交互需求且已经验证兼容的现成插件；不声称不存在其他实现。

## API 映射

基于 [ItemsController](https://github.com/jellyfin/jellyfin/blob/master/Jellyfin.Api/Controllers/ItemsController.cs) 的公开参数；这是上游 master 的设计依据，不等同于目标版本运行结果。实际支持的字段清单在 `src/core.js` 的 schema 中，新增参数采用白名单。

当前使用 getItems(userId, query)，人物精确 ID 与标签等条件放在同一次查询；候选从当前用户可见的媒体条目聚合，避免全局人物列表泄漏私有库名称。候选读取是显式操作，200 条一页，10,000 条封顶，无后台周期扫描。查询结果服务端分页，每页 48 条。

状态：初版提供丰富的原生字段映射，不声称全部参数已覆盖。暂未暴露内部 item IDs、相邻项、返回字段控制、节目直播专用标记；这些不是常规用户筛选入口。多演员/多标签 AND/OR/NOT、预设保存、排除条件与用户界面国际化后续实现。编码格式并非此 Items 接口通用过滤参数，不能伪造 codec 查询字段。

## 权限与开销

不使用管理员令牌，不持久保存账号、条件、媒体数据。身份或导航变化时取消旧请求的结果呈现；取消是逻辑取消，已发出的 HTTP 请求可能完成。服务器强制权限为最终边界，前端检查不能代替它。私有标签与人物隔离需要两个测试账号验证。

界面按需查询，无额外容器、数据库或网络服务。候选读取仍有数据库与浏览器内存开销；大库可不加载候选直接输入。候选读取上限不是完整性保证。

## 集成路线

先独立 JS 扩展与模拟测试，再在授权测试环境核对实际 ApiClient 与接口语义，然后选择 JavaScript Injector 接入或封装 .NET 服务端 DLL。使用 GitHub Actions 的 .NET 10 构建 DLL 并生成带真实校验值的安装清单；构建失败不发布。上线前验收再确定正式兼容版本。
