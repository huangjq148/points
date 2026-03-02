#!/bin/bash

# 自动测试并提交Git脚本
# 用法: ./test-and-commit.sh ["提交信息"]

set -e

echo "🚀 开始自动测试并提交流程..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查Git状态
echo "📋 检查Git状态..."
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  没有需要提交的修改${NC}"
    exit 0
fi

# 2. 运行测试
echo "🧪 运行测试..."

# 检查package.json是否存在
if [ -f "package.json" ]; then
    # 检查是否有test脚本
    if npm run | grep -q "test$"; then
        echo "📦 运行 npm test..."
        if ! npm test; then
            echo -e "${RED}❌ 测试失败，停止提交流程${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  未找到test脚本，尝试运行build检查...${NC}"
        if ! npm run build; then
            echo -e "${RED}❌ 构建失败，停止提交流程${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  未找到package.json，跳过测试${NC}"
fi

# 3. 生成提交信息
if [ -z "$1" ]; then
    # 自动生成提交信息
    CHANGED_FILES=$(git diff --name-only HEAD | head -5 | tr '\n' ', ')
    COMMIT_MSG="auto: update ${CHANGED_FILES%,}"
else
    COMMIT_MSG="$1"
fi

# 4. 添加所有修改
echo "📦 添加修改到暂存区..."
git add .

# 5. 提交
echo "💾 提交修改..."
if git commit -m "$COMMIT_MSG"; then
    echo -e "${GREEN}✅ 提交成功: $COMMIT_MSG${NC}"
else
    echo -e "${YELLOW}⚠️  提交失败（可能没有需要提交的内容）${NC}"
    exit 0
fi

# 6. 可选：推送到远程
read -p "🚀 是否推送到远程仓库? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📤 推送到 origin/$CURRENT_BRANCH..."
    if git push origin "$CURRENT_BRANCH"; then
        echo -e "${GREEN}✅ 推送成功${NC}"
    else
        echo -e "${RED}❌ 推送失败${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 流程完成！${NC}"