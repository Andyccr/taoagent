# Taoagent 3.14.0 验收记录

日期：2026-10-27。环境：Windows x64，自带 Node 24.19.0。

## 程序回归

- 最终 `npm test`：232/232 通过，0 失败、0 跳过，约64秒；日志 `windows-final-test.log`。
- `npm run lint:baseline`：通过，覆盖新增 queue.ts、launcher.mjs、pack-windows.mjs 和 Windows 验收脚本。
- `npm run build`：通过，release/server.mjs 与 release/build.json 版本为 3.14.0。
- 原有模拟模型 HTTP 流、Pi 工具、审批、多人并发、预算、中断、记忆隔离、任务验收、例行任务和便携 ZIP 恢复继续通过。

## 新增重点回归

`tests/queue.test.ts` 共7项：入队幂等、编辑旧版保留、版本冲突；FIFO与双实例认领；失败/无主认领不重放；暂停期间当前任务继续且等待项可编辑；群聊恢复不执行旧生命周期消息；同源及停止暂停；真实 HTTP 首批文字先于完成事件到达，断开订阅后仍执行成功。

`tests/windows-release.test.mjs` 共2项：源码 ZIP 包含 Windows 源码和锁文件、排除个人 home/ 与编译产物；启动器校验拒绝被修改的程序文件和指向个人数据的清单路径。

便携恢复测试额外验证队列消息 ID/全文和导航状态迁移。完整历史、取消消息和编辑旧版均保留。

## 浏览器验收

使用 `.test-tmp` 下独立演示 home/，没有执行个人队列、访问个人模型凭据或停止已有用户服务。

- 桌面：忙碌时发送方式区分排队与插话；侧栏显示队列状态与数量；队列面板展示真实记录；暂停后编辑保存成功，取消后仍能看到全文及复制为草稿入口。
- 修复队列轮询在版本不变时重建按钮的问题，避免操作目标和焦点失效；编辑期间不刷新覆盖表单。
- 390×844：面板、表单与操作按钮正常换行；documentWidth=390、viewport=390，无横向溢出；验收后重置视口。
- 使用本机模拟模型恢复队列，打开的对话收到输出并展示最终消息；浏览器控制台无错误。
- 截图：artifacts/queue-desktop-3.14.0.png、queue-mobile-3.14.0.png、queue-live-3.14.0.png，均为隔离演示数据。

## Windows 发行包

交付：保留完整当前 home/ 的 Windows x64 ZIP、无个人配置与聊天的干净 ZIP、独立源码 ZIP；附 SHA256SUMS。

包内包含 Taoagent.exe、控制台启动/停止/校验入口、launcher.mjs、自带 Node x64 及许可证、发布 bundle 和第三方许可、完整源码与锁文件；排除 node_modules、Git、构建缓存和临时进程锁。启动器的 Windows 版本元数据为 3.14.0.0。

`windows/verify-package.mjs` 用 PowerShell 独立解压 ZIP 到中文/空格路径，再实际启动包内 .exe。验证 PATH 中没有系统 Node/npm 时能启动；第二次 .exe 和批处理启动复用同一实例；版本一致；实际 HTTP 模型流式回复、持久队列、静态 UI 资源可用；错误实例标识不能停止服务；正确停止能让原生启动器退出，并关闭实时订阅。

验收始终指定新建的隔离 TAOAGENT_HOME，即使验证保留数据版，也不会运行其中个人例行任务或排队工作。最终发行验收与 ZIP 精确 SHA256 对应报告：artifacts/Windows-verification-3.14.0.json 与 artifacts/Windows-verification-3.14.0-clean.json。发布 ZIP 校验值见同目录 SHA256SUMS 文件。

## 实际边界

模型验收使用本机模拟服务，未调用真实付费模型或使用个人 Key；不声称真实 Provider 聊天已验证。外部 CLI/MCP 仍需在使用环境配置。本次 Windows 包不是安装器，没有发布者代码签名，不安装系统服务；.exe 启动器使用 Windows .NET Framework 4.x。

未自动重启用户已有服务。升级后的程序需使用新目录启动，或由用户停止旧服务后替换。程序仍采用本机 Web 工作台架构，没有引入 Electron、ACP、多 CLI 下载或远程桌面。
