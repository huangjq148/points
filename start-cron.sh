#!/bin/bash

# 定时任务服务启动脚本

# 设置环境变量
export CRON_BASE_URL=${CRON_BASE_URL:-"http://localhost:3000"}
export CRON_INTERVAL=${CRON_INTERVAL:-"60000"}
export CRON_DEBUG=${CRON_DEBUG:-"true"}

# 显示配置
echo "========================================"
echo "启动定时任务触发服务"
echo "========================================"
echo "目标地址: $CRON_BASE_URL"
echo "检查间隔: $(($CRON_INTERVAL / 1000)) 秒"
echo "调试模式: $CRON_DEBUG"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动服务
node cron-server.js
