import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order, { IOrder } from '@/models/Order';
import Reward, { IReward } from '@/models/Reward';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getUserIdFromToken } from '@/lib/auth';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface OrderGetQuery {
  userId?: string;
  childId?: string;
  status?: string;
}

interface OrderPostRequest {
  userId: mongoose.Types.ObjectId;
  childId: mongoose.Types.ObjectId;
  rewardId: mongoose.Types.ObjectId;
}

interface OrderPutRequest {
  orderId: mongoose.Types.ObjectId;
  action: 'verify' | 'cancel';
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const childId = searchParams.get('childId');
    const status = searchParams.get('status');

    const query: OrderGetQuery = {};
    if (userId) query.userId = userId;
    if (childId) query.childId = childId;
    if (status) query.status = status;

    const orders: IOrder[] = await Order.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, orders });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Get orders error:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    console.error('Get orders error:', String(error));
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { userId, childId, rewardId }: OrderPostRequest = await request.json();

    if (!userId || !childId || !rewardId) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const reward: IReward | null = await Reward.findById(rewardId);
    if (!reward) {
      return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
    }

    if (!reward.isActive) {
      return NextResponse.json({ success: false, message: '该奖励已下架' }, { status: 400 });
    }

    if (reward.stock === 0) {
      return NextResponse.json({ success: false, message: '该奖励已售罄' }, { status: 400 });
    }

    const child = await User.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    if ((child.availablePoints || 0) < reward.points) {
      return NextResponse.json({ success: false, message: '积分不足' }, { status: 400 });
    }

    const verificationCode: string = generateCode();

    const order: IOrder = await Order.create({
      userId,
      childId,
      rewardId,
      rewardName: reward.name,
      rewardIcon: reward.icon,
      pointsSpent: reward.points,
      status: 'pending',
      verificationCode
    });

    await User.findByIdAndUpdate(childId, {
      $inc: { availablePoints: -reward.points }
    });

    if (reward.stock > 0) {
      await Reward.findByIdAndUpdate(rewardId, {
        $inc: { stock: -1 }
      });
    }

    return NextResponse.json({
      success: true,
      order,
      verificationCode
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Create order error:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    console.error('Create order error:', String(error));
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { orderId, action }: OrderPutRequest = await request.json();

    if (!orderId) {
      return NextResponse.json({ success: false, message: '缺少orderId' }, { status: 400 });
    }

    const order: IOrder | null = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });
    }

    if (action === 'verify') {
      order.status = 'verified';
      order.verifiedAt = new Date();
      await order.save();
    } else if (action === 'cancel') {
      await User.findByIdAndUpdate(order.childId, {
        $inc: { availablePoints: order.pointsSpent }
      });

      await Reward.findByIdAndUpdate(order.rewardId, {
        $inc: { stock: 1 }
      });

      order.status = 'cancelled';
      await order.save();
    }

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Update order error:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    console.error('Update order error:', String(error));
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
