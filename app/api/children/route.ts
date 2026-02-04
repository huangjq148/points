import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Child, { IChild } from '@/models/Child';

interface ChildPostRequest {
  userId: string;
  nickname: string;
  avatar?: string;
}

interface ChildPutRequest {
  childId: string;
  nickname?: string;
  avatar?: string;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ success: false, message: '缺少childId' }, { status: 400 });
    }

    const child = await Child.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, child: {
      id: child._id,
      nickname: child.nickname,
      avatar: child.avatar,
      totalPoints: child.totalPoints,
      availablePoints: child.availablePoints
    }});
  } catch (error: any) {
    console.error('Get child error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId, nickname, avatar }: ChildPostRequest = await request.json();

    const child = await Child.create({
      userId,
      nickname,
      avatar: avatar || '🦊',
      totalPoints: 0,
      availablePoints: 0
    });

    return NextResponse.json({ success: true, child });
  } catch (error: any) {
    console.error('Create child error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { childId, nickname, avatar }: ChildPutRequest = await request.json();

    const child = await Child.findByIdAndUpdate(
      childId,
      { nickname, avatar },
      { new: true }
    );

    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, child: {
      id: child._id,
      nickname: child.nickname,
      avatar: child.avatar,
      totalPoints: child.totalPoints,
      availablePoints: child.availablePoints
    }});
  } catch (error: any) {
    console.error('Update child error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
