import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { 
  getUserAchievements, 
  getAchievementStats, 
  markAchievementsViewed,
} from '@/lib/gamification/achievements';
import { checkAndAwardAchievements, TaskCompletionContext } from '@/lib/gamification/achievements';
import { getTokenPayload } from '@/lib/auth';
import { ITask } from '@/models/Task';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    
    await connectDB();
    
    let targetUserId = payload.userId;
    if (payload.role === 'parent' && childId) {
      targetUserId = childId;
    }

    const [achievements, stats] = await Promise.all([
      getUserAchievements(targetUserId),
      getAchievementStats(targetUserId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        achievements,
        stats,
      },
    });
  } catch (error) {
    console.error('获取成就失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { achievementId } = body;

    await connectDB();
    await markAchievementsViewed(userId, achievementId);

    return NextResponse.json({
      success: true,
      message: '成就已标记为已查看',
    });
  } catch (error) {
    console.error('更新成就状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { taskId, taskPoints, isResubmit, previousRejectedAt, isBirthday } = body;

    await connectDB();

    const TaskModel = mongoose.models.Task || mongoose.model('Task');
    const task = await TaskModel.findById(taskId);

    if (!task) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 });
    }

    const context: TaskCompletionContext = {
      task: task as unknown as ITask,
      completedAt: new Date(),
      isResubmit: isResubmit || false,
      previousRejectedAt: previousRejectedAt ? new Date(previousRejectedAt) : undefined,
      isBirthday: isBirthday || false,
    };

    const result = await checkAndAwardAchievements(userId, context);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('检查成就失败:', error);
    return NextResponse.json(
      { success: false, message: '检查失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
