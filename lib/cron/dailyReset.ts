import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';

/**
 * 每日零点任务重置逻辑
 * 1. 处理周期任务的过期策略
 * 2. 重置常规任务状态
 * 3. 清理过期的特殊任务
 * 4. 生成周期性任务（基于新的 isRecurring 字段）
 */
export async function resetDailyTasks() {
  try {
    await connectDB();
    
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    console.log('🕛 Starting daily task reset at:', now.toISOString());
    
    // 1. 处理昨日未完成任务的过期策略
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const pendingTasks = await Task.find({
      status: { $in: ['pending', 'submitted'] },
      createdAt: { $lt: startOfToday, $gte: yesterday },
      isRecurringTemplate: { $ne: true }
    });
    
    let autoClosedCount = 0;
    let rolloverCount = 0;
    
    for (const task of pendingTasks) {
      // 根据过期策略处理
      if (task.expiryPolicy === 'auto_close') {
        // 自动关闭/过期
        task.status = 'expired';
        await task.save();
        autoClosedCount++;
      } else if (task.expiryPolicy === 'rollover') {
        // 顺延到今日，重置创建时间
        task.createdAt = startOfToday;
        task.status = 'pending';
        task.submittedAt = undefined;
        task.photoUrl = undefined;
        await task.save();
        rolloverCount++;
      }
      // keep 策略不做处理，保留原任务
    }
    
    console.log(`📋 Processed ${autoClosedCount} auto-closed, ${rolloverCount} rollover tasks`);
    
    // 2. 重置常规任务状态
    const regularTasks = await Task.find({
      taskCategory: 'regular',
      status: { $in: ['approved', 'rejected'] },
      isRecurringTemplate: { $ne: true }
    });
    
    let resetCount = 0;
    
    for (const task of regularTasks) {
      // 重置任务状态
      task.status = 'pending';
      task.photoUrl = undefined;
      task.rejectionReason = undefined;
      task.submittedAt = undefined;
      task.approvedAt = undefined;
      task.completedAt = undefined;
      await task.save();
      resetCount++;
    }
    
    console.log(`✅ Reset ${resetCount} regular tasks`);
    
    // 3. 清理已过期的特殊任务
    const expiredTasksResult = await Task.updateMany(
      {
        taskCategory: 'special',
        deadline: { $lt: now },
        status: { $in: ['pending', 'submitted'] }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    console.log(`🗑️ Marked ${expiredTasksResult.modifiedCount} special tasks as expired`);
    
    // 4. 生成周期性任务（使用新的 isRecurring 字段）
    const generatedCount = await generateRecurringTasks();
    console.log(`🔄 Generated ${generatedCount} recurring tasks`);
    
    return {
      success: true,
      resetCount,
      expiredCount: expiredTasksResult.modifiedCount,
      generatedCount,
      autoClosedCount,
      rolloverCount
    };
  } catch (error) {
    console.error('❌ Daily reset error:', error);
    throw error;
  }
}

/**
 * 生成周期性任务
 * 支持新的 isRecurring 字段和更灵活的规则
 * 注意：每分钟任务在每日重置时不会创建，它们通过 API 查询时动态生成
 */
async function generateRecurringTasks(): Promise<number> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  const dayOfWeek = now.getDay(); // 0-6 (0 = Sunday)
  const dayOfMonth = now.getDate(); // 1-31
  
  // 获取所有设置为周期性的任务模板（排除每分钟任务，它们由 API 动态生成）
  const recurringTemplates = await Task.find({
    isRecurring: true,
    isRecurringTemplate: true,
    recurrence: { $nin: ['minutely'] }, // 排除每分钟任务
    $and: [
      {
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: null },
          { validUntil: { $gte: startOfToday } }
        ]
      },
      {
        $or: [
          { validFrom: { $exists: false } },
          { validFrom: null },
          { validFrom: { $lte: startOfToday } }
        ]
      }
    ]
  });
  
  let generatedCount = 0;
  
  for (const template of recurringTemplates) {
    let shouldCreate = false;
    
    // 根据 recurrence 字段判断
    switch (template.recurrence) {
      case 'daily':
        shouldCreate = true;
        break;
      case 'weekly':
        // recurrenceDay: 0=周日, 1=周一, ..., 6=周六
        if (template.recurrenceDay !== undefined) {
          shouldCreate = template.recurrenceDay === dayOfWeek;
        }
        break;
      case 'monthly':
        // recurrenceDay: 1-31
        if (template.recurrenceDay !== undefined) {
          shouldCreate = template.recurrenceDay === dayOfMonth;
        }
        break;
      case 'custom_days':
        // 自定义多天，检查今天是否在 recurrenceDays 中
        if (template.recurrenceDays && template.recurrenceDays.length > 0) {
          shouldCreate = template.recurrenceDays.includes(dayOfWeek);
        }
        break;
    }
    
    if (!shouldCreate) continue;
    
    // 检查今天是否已创建该任务的实例
    const existingInstance = await Task.findOne({
      originalTaskId: template._id,
      createdAt: { $gte: startOfToday }
    });
    
    if (!existingInstance) {
      // 计算截止时间（默认当天23:59:59）
      const deadline = new Date(startOfToday);
      deadline.setHours(23, 59, 59, 999);
      
      // 如果有 autoPublishTime，设置发布时间
      if (template.autoPublishTime) {
        const [hours, minutes] = template.autoPublishTime.split(':').map(Number);
        deadline.setHours(hours, minutes, 0, 0);
      }
      
      await Task.create({
        userId: template.userId,
        childId: template.childId,
        name: template.name,
        description: template.description,
        points: template.points,
        type: template.type,
        taskCategory: template.taskCategory || 'regular',
        icon: template.icon,
        requirePhoto: template.requirePhoto,
        imageUrl: template.imageUrl,
        status: 'pending',
        recurrence: 'none',
        isRecurring: false, // 实例不是周期任务
        expiryPolicy: template.expiryPolicy,
        originalTaskId: template._id,
        deadline,
      });
      generatedCount++;
    }
  }
  
  return generatedCount;
}

/**
 * 计算利息：Total = P(1 + r)^n
 * @param principal 本金
 * @param rate 日利率
 * @param days 天数
 */
export function calculateInterest(principal: number, rate: number, days: number): number {
  return Math.floor(principal * Math.pow(1 + rate, days) - principal);
}
