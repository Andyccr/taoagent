# 帝国之城（Empire City）

TaoAgent 内置的本机三维城市视图。每位真实成员一栋建筑，状态全部来自本机记录，画面运行时不调用任何模型，也不访问外网。

## 打开

侧栏第一项「城 帝国之城」，或设置 → 常规 → 帝国之城，或地址 `/#empire-city`（旧地址 `/#civilization` 仍可用）。

## 城市怎么来的

- 成员：`store.agents()` 中未归档的成员，新增成员下一次刷新（2.5 秒）自动建房；归档后自动拆除。
- 中央太和殿：默认由主助手 `main` 坐镇（它参与每个群）。如需改由其他成员坐镇，在 home/ 下建 `empire-city.json`：`{"leadAgentId": "成员 id"}`；该成员不存在或已归档时回到主助手。只有没有主助手时，才由最常担任群协调者的成员坐镇。殿顶的人物是你。
- 城区按成员职责关键词划分（无匹配时按标识分配并注明）：宫城（中式）、罗马工程区（穹顶/拱/引水渠）、希腊学园（柱廊神庙/剧场）、现代都会（玻璃塔），外围是现代天际线。
- 每环 6 块地；外环住满时自动扩建新环，并始终保留带围栏的「待建」用地。

## 状态与画面

| TaoAgent 记录 | 城市状态 | 画面 |
|---|---|---|
| 回合发言 running / 观察 checking | working | 窗户亮灯、人物工作、地面光环 |
| 60 秒内移交的待办任务 | working（移交方） | 信使拿着卷轴从移交方走到接收方 |
| 待批准的操作 | waiting | 灯笼点亮、等待图标 |
| 发言失败（暂停/中断除外） | error | 屋顶红烟、错误图标 |
| 20 秒内完成 | completed | 烟花 |
| running 超过 10 分钟且无心跳 / 记录无法读取 | stale | 建筑与人物变灰 |
| 本机服务连不上 | disconnected | 全城城门关闭、变灰 |
| 以上皆无 | idle | 安静的城 |

## 侧栏

使用情况（订阅额度显示 Unavailable，绝不编造）、城区镜头、成员、团队（即现有群聊；点击高亮成员）、最近动态（由回合、任务、审批记录推导，不含任何正文/参数）、任务、选中详情（职责、当前任务、所在团队、近期事件、跟随镜头）、显示设置。

- 「回放动态」：按时间顺序重演最近的真实事件，全程标注「回放 · 不是当前状态」，结束后回到实时状态。
- 「模拟文明」：纯浏览器模拟，标注清楚，不写入任何记录。

## 代码

- `civilization.ts` — 只读快照 `GET /api/civilization`（成员、状态、建筑、任务、移交、events、teams、leadSource）。
- `public/civilization.js` / `civilization.css` — 界面外壳、轮询、回放、详情。
- `public/city-entry.js` — 快照 → 场景（状态映射、成员名册、成员变化时重建城市）。
- `public/city/*` — 程序化三维城市（Three.js，移植自 virtual-office 原型）。
- `build-city.mjs` — 打包为 `public/city.bundle.js`（`npm run build:city`）。
- 测试：`tests/civilization.test.ts`、`tests/empire-city.test.ts`、可选浏览器测试 `tests/empire-city-browser.test.ts`。
