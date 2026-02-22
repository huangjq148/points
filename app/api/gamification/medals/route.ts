import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { MedalDefinition, UserMedal, UserAvatar } from '@/models/Gamification';
import { getTokenPayload } from '@/lib/auth';

// 获取用户勋章墙数据
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
    
    // 支持家长查询孩子的勋章
    let targetUserId = payload.userId;
    if (payload.role === 'parent' && childId) {
      targetUserId = childId;
    }

    // 获取所有勋章定义
    const allMedals = await MedalDefinition.find().sort({ order: 1 });

    // 获取用户已获得的勋章
    const userMedals = await UserMedal.find({ userId: new mongoose.Types.ObjectId(targetUserId) })
      .populate('medalId');

    // 获取用户角色数据（用于进度计算）
    const userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(targetUserId) });

    const earnedMedalIds = new Set(userMedals.map(um => um.medalId._id.toString()));

    // 构建勋章墙数据
    const medalWall = allMedals.map(medal => {
      const userMedal = userMedals.find(um => um.medalId._id.toString() === medal._id.toString());
      const isEarned = earnedMedalIds.has(medal._id.toString());

      // 计算进度
      let progress = 0;
      let progressPercent = 0;

      if (isEarned) {
        progress = medal.requirement;
        progressPercent = 100;
      } else if (userAvatar) {
        if (medal.requirementType === 'total') {
          progress = userAvatar.totalTasksCompleted;
        } else if (medal.requirementType === 'consecutive') {
          progress = userAvatar.maxConsecutiveDays;
        }
        progressPercent = Math.min(100, Math.round((progress / medal.requirement) * 100));
      }

      return {
        id: medal._id,
        type: medal.type,
        level: medal.level,
        name: medal.name,
        description: medal.description,
        icon: medal.icon,
        requirement: medal.requirement,
        requirementType: medal.requirementType,
        xpReward: medal.xpReward,
        color: medal.color,
        isEarned,
        earnedAt: userMedal?.earnedAt || null,
        isNew: userMedal?.isNew || false,
        progress,
        progressPercent,
      };
    });

    // 按类型分组
    const groupedMedals = {
      task_master: medalWall.filter(m => m.type === 'task_master'),
      persistence: medalWall.filter(m => m.type === 'persistence'),
    };

    // 统计信息
    const stats = {
      total: allMedals.length,
      earned: userMedals.length,
      newMedals: userMedals.filter(um => um.isNew).length,
      totalXPEarned: userMedals.reduce((sum, um) => {
        const medal = allMedals.find(m => m._id.toString() === um.medalId._id.toString());
        return sum + (medal?.xpReward || 0);
      }, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        medals: medalWall,
        groupedMedals,
        stats,
      },
    });
  } catch (error) {
    console.error('获取勋章墙失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 标记勋章为已查看（清除new标记）
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { medalId } = body;

    await connectDB();

    if (medalId) {
      // 标记单个勋章为已查看
      await UserMedal.findOneAndUpdate(
        { 
          userId: new mongoose.Types.ObjectId(userId),
          medalId: new mongoose.Types.ObjectId(medalId)
        },
        { isNew: false }
      );
    } else {
      // 标记所有勋章为已查看
      await UserMedal.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), isNew: true },
        { isNew: false }
      );
    }

    return NextResponse.json({
      success: true,
      message: '勋章已标记为已查看',
    });
  } catch (error) {
    console.error('更新勋章状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}