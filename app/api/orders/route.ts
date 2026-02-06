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

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    if (userId) query.userId = userId;
    if (childId) query.childId = childId;
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    // Logic to handle family orders
    // If userId is provided, we try to find all children belonging to this parent (family)
    // and include their orders as well, in case the userId on the order is incorrect (e.g. set to childId)
    if (userId) {
      const parentUser = await User.findById(userId);
      if (parentUser && parentUser.familyId) {
         // Find all children in this family
         const familyChildren = await User.find({ familyId: parentUser.familyId, role: 'child' });
         const childIds = familyChildren.map(c => c._id);
         
         // Modify query to be: (userId match) OR (childId in familyChildren)
         // We use $or to be safe
         delete query.userId; // Remove strict userId check
         delete query.childId; // If childId was set, we might override it? 
         // Actually if childId was set specifically, we should respect it.
         
         const baseQuery: Record<string, unknown> = {};
         if (status) baseQuery.status = query.status;
         
         const orConditions: Record<string, unknown>[] = [{ userId: userId }];
         if (childIds.length > 0) {
           orConditions.push({ childId: { $in: childIds } });
         }
         
         if (childId) {
            // If specific child requested, we just use that and ensure it's in the family
            query.childId = childId;
            // But we still want to fix the "userId might be wrong" issue.
            // So we search: childId == requestedChildId AND (userId == parent OR userId == childId OR whatever)
            // Actually if childId is specified, we just trust it?
            // Let's stick to the $or logic for the general list case.
         } else {
            query.$or = orConditions;
         }
      }
    }

    const skip = (page - 1) * limit;
    const orders: IOrder[] = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Order.countDocuments(query);
    
    return NextResponse.json({ success: true, orders, total, page, limit });
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
    const body: OrderPostRequest = await request.json();
    let { userId } = body;
    const { childId, rewardId } = body;

    // Fix: If userId is same as childId (Child created order), try to find the Parent ID
    if (userId === childId) {
       const childUser = await User.findById(childId);
       if (childUser && childUser.familyId) {
          // Find parent in the same family
          const parentUser = await User.findOne({ familyId: childUser.familyId, role: 'parent' });
          if (parentUser) {
             userId = parentUser._id as mongoose.Types.ObjectId;
          }
       }
    }

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
