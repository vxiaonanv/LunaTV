# 短剧功能移植计划（开发分支）

本分支针对 MoonTechLab/LunaTV 的现有服务端进行增量扩展，不引入第二套常驻 Docker 服务或第二个 Kvrocks 实例。

## 兼容性原则

- 保留现有 `moontv-core` 的部署端口、登录、影视源、收藏和播放历史结构。
- 短剧配置作为现有 `AdminConfig` 的可选属性；旧 Kvrocks 数据无此字段时应安全回退为空配置，不能破坏历史数据。
- 默认关闭短剧功能；不内置未经验证或未经授权的视频源。
- 后台写操作仅允许站长或未封禁的管理员，不能仅检查是否登录。
- 所有外部 API 地址须限制协议为 HTTPS/HTTP，阻止内网和本机地址的 SSRF；设置超时、大小限制和错误隔离。
- 旧版 TV 客户端应继续可用；新版 Selene-TV 1.4.8 再独立接入短剧 API，移除客户端直播入口。

## 接口设计（待实现，尚不可调用）

- `GET /api/shortdrama/sources`：返回启用源的安全公开信息。
- `GET /api/shortdrama/list?source=...&page=...`：短剧列表，分页、限流和源级失败隔离。
- `GET /api/shortdrama/search?wd=...`：按启用源聚合搜索。
- `GET /api/shortdrama/detail?source=...&id=...`：返回分集与播放信息。
- `GET /api/admin/shortdrama`、`POST /api/admin/shortdrama`：管理启停、增删与排序，严格校验管理员身份和输入。

## 实施步骤

1. 核对 djseven/LunaTV 短剧实现中的数据格式和来源许可证，选出兼容当前 Next.js 14 的最小模块。
2. 增加类型、默认配置及 Kvrocks 序列化兼容；先添加测试以确保旧 AdminConfig 可读取。
3. 开发短剧源管理与只读资源接口，验证错误源不会影响电影/电视剧服务。
4. 增加管理后台短剧配置 UI，随后开发 TV 端的列表/详情/播放 UI。
5. 通过 GitHub Actions 在云端构建镜像，并先在非生产环境测试；备份 Kvrocks 与现有镜像后才考虑替换线上容器。

**当前状态：只完成开发分支创建和代码结构调查，未实现接口、未执行编译、未部署。**
