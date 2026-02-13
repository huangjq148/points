import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reward, { IReward, RewardType } from '@/models/Reward';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getTokenPayload } from '@/lib/auth';

interface RewardGetQuery {
  userId?: string | { $in: mongoose.Types.ObjectId[] };
  isActive?: boolean;
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
    const isActiveParam = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: RewardGetQuery = {};
    
    if (authRole === 'parent') {
      query.userId = authUserId;
    } else {
      // For children, find rewards created by parents in the same family
      const childUser = await User.findById(authUserId);
      if (childUser && childUser.familyId) {
        const parents = await User.find({ familyId: childUser.familyId, role: 'parent' });
        const parentIds = parents.map(p => p._id);
        query.userId = { $in: parentIds };
      } else {
        return NextResponse.json({ success: false, message: 'Family not found' }, { status: 404 });
      }
    }

    if (isActiveParam !== null) query.isActive = isActiveParam === 'true';

    const skip = (page - 1) * limit;
    const rewards = await Reward.find(query)
      .sort({ points: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Reward.countDocuments(query);
    
    return NextResponse.json({ success: true, rewards, total, page, limit });
  } catch (error: unknown) {
    console.error('Get rewards error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);
    if (!payload || payload.role !== 'parent') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const authUserId = payload.userId;

    await connectDB();
    const { name, description, points, type, icon, stock }: Omit<IReward, 'userId'> = await request.json();

    const reward = await Reward.create({
      userId: authUserId,
      name,
      description,
      points,
      type,
      icon: icon || '🎁',
      stock: stock || -1,
      isActive: true
    });

    return NextResponse.json({ success: true, reward });
  } catch (error: unknown) {
    console.error('Create reward error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);
    if (!payload || payload.role !== 'parent') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const authUserId = payload.userId;

    await connectDB();
    const { rewardId, name, description, points, type, icon, stock, isActive } = await request.json();

    // Verify ownership
    const existingReward = await Reward.findById(rewardId);
    if (!existingReward) {
      return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
    }
    if (existingReward.userId.toString() !== authUserId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const updateData: Partial<IReward> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (points) updateData.points = points;
    if (type) updateData.type = type;
    if (icon) updateData.icon = icon;
    if (stock !== undefined) updateData.stock = stock;
    if (isActive !== undefined) updateData.isActive = isActive;

    const reward = await Reward.findByIdAndUpdate(rewardId, updateData, { new: true });

    return NextResponse.json({ success: true, reward });
  } catch (error: unknown) {
    console.error('Update reward error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);
    if (!payload || payload.role !== 'parent') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const authUserId = payload.userId;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const rewardId = searchParams.get('rewardId');

    if (!rewardId) {
      return NextResponse.json({ success: false, message: '缺少rewardId' }, { status: 400 });
    }

    // Verify ownership
    const existingReward = await Reward.findById(rewardId);
    if (!existingReward) {
      return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
    }
    if (existingReward.userId.toString() !== authUserId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await Reward.findByIdAndDelete(rewardId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete reward error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
