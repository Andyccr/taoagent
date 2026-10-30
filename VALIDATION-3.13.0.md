# Taoagent 3.13.0 验收记录

日期：2026-10-27。环境：Windows、仓库自带 Node 24.19.0。

## 最终结果

- `npm test`：223/223 通过，0 失败，0 跳过，约 54 秒。记录：`openbot-final-test.log`。
- `npm run lint:baseline`：通过，包含新增 workspace.ts。
- `npm run build`：通过，release/server.mjs 与 release/build.json 已更新至 3.13.0。
- 完整回归包含真实本机 HTTP 流式聊天（模拟 OpenAI、Anthropic、Gemini 服务）、多人并发、审批、中断、持久化、技能/例行任务与便携 ZIP 恢复。便携恢复额外验证 workspace.ts 和导航状态迁移。
- 新增 5 项回归：HTML ID 唯一性与状态优先级；历史分页去重与取消；咨询/归档可见性；多窗口导航冲突与已读版本；搜索脱敏、同源和 HTTP 缓存协商。凭据测试包含密钥跨越摘要截取边界的情况。

## 浏览器验收

使用独立 `.test-tmp/openbot-preview-home` 演示数据，不操作用户 home/，不停止用户现有服务。

- 桌面：搜索弹窗打开、跨对话查询、多词匹配接口、高亮、作者与时间、原文展示、原对话入口。
- 390×844 窄屏：侧栏开关、搜索表单双行布局、结果换行与弹窗滚动；DOM 无横向溢出。验收后重置浏览器视口。
- 设置 → 工作空间总览 → 系统状态与诊断：显示版本 3.13.0、Node 版本、运行时间、内存、对话与运行数量；点击导出成功取得 taoagent-diagnostics.json。
- 修复验收发现的新旧历史搜索重复 ID；新增通用 ID 唯一性回归。
- 截图：`artifacts/openbot-search-desktop.png`、`artifacts/openbot-search-mobile.png`、`artifacts/openbot-diagnostics.png`，均为演示数据。

## 环境与实际验证边界

首次沙箱回归因无法连接本机测试端口报 EACCES，该次不计为有效验收。允许本机 HTTP 后首轮 222 项中 3 项协作用例失败，独立串行重跑 3/3 通过；最终完整重跑 223/223 通过。

本次未调用真实付费模型、未用个人凭据进行聊天验收，因此不声称真实 Provider 聊天已验证。模型连通性须在实际使用环境通过模型检测确认。改动已写入源码并构建发布包；运行中的用户服务没有自动重启，重启后才载入本版本。

没有新增运行依赖，没有复制 OpenBot 的源码。功能范围及明确未实现的 OpenBot 能力见 OPENBOT-OPTIMIZATION.md。
