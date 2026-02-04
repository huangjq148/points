import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Reward from '@/models/Reward';
import Child from '@/models/Child';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const childId = searchParams.get('childId');
    const status = searchParams.get('status');

    const query: any = {};
    if (userId) query.userId = userId;
    if (childId) query.childId = childId;
    if (status) query.status = status;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Get orders error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId, childId, rewardId } = await request.json();

    if (!userId || !childId || !rewardId) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
    }

    if (!reward.isActive) {
      return NextResponse.json({ success: false, message: '该奖励已下架' }, { status: 400 });
    }

    if (reward.stock === 0) {
      return NextResponse.json({ success: false, message: '该奖励已售罄' }, { status: 400 });
    }

    const child = await Child.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    if (child.availablePoints < reward.points) {
      return NextResponse.json({ success: false, message: '积分不足' }, { status: 400 });
    }

    const verificationCode = generateCode();

    const order = await Order.create({
      userId,
      childId,
      rewardId,
      rewardName: reward.name,
      rewardIcon: reward.icon,
      pointsSpent: reward.points,
      status: 'pending',
      verificationCode
    });

    await Child.findByIdAndUpdate(childId, {
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
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { orderId, action } = await request.json();

    if (!orderId) {
      return NextResponse.json({ success: false, message: '缺少orderId' }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });
    }

    if (action === 'verify') {
      order.status = 'verified';
      order.verifiedAt = new Date();
      await order.save();
    } else if (action === 'cancel') {
      await Child.findByIdAndUpdate(order.childId, {
        $inc: { availablePoints: order.pointsSpent }
      });
      
      await Reward.findByIdAndUpdate(order.rewardId, {
        $inc: { stock: 1 }
      });
      
      order.status = 'cancelled';
      await order.save();
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Update order error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
