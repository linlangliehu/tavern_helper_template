# 已废弃：项目工作流程

本文件不再作为可执行流程。历史版本中的标准 worktree、旧发布目录、先打 tag 再等待 bundle等步骤已过时，请勿执行。

当前唯一流程真源：

- `PROJECT_FLOW.md`：开发、验证、发布、端口职责及 Git 同步规则
- `docs/SIMPLIFIED_WORKFLOW.md`：面向使用者的日常操作手册
- `task_plan.md`：当前任务状态与下一步

当前日常入口是：F5 → 切换开发模式 → `pnpm watch` → 固定 5510 静态服务 → 在 8000 真页验收 → 切回生产模式。

正式发布采用两阶段流程：推送源码 → 等待 GitHub Actions `[bot] bundle` → 更新 `CDN_REF` → `publish-card --dist-no-build` → 提交发布物并打正式 tag。
