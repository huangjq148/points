import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { UserAvatar } from '@/models/Gamification';
import { getTokenPayload } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { taskPoints = 10, isTaskCompletion = true } = body;

    await connectDB();

    let userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
      userAvatar = await UserAvatar.create({
        userId: new mongoose.Types.ObjectId(userId),
        currentXP: 0,
        totalXP: 0,
        stage: 'egg',
        unlockedSkins: ['default'],
        currentSkin: 'default',
        equippedAccessories: [],
        unlockedAccessories: [],
        totalTasksCompleted: 0,
      });
    }

    const xpGained = Number(taskPoints) || 0;
    const newTotalTasksCompleted = userAvatar.totalTasksCompleted + (isTaskCompletion ? 1 : 0);
    const newTotalXP = userAvatar.totalXP + xpGained;

    userAvatar = await UserAvatar.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        totalTasksCompleted: newTotalTasksCompleted,
        totalXP: newTotalXP,
        currentXP: newTotalXP,
        lastTaskDate: new Date(),
      },
      { new: true, upsert: true },
    );

    return NextResponse.json({
      success: true,
      data: {
        xpGained,
        totalXP: userAvatar.totalXP,
        totalTasksCompleted: newTotalTasksCompleted,
      },
    });
  } catch (error) {
    console.error('更新游戏化进度失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败', error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    await connectDB();

    const userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
      return NextResponse.json({
        success: true,
        data: {
          totalXP: 0,
          totalTasksCompleted: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalXP: userAvatar.totalXP,
        currentXP: userAvatar.currentXP,
        totalTasksCompleted: userAvatar.totalTasksCompleted,
        stage: userAvatar.stage,
      },
    });
  } catch (error) {
    console.error('获取游戏化统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 },
    );
  }
}
