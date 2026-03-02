---
name: auto-test-and-commit
description: 自动执行测试并在测试通过后提交Git的skill
---

# auto-test-and-commit

每次代码修改完成后自动执行测试，测试成功后自动提交Git。

## 快速使用

### 方式1: 使用脚本（推荐）

```bash
# 进入项目目录后执行
bash .opencode/skills/auto-test-and-commit/scripts/test-and-commit.sh

# 或者指定提交信息
bash .opencode/skills/auto-test-and-commit/scripts/test-and-commit.sh "feat: 修改按钮样式"
```

### 方式2: 手动执行步骤

**1. 运行测试/构建检查**
```bash
npm run build
```

**2. 检查Git状态**
```bash
git status
```

**3. 添加并提交**
```bash
git add .
git commit -m "auto: 描述修改内容"
```

**4. 推送到远程（可选）**
```bash
git push origin $(git branch --show-current)
```

## 工作流程

### 1. 代码修改后自动触发

当你完成任何代码修改（write_file, replace等操作）后，询问用户是否执行测试并提交。

### 2. 运行测试

根据项目类型运行相应的测试命令：

**Next.js/React项目 (package.json存在):**
```bash
# 检查package.json中的scripts
npm run test 2>/dev/null || npm run test:unit 2>/dev/null || npm run build
```

**如果没有测试脚本或测试通过:**
继续执行下一步

**如果测试失败:**
- 显示错误信息
- 停止提交流程
- 等待用户修复

### 3. 检查Git状态

```bash
git status --porcelain
```

### 4. 如果有修改，自动提交

```bash
# 添加所有修改
git add .

# 生成提交信息（基于修改的文件类型）
git commit -m "auto: <描述修改内容>"
```

**提交信息规则：**
- 修改组件: `auto: update <ComponentName> component`
- 修改样式: `auto: style updates`
- 修改API: `auto: update API <endpoint>`
- 修改配置: `auto: config updates`
- 其他: `auto: code updates`

### 5. 可选推送到远程

如果需要推送：
```bash
git push origin $(git branch --show-current)
```

## 使用方式

### 方式1: 在每次修改后自动调用

完成任何文件修改后，询问用户：
"修改已完成，是否执行测试并提交Git？"

### 方式2: 用户主动触发

用户说 "测试并提交" 或 "auto commit" 时，执行完整流程。

## 示例

**用户修改代码后：**
```
用户: 帮我把按钮颜色改成蓝色
[执行修改]
助手: 修改已完成，是否执行测试并提交Git？
用户: 是
[运行测试...]
[测试通过]
[git add .]
[git commit -m "auto: update button styles"]
助手: ✅ 测试通过并已提交到Git
```

## 注意事项

1. **只在用户确认后提交** - 不自动提交，需用户确认
2. **测试失败时停止** - 不提交有问题的代码
3. **生成有意义的提交信息** - 基于实际修改内容
4. **尊重.gitignore** - 不提交被忽略的文件
/