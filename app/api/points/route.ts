import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { getUserIdFromToken } from '@/lib/auth';

interface PointsPostRequest {
  childId: string;
  points: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { childId, points, reason }: PointsPostRequest = await request.json();

    if (!childId || points === undefined) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const child: IUser | null = await User.findById(childId);
    if (!child) {
      return NextResponse.json({ success: false, message: '孩子不存在' }, { status: 404 });
    }

    await User.findByIdAndUpdate(childId, {
      $inc: {
        totalPoints: points,
        availablePoints: points
      }
    });

    const updatedChild: IUser | null = await User.findById(childId);

    return NextResponse.json({
      success: true,
      child: {
        id: updatedChild?._id,
        nickname: updatedChild?.username,
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
