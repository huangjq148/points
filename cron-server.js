/**
 * 简易定时任务触发服务
 * 用于定期调用 /api/cron/scheduled-jobs 接口执行定时任务
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 配置
const CONFIG = {
  // 你的应用域名或本地开发地址
  // 本地开发: http://localhost:3000
  // 生产环境: https://your-domain.com
  baseUrl: process.env.CRON_BASE_URL || 'http://localhost:3000',

  // 检查间隔（毫秒）
  // 默认每分钟检查一次
  checkInterval: process.env.CRON_INTERVAL || 60 * 1000,

  // API Key（如果设置了的话）
  apiKey: process.env.CRON_API_KEY || '',

  // 是否启用调试日志
  debug: process.env.CRON_DEBUG === 'true',
};

// 日志函数
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleString('zh-CN');
  const prefix = `[${timestamp}] [${type.toUpperCase()}]`;

  if (type === 'error') {
    console.error(prefix, message);
  } else if (type === 'debug' && CONFIG.debug) {
    console.log(prefix, message);
  } else if (type !== 'debug') {
    console.log(prefix, message);
  }
}

// 调用 API 执行定时任务
async function triggerScheduledJobs() {
  const url = new URL('/api/cron/scheduled-jobs', CONFIG.baseUrl);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 如果设置了 API Key，添加到请求头
  if (CONFIG.apiKey) {
    options.headers['Authorization'] = `Bearer ${CONFIG.apiKey}`;
  }

  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    log(`Triggering scheduled jobs at ${url.toString()}`, 'debug');

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            log(`Success: ${response.message}`, 'info');
            if (response.results && response.results.length > 0) {
              response.results.forEach((result) => {
                const status = result.status === 'success' ? '✓' : '✗';
                log(`  ${status} ${result.name}: ${result.status === 'success' ? `created ${result.createdCount} tasks` : result.error}`);
              });
            }
            resolve(response);
          } else {
            log(`Failed: ${response.message || 'Unknown error'}`, 'error');
            reject(new Error(response.message));
          }
        } catch (error) {
          log(`Parse error: ${error.message}`, 'error');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      log(`Request error: ${error.message}`, 'error');
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      log('Request timeout', 'error');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// 主循环
let isRunning = false;

async function main() {
  if (isRunning) {
    log('Previous job still running, skipping...', 'debug');
    return;
  }

  isRunning = true;

  try {
    await triggerScheduledJobs();
  } catch (error) {
    // 错误已在函数内部记录
  } finally {
    isRunning = false;
  }
}

// 启动服务
function start() {
  log('========================================');
  log('定时任务触发服务已启动');
  log(`目标地址: ${CONFIG.baseUrl}`);
  log(`检查间隔: ${CONFIG.checkInterval / 1000} 秒`);
  log(`调试模式: ${CONFIG.debug ? '开启' : '关闭'}`);
  log('========================================');

  // 立即执行一次
  main();

  // 定时执行
  const intervalId = setInterval(main, CONFIG.checkInterval);

  // 优雅退出
  process.on('SIGINT', () => {
    log('\n正在关闭服务...');
    clearInterval(intervalId);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('\n正在关闭服务...');
    clearInterval(intervalId);
    process.exit(0);
  });
}

// 如果直接运行此文件
if (require.main === module) {
  start();
}

module.exports = { start, triggerScheduledJobs, CONFIG };
