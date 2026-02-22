import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import { MedalModel } from '@/models/Economy';

/**
 * 每日零点任务重置逻辑
 * 1. 将所有常规任务(regular)从 approved/rejected 状态重置为 pending
 * 2. 连续记录：如果任务在 00:00 前为 approved，则 streakCount + 1
 * 3. 清理过期的特殊任务(special)
 * 4. 生成周期性任务
 */
export async function resetDailyTasks() {
  try {
    await connectDB();
    
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    console.log('🕛 Starting daily task reset at:', now.toISOString());
    
    // 1. 重置常规任务状态并更新连续天数
    const regularTasks = await Task.find({
      taskCategory: 'regular',
      status: { $in: ['approved', 'rejected'] }
    });
    
    let resetCount = 0;
    let streakUpdatedCount = 0;
    
    for (const task of regularTasks) {
      // 如果任务在今日之前完成，增加连续天数
      if (task.status === 'approved' && task.completedAt && task.completedAt < startOfToday) {
        task.streakCount = (task.streakCount || 0) + 1;
        streakUpdatedCount++;
      }
      
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
    
    console.log(`✅ Reset ${resetCount} regular tasks, updated ${streakUpdatedCount} streak counts`);
    
    // 2. 清理已过期的特殊任务
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
    
    // 3. 生成周期性任务
    const generatedCount = await generateRecurringTasks();
    console.log(`🔄 Generated ${generatedCount} recurring tasks`);
    
    // 4. 检查并发放连续天数勋章
    await checkAndAwardStreakMedals();
    
    return {
      success: true,
      resetCount,
      streakUpdatedCount,
      expiredCount: expiredTasksResult.modifiedCount,
      generatedCount
    };
  } catch (error) {
    console.error('❌ Daily reset error:', error);
    throw error;
  }
}

/**
 * 生成周期性任务
 */
async function generateRecurringTasks(): Promise<number> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  const dayOfWeek = now.getDay(); // 0-6
  const dayOfMonth = now.getDate(); // 1-31
  
  // 获取所有设置为周期性的常规任务模板
  const recurringTemplates = await Task.find({
    taskCategory: 'regular',
    recurrence: { $in: ['daily', 'weekly', 'monthly'] }
  });
  
  let generatedCount = 0;
  
  for (const template of recurringTemplates) {
    let shouldCreate = false;
    
    if (template.recurrence === 'daily') {
      shouldCreate = true;
    } else if (template.recurrence === 'weekly' && template.recurrenceDay !== undefined) {
      shouldCreate = template.recurrenceDay === dayOfWeek;
    } else if (template.recurrence === 'monthly' && template.recurrenceDay !== undefined) {
      shouldCreate = template.recurrenceDay === dayOfMonth;
    }
    
    if (!shouldCreate) continue;
    
    // 检查模板本身是否是今天创建的（避免重复创建）
    if (template.createdAt >= startOfToday) continue;
    
    // 检查今天是否已创建该任务的实例
    const existingInstance = await Task.findOne({
      originalTaskId: template._id,
      createdAt: { $gte: startOfToday }
    });
    
    if (!existingInstance) {
      await Task.create({
        userId: template.userId,
        childId: template.childId,
        name: template.name,
        description: template.description,
        points: template.points,
        type: template.type,
        taskCategory: 'regular',
        icon: template.icon,
        requirePhoto: template.requirePhoto,
        imageUrl: template.imageUrl,
        status: 'pending',
        recurrence: 'none',
        originalTaskId: template._id,
      });
      generatedCount++;
    }
  }
  
  return generatedCount;
}

/**
 * 检查并发放连续天数勋章
 */
async function checkAndAwardStreakMedals() {
  const children = await User.find({ role: 'child' });
  
  for (const child of children) {
    const tasks = await Task.find({
      childId: child._id,
      taskCategory: 'regular',
      status: 'approved'
    });
    
    // 计算最高连续天数
    const maxStreak = tasks.reduce((max, task) => Math.max(max, task.streakCount || 0), 0);
    
    // 连续天数勋章定义
    const streakMedals = [
      { type: 'streak_7', name: '坚持7天', requirement: 7, level: 'bronze', icon: '🔥' },
      { type: 'streak_30', name: '坚持30天', requirement: 30, level: 'silver', icon: '⚡' },
      { type: 'streak_90', name: '坚持90天', requirement: 90, level: 'gold', icon: '💪' },
      { type: 'streak_365', name: '坚持一年', requirement: 365, level: 'diamond', icon: '👑' },
    ];
    
    for (const medalDef of streakMedals) {
      if (maxStreak >= medalDef.requirement) {
        const existingMedal = await MedalModel.findOne({
          userId: child._id,
          type: medalDef.type
        });
        
        if (!existingMedal) {
          await MedalModel.create({
            userId: child._id,
            type: medalDef.type,
            name: medalDef.name,
            description: `连续完成任务${medalDef.requirement}天`,
            icon: medalDef.icon,
            level: medalDef.level,
            requirement: medalDef.requirement,
            requirementType: 'consecutive_days',
            isEarned: true,
            earnedAt: new Date(),
            isNewBadge: true,
          });
          console.log(`🏅 Awarded ${medalDef.name} medal to ${child.username}`);
        }
      }
    }
  }
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
