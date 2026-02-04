import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reward, { IReward, RewardType } from '@/models/Reward';
import mongoose from 'mongoose';

interface RewardGetQuery {
  userId?: string;
  isActive?: boolean;
}

interface RewardPostRequest {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  points: number;
  type: RewardType;
  icon?: string;
  stock?: number;
}

interface RewardPutRequest {
  rewardId: string;
  name?: string;
  description?: string;
  points?: number;
  type?: RewardType;
  icon?: string;
  stock?: number;
  isActive?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isActiveParam = searchParams.get('isActive');

    const query: RewardGetQuery = {};
    if (userId) query.userId = userId;
    if (isActiveParam !== null) query.isActive = isActiveParam === 'true';

    const rewards = await Reward.find(query).sort({ points: 1 }).lean();
    return NextResponse.json({ success: true, rewards });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Get rewards error:', error);
    } else {
      console.error('Get rewards error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId, name, description, points, type, icon, stock }: RewardPostRequest = await request.json();

    const reward = await Reward.create({
      userId,
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
    if (error instanceof Error) {
      console.error('Create reward error:', error);
    } else {
      console.error('Create reward error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { rewardId, name, description, points, type, icon, stock, isActive }: RewardPutRequest = await request.json();

    const updateData: Partial<IReward> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (points) updateData.points = points;
    if (type) updateData.type = type;
    if (icon) updateData.icon = icon;
    if (stock !== undefined) updateData.stock = stock;
    if (isActive !== undefined) updateData.isActive = isActive;

    const reward = await Reward.findByIdAndUpdate(rewardId, updateData, { new: true });

    if (!reward) {
      return NextResponse.json({ success: false, message: '奖励不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, reward });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Update reward error:', error);
    } else {
      console.error('Update reward error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const rewardId = searchParams.get('rewardId');

    if (!rewardId) {
      return NextResponse.json({ success: false, message: '缺少rewardId' }, { status: 400 });
    }

    await Reward.findByIdAndDelete(rewardId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Delete reward error:', error);
    } else {
      console.error('Delete reward error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
