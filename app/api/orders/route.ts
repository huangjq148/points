import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order, { IOrder } from '@/models/Order';
import Reward, { IReward } from '@/models/Reward';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getTokenPayload, getUserIdFromToken } from '@/lib/auth';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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

function toObjectId(value: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const authUserId = payload.userId;
    const authRole = payload.role;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const status = searchParams.get('status');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    
    if (authRole === 'parent') {
      const parentUser = await User.findById(authUserId);
      if (parentUser && parentUser.familyId) {
         // Find all children in this family
         const familyChildren = await User.find({ familyId: parentUser.familyId, role: 'child' });
         const childIds = familyChildren.map(c => c._id);
         
         const authUserObjectId = toObjectId(authUserId);
         const orConditions: Record<string, unknown>[] = authUserObjectId ? [{ userId: authUserObjectId }] : [];
         if (childIds.length > 0) {
           orConditions.push({ childId: { $in: childIds } });
         }
         
         if (childId) {
            const childObjectId = toObjectId(childId);
            if (!childObjectId) {
              return NextResponse.json({ success: false, message: '无效的 childId' }, { status: 400 });
            }
            query.childId = childObjectId;
         } else {
            query.$or = orConditions;
         }
      } else {
        const authUserObjectId = toObjectId(authUserId);
        if (!authUserObjectId) {
          return NextResponse.json({ success: false, message: '无效的用户ID' }, { status: 400 });
        }
        query.userId = authUserObjectId;
      }
    } else {
      const authUserObjectId = toObjectId(authUserId);
      if (!authUserObjectId) {
        return NextResponse.json({ success: false, message: '无效的用户ID' }, { status: 400 });
      }
      query.childId = authUserObjectId;
    }

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    const skip = (page - 1) * limit;
    
    // Use aggregation to join with User collection for child details
    const orders = await Order.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "childId",
          foreignField: "_id",
          as: "childInfo",
        },
      },
      {
        $lookup: {
          from: "rewards",
          localField: "rewardId",
          foreignField: "_id",
          as: "rewardInfo",
        },
      },
      {
        $addFields: {
          childName: {
            $let: {
              vars: { firstChild: { $arrayElemAt: ["$childInfo", 0] } },
              in: { $ifNull: ["$$firstChild.nickname", "$$firstChild.username", "未知"] },
            },
          },
          childAvatar: {
            $let: {
              vars: { firstChild: { $arrayElemAt: ["$childInfo", 0] } },
              in: { $ifNull: ["$$firstChild.avatar", "👶"] },
            },
          },
          privilegeMeta: {
            $let: {
              vars: { firstReward: { $arrayElemAt: ["$rewardInfo", 0] } },
              in: {
                isPrivilege: { $eq: ["$$firstReward.type", "privilege"] },
                startsAt: {
                  $cond: [{ $eq: ["$status", "verified"] }, "$verifiedAt", null],
                },
                endsAt: {
                  $cond: [
                    { $eq: ["$status", "verified"] },
                    "$validUntil",
                    {
                      $cond: [
                        { $eq: ["$status", "pending"] },
                        "$$firstReward.expiresAt",
                        null,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { childInfo: 0, rewardInfo: 0 } },
    ]);
      
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
    const payload = getTokenPayload(authHeader);
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body: OrderPostRequest = await request.json();
    const { rewardId } = body;
    let { childId } = body;
    let userId: string | mongoose.Types.ObjectId = "";

    if (payload.role === 'parent') {
      userId = payload.userId;
      if (!childId) {
        return NextResponse.json({ success: false, message: '缺少 childId' }, { status: 400 });
      }
    } else {
      // If child created order, find the Parent ID from family
      childId = payload.userId as unknown as mongoose.Types.ObjectId;
      const childUser = await User.findById(payload.userId);
      if (childUser && childUser.familyId) {
        const parentUser = await User.findOne({ familyId: childUser.familyId, role: 'parent' });
        if (parentUser) {
          userId = parentUser._id as mongoose.Types.ObjectId;
        }
      }
      if (!userId) {
        // Fallback if no parent found (should not happen in normal flow)
        userId = payload.userId;
      }
    }

    if (!rewardId) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const reward: IReward | null = await Reward.findById(rewardId);
    if (!reward) {
      return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
    }

    if (!reward.isActive) {
      return NextResponse.json({ success: false, message: '该奖励已下架' }, { status: 400 });
    }

    if (reward.type === 'privilege' && reward.expiresAt && new Date(reward.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: '该特权奖励已过兑换截止日期' }, { status: 400 });
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
      verificationCode,
      validUntil: null,
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
      const reward = await Reward.findById(order.rewardId);
      if (!reward) {
        return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
      }
      if (reward.type === 'privilege' && reward.expiresAt && reward.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ success: false, message: '该特权奖励已过期' }, { status: 400 });
      }

      const verifiedAt = new Date();
      order.status = 'verified';
      order.verifiedAt = verifiedAt;
      if (reward.type === 'privilege' && reward.validDurationValue && reward.validDurationUnit) {
        const ms = reward.validDurationUnit === 'day'
          ? reward.validDurationValue * 24 * 60 * 60 * 1000
          : reward.validDurationValue * 60 * 60 * 1000;
        order.validUntil = new Date(verifiedAt.getTime() + ms);
      } else {
        order.validUntil = null;
      }
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
