import { NextRequest, NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// 存储 cron 服务进程
let cronProcess: any = null;

// 检查 cron 服务是否正在运行
async function isCronServerRunning(): Promise<boolean> {
  try {
    // 使用 ps 命令查找 cron-server.js 进程
    const { stdout } = await execAsync('ps aux | grep "cron-server.js" | grep -v grep');
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// 启动 cron 服务
function startCronServer(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (cronProcess) {
      resolve(true);
      return;
    }

    const cronScriptPath = path.join(process.cwd(), 'cron-server.js');

    cronProcess = spawn('node', [cronScriptPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        CRON_BASE_URL: process.env.CRON_BASE_URL || 'http://localhost:3000',
        CRON_INTERVAL: process.env.CRON_INTERVAL || '60000',
        CRON_DEBUG: process.env.CRON_DEBUG || 'true',
      },
    });

    cronProcess.unref();

    // 等待一下确认进程启动
    setTimeout(async () => {
      const isRunning = await isCronServerRunning();
      resolve(isRunning);
    }, 1000);
  });
}

// 停止 cron 服务
async function stopCronServer(): Promise<boolean> {
  try {
    // 查找并杀死 cron-server.js 进程
    await execAsync('pkill -f "cron-server.js"');
    cronProcess = null;

    // 等待一下确认进程停止
    await new Promise((resolve) => setTimeout(resolve, 500));

    const isRunning = await isCronServerRunning();
    return !isRunning;
  } catch (error) {
    console.error('停止 cron 服务失败:', error);
    return false;
  }
}

// GET /api/cron/status - 获取 cron 服务状态
export async function GET(request: NextRequest) {
  try {
    const isRunning = await isCronServerRunning();
    return NextResponse.json({
      success: true,
      running: isRunning,
    });
  } catch (error) {
    console.error('获取 cron 服务状态失败:', error);
    return NextResponse.json(
      { success: false, message: '获取状态失败', running: false },
      { status: 500 }
    );
  }
}

// POST /api/cron/control - 启动或停止 cron 服务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json(
        { success: false, message: '无效的操作' },
        { status: 400 }
      );
    }

    let success = false;
    let isRunning = false;

    if (action === 'start') {
      success = await startCronServer();
      isRunning = success;
    } else {
      success = await stopCronServer();
      isRunning = !success;
    }

    if (success) {
      return NextResponse.json({
        success: true,
        running: isRunning,
        message: action === 'start' ? '定时任务服务已启动' : '定时任务服务已停止',
      });
    } else {
      return NextResponse.json(
        { success: false, message: '操作失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('控制 cron 服务失败:', error);
    return NextResponse.json(
      { success: false, message: '操作失败' },
      { status: 500 }
    );
  }
}
