import { NextRequest, NextResponse } from 'next/server';
import { resetDailyTasks } from '@/lib/cron/dailyReset';

/**
 * POST /api/cron/daily-reset
 * 手动触发每日任务重置
 * 注意：生产环境应该使用Vercel Cron Jobs或类似服务自动触发
 */
export async function POST(request: NextRequest) {
  try {
    // 验证请求（可以添加API Key验证）
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.CRON_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await resetDailyTasks();
    
    return NextResponse.json({
      success: true,
      message: 'Daily reset completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
