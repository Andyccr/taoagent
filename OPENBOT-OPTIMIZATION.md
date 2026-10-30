# Taoagent 3.14.0：OpenBot 参考与实现记录

## 3.14.0 后续优化

进一步阅读固定版本的 `packages/contracts/src/ipc-queue.ts`、`src/renderer/src/features/conversation/stores/queue-store.ts`、`scripts/verify-windows-package.ts`。借鉴等待/插话区分、队列状态与版本冲突、防止重放，以及发布包独立启动验收；继续采用独立实现。

新增 `queue.ts`：每个对话的持久 FIFO 队列，入队幂等、编辑旧版保存、版本冲突校验、取消、暂停/恢复；同步取得队列和会话锁后认领，复用 runConversation 与原有审批/预算。两个进程不能执行同一个认领。失败/中断暂停尾部，重启发现无主认领会标记中断而非自动重放；群生命周期变化会拦住旧消息。UI 区分排队与插话，队列面板使用真实服务记录。

新增 Windows 原生 .NET 启动器与 Node 启动管理器，复用同数据目录的已核验实例、写入启动日志、显式停止、校验运行环境与发行文件 SHA256。停止校验随机实例标识，避免误停其他端口服务。打包包含自带 Node x64 和许可证、完整源码、锁文件与完整 home/；另生成不含个人数据的干净包及独立源码包。

新增 `windows/verify-package.mjs` 实际解压并启动发行包中的 `.exe`；验收使用独立 home/ 和本机模拟模型，不执行个人队列或使用个人凭据。完整使用方法见 WINDOWS-README.md，当前验收见 VALIDATION-3.14.0.md。

接口新增：`GET/POST/PATCH /api/chats/:id/queue`、`GET /api/health`；只有启动器管理的实例开放带实例校验的 `POST /api/launcher/stop`。队列面板显示全部活动项与最近30条历史，底层完整记录不删除。等待项每个对话最多100条、单条最多200000字符；超限明确拒绝，草稿保留。

队列执行通过 `GET /api/chats/:id/events` 的 SSE 推送实时文字片段、轮次与审批更新，执行不绑定任何浏览器连接。最多32个本机订阅连接，缓冲过高时关闭慢订阅；重连读取持久历史，避免积压无限内存。停止本地服务会同时关闭订阅，以免长连接阻止正常退出。

下文保留 3.13.0 的初始对照记录；当时未实现的 FIFO 已在 3.14.0 补齐。ACP、多 CLI 管理、嵌入式浏览器、桌面远控仍属于不同架构范围，未宣称完整复刻。

参考固定版本：`nightly-labs/openbot@a701c3d3b144e995d1b6b2de532f457f8eee9485`。阅读了 README、LICENSE、侧栏状态计算与标签、QueuePanel、远程诊断实现。这里只借鉴产品行为与架构思路，新增实现独立编写，没有复制 OpenBot 源码或引入其依赖。上游 LICENSE 为 PolyForm Noncommercial 1.0.0；本次未把上游当成宽松许可证组件合并。

## 对照与取舍

| 参考方向 | 本次落地 | 现有机制与边界 |
| --- | --- | --- |
| 工作区状态与侧栏 | 优先显示等待用户审批；其次运行、失败、有更新；支持筛选与置顶 | 复用真实 actions、turns 和运行锁，不用假进度 |
| 持续会话与历史 | 全局/当前对话的多关键词搜索、分页、高亮、完整原文 | 原始 JSONL 不裁剪；不搜索内部咨询与记忆文件 |
| 本地优先的数据管理 | 导航偏好与已读版本写入 home，便携包包含新增源码和数据 | 原子写入、进程间锁、过期版本拒绝覆盖 |
| 运行可观测性 | 版本、Node、uptime、RSS、heap、对话及运行数量；诊断 JSON 导出 | 不读取外部系统、不包含个人资料；不代表模型连通或任务成功 |
| 高效 UI | 同主题桌面/窄屏搜索、关键词高亮、取消旧请求、键盘入口 | 沿用已有对话控制、外观与焦点管理 |
| 消息队列 | 研究了 OpenBot 的暂停/队列交互 | 现有 Taoagent 运行中发送明确表示插话并取消旧生成；本次未替换成 FIFO，也未声称提供持久消息队列 |
| Provider 与桌面能力 | 保留 Pi 与既有协议 | 未引入 Electron、ACP、多 CLI 下载、内嵌浏览器或桌面远控 |

## 技术实现

`workspace.ts` 提供工作区对话摘要和逐行历史搜索；`store.ts` 管理带版本校验的导航数据；`app.ts` 沿用本机与同源检查提供接口；UI 使用 DOM API 和 textContent 构建结果，不插入历史中的 HTML。

搜索不建立持久索引，按 JSONL 流扫描，最多保留 limit+1 个候选。每 256 行让出事件循环，可随 AbortSignal 关闭流。分页游标绑定搜索词与对话范围，按消息时间、对话 ID、消息 ID 的稳定组合倒序排序。新写入且排在游标之前的消息需重新搜索才会出现。每页默认 30 条，上限 100；搜索词最多 200 字符。全库扫描的总耗时仍随历史量增长，并非倒排索引。

搜索仅包含活动对话的公开 user/assistant 消息，排除 kind=activity 与 consult；已中断回复会保留并标注。生成摘要前先对完整消息脱敏，避免切断密钥后脱敏失败；原文接口同样脱敏。脱敏规则来自现有模型和集成凭据，不是对任意个人敏感信息的自动识别。

导航文件格式：`{pinned: ["agent:main", "group:<id>"], seen: {"<sessionId>": "<updatedAt>:<messages.jsonl bytes>"}}`。置顶按目标的 expectedPinned 校验；已读只接受当前已加载的精确历史版本。第一次启用无历史已读记录，因此已有消息的对话也可能显示更新。状态及偏好为账户本地共享，不区分浏览器用户。

静态资源启动时生成 gzip 和弱 ETag。协商响应带 Vary: Accept-Encoding；禁用 gzip 的客户端仍获取原文；命中 ETag 返回 304；API 继续 no-store。运行中的服务缓存启动时的资源和版本，需要重启才能载入新构建。

## 新增接口

| 接口 | 行为 |
| --- | --- |
| GET /api/search?q=&session=&limit=&cursor= | 多词 AND 搜索；session 可省略；返回 hits、hasMore、cursor |
| GET /api/search/message?session=&message= | 可搜索对话中的完整公开消息，已知凭据脱敏 |
| POST /api/navigation | targetKey/pinned/expectedPinned 修改置顶；或 sessionId/seenRevision 更新已读 |
| GET /api/diagnostics | 不含个人内容与配置的本地服务运行快照 |
| GET /api/state | 追加 conversations 与 navigation；原有字段保持兼容 |

## 验收

新增 `tests/workspace-discovery.test.ts` 覆盖 ID 唯一性、状态优先级、多页去重、检索逻辑、取消、归档/恢复/咨询隔离、版本冲突、凭据边界、同源保护、gzip 和 304。既有便携恢复测试扩展为同时校验导航状态与 workspace.ts 源码。

完整命令：`npm test`、`npm run lint:baseline`、`npm run build`。本机 HTTP 用例需要允许测试进程连接 127.0.0.1；沙箱拒绝连接时会报 EACCES，不能算作实现验证。最终结果见 `VALIDATION-3.13.0.md`。
