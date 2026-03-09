import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import Order from '@/models/Order';
import { getTokenPayload } from '@/lib/auth';
import mongoose from 'mongoose';

interface DeductPointsRequest {
  childId: string;
  points: number;
  reason: string;
  pin?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const authUserId = payload.userId;
    const authRole = payload.role;

    // 只有家长才能扣除积分
    if (authRole !== 'parent') {
      return NextResponse.json({ success: false, message: '只有家长才能扣除积分' }, { status: 403 });
    }

    await connectDB();

    const { childId, points, reason }: DeductPointsRequest = await request.json();

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
        message: '扣除积分必须大于0' 
      }, { status: 400 });
    }

    // 验证原因不能为空
    if (!reason.trim()) {
      return NextResponse.json({ 
        success: false, 
        message: '扣除原因不能为空' 
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
        message: '只能扣除孩子的积分' 
      }, { status: 400 });
    }

    // 验证积分是否足够
    if ((child.availablePoints || 0) < points) {
      return NextResponse.json({ 
        success: false, 
        message: '积分不足，无法扣除' 
      }, { status: 400 });
    }

    // 扣除积分
    await User.findByIdAndUpdate(childId, {
      $inc: {
        totalPoints: -points,
        availablePoints: -points
      }
    });

    // 创建扣除记录（复用Order模型，类型为deduction）
    await Order.create({
      userId: new mongoose.Types.ObjectId(authUserId),
      childId: new mongoose.Types.ObjectId(childId),
      rewardId: new mongoose.Types.ObjectId(), // 使用临时ObjectId，因为rewardId是必需的
      rewardName: reason, // 使用原因作为名称
      rewardIcon: '⚠️', // 扣除图标
      pointsSpent: points,
      status: 'verified', // 扣除记录直接标记为verified
      verificationCode: 'DEDUCT', // 扣除记录特殊标记
      type: 'deduction', // 扣除类型
      deductedBy: new mongoose.Types.ObjectId(authUserId),
      verifiedAt: new Date()
    });

    // 获取更新后的孩子信息
    const updatedChild: IUser | null = await User.findById(childId);

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
        deductedPoints: points,
        reason: reason
      }
    });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Deduct points error:', error);
    } else {
      console.error('Deduct points error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
