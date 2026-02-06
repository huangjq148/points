import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getUserIdFromToken } from '@/lib/auth';
import mongoose from 'mongoose';

interface ChildPostRequest {
  username: string;
  nickname?: string;
  avatar?: string;
  password?: string;
}

interface ChildPutRequest {
  childId: string;
  username?: string;
  avatar?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ success: false, message: '缺少childId' }, { status: 400 });
    }

    const child = await User.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true, child: {
        id: child._id,
        nickname: child.identity || child.username,
        username: child.username,
        avatar: child.avatar,
        totalPoints: child.totalPoints || 0,
        availablePoints: child.availablePoints || 0
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Get child error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { username, nickname, avatar, password }: ChildPostRequest = await request.json();

    const parentUser = await User.findById(authUserId);
    if (!parentUser) {
      return NextResponse.json({ success: false, message: '家长账户不存在' }, { status: 404 });
    }

    // Ensure parent has a familyId
    if (!parentUser.familyId) {
      parentUser.familyId = new mongoose.Types.ObjectId();
      await parentUser.save();
    }

    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ success: false, message: '该用户名已存在，请换一个' }, { status: 400 });
    }

    const child = await User.create({
      username: username || nickname,
      password: password || '123456', // Default password
      role: 'child',
      familyId: parentUser.familyId,
      avatar: avatar || '🦊',
      totalPoints: 0,
      availablePoints: 0,
      identity: nickname || '孩子'
    });

    return NextResponse.json({ 
      success: true, 
      child: {
        id: child._id,
        nickname: child.identity || child.username,
        username: child.username,
        avatar: child.avatar,
        totalPoints: child.totalPoints,
        availablePoints: child.availablePoints
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Create child error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { childId, username, avatar }: ChildPutRequest = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (username) updateData.username = username;
    if (avatar) updateData.avatar = avatar;

    const child = await User.findByIdAndUpdate(
      childId,
      updateData,
      { new: true }
    );

    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true, child: {
        id: child._id,
        nickname: child.identity || child.username,
        username: child.username,
        avatar: child.avatar,
        totalPoints: child.totalPoints,
        availablePoints: child.availablePoints
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Update child error:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 11000) {
      return NextResponse.json({ success: false, message: '用户名已存在' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
