import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Child, { IChild } from '@/models/Child';

interface PointsPostRequest {
  childId: string;
  points: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { childId, points, reason }: PointsPostRequest = await request.json();

    if (!childId || points === undefined) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const child: IChild | null = await Child.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    await Child.findByIdAndUpdate(childId, {
      $inc: { 
        totalPoints: points,
        availablePoints: points 
      }
    });

    const updatedChild: IChild | null = await Child.findById(childId);

    return NextResponse.json({ 
      success: true, 
      child: {
        id: updatedChild?._id,
        nickname: updatedChild?.nickname,
        avatar: updatedChild?.avatar,
        totalPoints: updatedChild?.totalPoints,
        availablePoints: updatedChild?.availablePoints
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Adjust points error:', error);
    } else {
      console.error('Adjust points error:', String(error));
    }
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
