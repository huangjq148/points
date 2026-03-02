import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { UserAvatar, MedalDefinition, UserMedal } from '@/models/Gamification';
import { getTokenPayload } from '@/lib/auth';

interface AvatarProgressLike {
  totalXP: number;
  totalTasksCompleted: number;
}

async function checkAndAwardMedals(userId: string, userAvatar: AvatarProgressLike) {
  const newMedals: Array<Record<string, unknown>> = [];
  const allMedals = await MedalDefinition.find();
  const existingUserMedals = await UserMedal.find({ userId: new mongoose.Types.ObjectId(userId) });
  const existingMedalIds = new Set(existingUserMedals.map((um) => um.medalId.toString()));

  for (const medal of allMedals) {
    if (existingMedalIds.has(medal._id.toString())) continue;
    if (medal.requirementType !== 'total') continue;

    const requirementMet = userAvatar.totalTasksCompleted >= medal.requirement;
    if (!requirementMet) continue;

    await UserMedal.create({
      userId: new mongoose.Types.ObjectId(userId),
      medalId: medal._id,
      earnedAt: new Date(),
      progress: medal.requirement,
      isNew: true,
    });

    newMedals.push({
      ...medal.toObject(),
      isNew: true,
    });
  }

  return newMedals;
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
    const { taskPoints = 10, isTaskCompletion = true } = body;

    await connectDB();

    let userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
      userAvatar = await UserAvatar.create({
        userId: new mongoose.Types.ObjectId(userId),
        level: 1,
        currentXP: 0,
        totalXP: 0,
        stage: 'egg',
        unlockedSkins: ['default'],
        currentSkin: 'default',
        equippedAccessories: [],
        unlockedAccessories: [],
        consecutiveDays: 0,
        maxConsecutiveDays: 0,
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
        consecutiveDays: 0,
        maxConsecutiveDays: 0,
        lastTaskDate: new Date(),
      },
      { new: true, upsert: true },
    );

    const newMedals = await checkAndAwardMedals(userId, {
      totalXP: newTotalXP,
      totalTasksCompleted: newTotalTasksCompleted,
    });

    return NextResponse.json({
      success: true,
      data: {
        xpGained,
        totalXP: userAvatar.totalXP,
        totalTasksCompleted: newTotalTasksCompleted,
        newMedals,
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

    const medalCount = await UserMedal.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

    return NextResponse.json({
      success: true,
      data: {
        totalXP: userAvatar.totalXP,
        currentXP: userAvatar.currentXP,
        totalTasksCompleted: userAvatar.totalTasksCompleted,
        medalCount,
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
