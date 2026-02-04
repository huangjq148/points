import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task, { ITask } from '@/models/Task';
import Child, { IChild } from '@/models/Child';

interface ITaskQuery {
  childId?: string;
  status?: 'pending' | 'submitted' | 'approved' | 'rejected';
  userId?: string;
}

interface ITaskUpdateData {
  status?: 'pending' | 'submitted' | 'approved' | 'rejected';
  photoUrl?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const status = searchParams.get('status') as ITask['status'];
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: ITaskQuery = {};
    if (childId) query.childId = childId;
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Task.countDocuments(query);
    
    return NextResponse.json({ success: true, tasks, total, page, limit });
  } catch (error: Error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { userId, childId, name, description, points, type, icon, requirePhoto } = body;

    if (!userId || !childId || !name || points === undefined) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const task = await Task.create({
      userId,
      childId,
      name,
      description: description || '',
      points,
      type: type || 'daily',
      icon: icon || '⭐',
      requirePhoto: requirePhoto || false,
      status: 'pending'
    });

    return NextResponse.json({ success: true, task });
  } catch (error: Error) {
    console.error('Create task error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { taskId, status, photoUrl } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, message: '缺少taskId' }, { status: 400 });
    }

    const updateData: ITaskUpdateData = { status };
    if (photoUrl) updateData.photoUrl = photoUrl;
    if (status === 'submitted') updateData.submittedAt = new Date();
    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.completedAt = new Date();
    }

    const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true });

    if (!task) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 });
    }

    if (status === 'approved') {
      await Child.findByIdAndUpdate(task.childId, {
        $inc: { totalPoints: task.points, availablePoints: task.points }
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: Error) {
    console.error('Update task error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
