---
name: auto-test-and-commit-history
description: Use when code changes are ready and the agent should run tests automatically, then commit with a message that matches the repository's recent commit style.
---

# auto-test-and-commit-history

代码修改完成后，先自动执行项目测试或构建检查；只有在检查通过且确实存在变更时，才继续自动提交。

## 适用场景

- 代码已经改完，需要立刻验证再提交
- 想把“测试通过后再提交”变成默认行为
- 提交信息要参考仓库最近的历史风格，而不是随便生成

## 工作流

1. 先检查工作区是否有未提交修改。
2. 自动运行项目测试；如果没有明确测试脚本，再退回到构建检查。
3. 如果测试或构建失败，立刻停止，不提交。
4. 如果检查通过，读取最近提交历史，模仿仓库里已有的提交风格。
5. stage 相关修改并提交。
6. 默认不 push，除非用户明确要求。

## 提交信息规则

- 先观察最近 10 到 20 条提交，优先跟随仓库现有格式。
- 这个仓库当前的主流风格是 `feat:`，`refactor:` 和 `chore:`，并且以中文摘要为主。
- 默认规则：
  - 新增功能时，使用 `feat:`
  - 对原有功能进行修改时使用 `refactor:`
  - 工具、脚本、技能、配置使用 `chore:`
- 提交信息保持一行，简短，清楚，和修改内容对应。
- 摘要尽量用中文，和现有历史保持一致。
- 如果最近历史出现了新的主流前缀，就优先跟随新的主流前缀。

## 执行细节

- 不要在测试失败后继续提交。
- 不要在没有实际修改时强行提交。
- 如果变更范围很大，先按 `git diff --name-only` 和实际改动内容总结，再决定提交信息。
- 如果修改主要是重构、样式调整、页面优化或结构整理，优先考虑 `refactor:`。
- 如果修改主要是技能、脚本、构建、文档或其他辅助内容，优先考虑 `chore:`。

## 示例

```text
refactor: 组件样式优化
refactor: 任务页面调整
chore: skill 安装
```

## 记住

这个 skill 的目标不是“只提交”，而是“先验证，再按仓库历史风格提交”。
