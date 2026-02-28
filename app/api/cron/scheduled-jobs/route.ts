import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ScheduledJobModel from '@/models/ScheduledJob';
import Task from '@/models/Task';
import TaskTemplate from '@/models/TaskTemplate';
import mongoose from 'mongoose';

interface RecurringJobLike {
  userId: mongoose.Types.ObjectId;
  config?: {
    taskTemplateId?: string;
    selectedChildren?: string[];
    expiryPolicy?: string;
  };
}

/**
 * POST /api/cron/scheduled-jobs
 * 执行所有到期的定时任务
 * 注意：生产环境应该使用Vercel Cron Jobs或类似服务每分钟触发
 */
export async function POST(request: NextRequest) {
  try {
    // 验证请求
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.CRON_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    const now = new Date();
    
    // 查找所有运行中且到期的定时任务
    const jobs = await ScheduledJobModel.find({
      status: 'running',
      $or: [
        { nextRunAt: { $lte: now } },
        { nextRunAt: { $exists: false } },
        { nextRunAt: null }
      ]
    });
    
    console.log(`Found ${jobs.length} jobs to execute`);
    
    const results = [];
    
    for (const job of jobs) {
      try {
        let createdCount = 0;
        
        if (job.type === 'recurring_task') {
          createdCount = await executeRecurringTask(job);
        } else if (job.type === 'daily_reset') {
          const { resetDailyTasks } = await import('@/lib/cron/dailyReset');
          await resetDailyTasks();
          createdCount = 0;
        }
        
        // 更新任务状态
        job.lastRunAt = now;
        job.nextRunAt = calculateNextRun(job.frequency, job.cronExpression);
        job.runCount += 1;
        job.successCount += 1;
        await job.save();
        
        results.push({
          jobId: job._id,
          name: job.name,
          status: 'success',
          createdCount
        });
        
        console.log(`Job ${job.name} executed successfully, created ${createdCount} tasks`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        // 更新错误状态
        job.lastRunAt = now;
        job.lastError = errorMessage;
        job.runCount += 1;
        job.errorCount += 1;
        job.status = 'error';
        await job.save();
        
        results.push({
          jobId: job._id,
          name: job.name,
          status: 'error',
          error: errorMessage
        });
        
        console.error(`Job ${job.name} failed:`, errorMessage);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Executed ${jobs.length} scheduled jobs`,
      executedAt: now,
      results
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// 执行周期任务
async function executeRecurringTask(job: RecurringJobLike): Promise<number> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const { taskTemplateId, selectedChildren, expiryPolicy } = job.config || {};

  if (!taskTemplateId || !selectedChildren || selectedChildren.length === 0) {
    console.log('Job config missing required fields:', job.config);
    return 0;
  }

  const template = await TaskTemplate.findById(taskTemplateId);

  if (!template) {
    console.log('Template not found:', taskTemplateId);
    return 0;
  }

  let generatedCount = 0;

  for (const childId of selectedChildren) {
    // 检查今天是否已创建
    const existingTask = await Task.findOne({
      userId: job.userId,
      childId: new mongoose.Types.ObjectId(childId),
      name: template.name,
      createdAt: { $gte: startOfToday },
    });

    if (existingTask) {
      console.log(`Task already exists for child ${childId} today`);
      continue;
    }

    const deadline = new Date(now);
    deadline.setHours(23, 59, 59, 999);

    await Task.create({
      userId: job.userId,
      childId: new mongoose.Types.ObjectId(childId),
      name: template.name,
      description: template.description || '',
      points: template.points || 0,
      type: template.type || 'daily',
      icon: template.icon || '⭐',
      requirePhoto: template.requirePhoto || false,
      imageUrl: template.imageUrl,
      status: 'pending',
      deadline,
      expiryPolicy: expiryPolicy || 'auto_close',
    });

    generatedCount++;
    console.log(`Created task for child ${childId}: ${template.name}`);
  }

  return generatedCount;
}

// 计算下次运行时间
function calculateNextRun(frequency: string, cronExpression?: string): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case 'minutely':
      next.setMinutes(next.getMinutes() + 1, 0, 0);
      break;
    case 'hourly':
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    default:
      next.setMinutes(next.getMinutes() + 1);
  }

  return next;
}
