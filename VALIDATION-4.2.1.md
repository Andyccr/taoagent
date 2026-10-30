# TaoAgent 4.2.1 · 角色与可直接运行的交付目录

本次增加显式的两角色安装工具 roleplay.ts，已在现有 home/ 创建绮月、星澜与故事剧场。两位角色使用独立的故事模型配置，关闭真实工具；不改变原有模型的工具设置。安装可重复执行，保留用户后续修改的角色设定、故事记忆、已有剧场和历史。

角色使用见 ROLEPLAY-GUIDE.md。新故事、角色分工和导演指令属于故事设定，不是现实用户事实。不同私聊保持独立上下文；并行故事建议分别使用独立空间。

交付包含已解压的 Windows 完整目录，可直接运行 Taoagent.exe 或 Start Taoagent.cmd；另外提供完整 ZIP、空白 ZIP、独立源码与校验值。旧的正在运行的实例保持原样，发布在独立目录构建。

验证日志位于 .validation/roleplay-release-test.log、.validation/roleplay-release-lint.log。Windows 实际解压启动的结果分别输出 artifacts/Windows-verification-4.2.1.json 与 artifacts/Windows-verification-4.2.1-clean.json。新角色的安装与重复安装保留历史由 tests/roleplay.test.ts 验证。

真实模型 HTTP 验证已通过：两位角色都按架空雨夜旅店场景直接进入指定角色，分别生成 175 与 186 字的表演；真实工具关闭。样本为 REAL-ROLEPLAY-4.2.1.json，未写入用户故事历史。
