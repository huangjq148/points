import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { TransactionModel } from '@/models/Economy';
import { getTokenPayload } from '@/lib/auth';
import mongoose from 'mongoose';

interface RewardPointsRequest {
  childId: string;
  points: number;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const authRole = payload.role;

    // 只有家长才能奖励积分
    if (authRole !== 'parent') {
      return NextResponse.json({ success: false, message: '只有家长才能奖励积分' }, { status: 403 });
    }

    await connectDB();

    const { childId, points, reason }: RewardPointsRequest = await request.json();

    // 参数验证
    if (!childId || points === undefined || !reason) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 });
    }

    // 验证积分是否为正数
    if (points <= 0) {
      return NextResponse.json({
        success: false,
        message: '奖励积分必须大于0'
      }, { status: 400 });
    }

    // 验证原因不能为空
    if (!reason.trim()) {
      return NextResponse.json({
        success: false,
        message: '奖励原因不能为空'
      }, { status: 400 });
    }

    // 查找孩子
    const child: IUser | null = await User.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    // 验证孩子角色
    if (child.role !== 'child') {
      return NextResponse.json({
        success: false,
        message: '只能奖励孩子的积分'
      }, { status: 400 });
    }

    const childObjectId = new mongoose.Types.ObjectId(childId);
    const currentChild = await User.findById(childObjectId);
    if (!currentChild) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    const updatedAvailablePoints = (currentChild.availablePoints || 0) + points;

    await User.findByIdAndUpdate(childObjectId, {
      $inc: {
        totalPoints: points,
        availablePoints: points
      }
    });

    await TransactionModel.create({
      userId: childObjectId,
      type: 'reward',
      currency: 'coins',
      amount: points,
      balance: updatedAvailablePoints,
      description: reason,
    });

    const updatedChild: IUser | null = await User.findById(childObjectId);

    return NextResponse.json({
      success: true,
      data: {
        child: {
          id: updatedChild?._id,
          nickname: updatedChild?.nickname || updatedChild?.username,
          avatar: updatedChild?.avatar,
          totalPoints: updatedChild?.totalPoints,
          availablePoints: updatedChild?.availablePoints
        },
        rewardedPoints: points,
        reason: reason
      }
    });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Reward points error:', error);
    } else {
      console.error('Reward points error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
