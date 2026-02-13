import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import { getTokenPayload, getUserIdFromToken } from '@/lib/auth';

interface DateFilter {
  $gte?: Date;
  $lte?: Date;
}

interface TaskQuery {
  childId: mongoose.Types.ObjectId;
  status: string;
  updatedAt?: DateFilter;
  name?: { $regex: string; $options: string };
}

interface OrderQuery {
  childId: mongoose.Types.ObjectId;
  status: { $in: string[] };
  createdAt?: DateFilter;
  rewardName?: { $regex: string; $options: string };
}

interface LedgerTask {
  _id: mongoose.Types.ObjectId;
  name: string;
  points: number;
  approvedAt?: Date;
  updatedAt: Date;
  icon?: string;
}

interface LedgerOrder {
  _id: mongoose.Types.ObjectId;
  rewardName: string;
  pointsSpent: number;
  createdAt: Date;
  rewardIcon?: string;
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const keyword = searchParams.get('keyword');

    let targetChildId: string;

    if (authRole === 'parent') {
      // Parent can see ledger for a specific child
      if (!childId) {
        return NextResponse.json({ success: false, message: 'Missing childId' }, { status: 400 });
      }
      targetChildId = childId;
    } else {
      // Child can only see their own ledger
      targetChildId = authUserId;
    }

    const objectId = new mongoose.Types.ObjectId(targetChildId);

    // Build date filter
    const dateFilter: DateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (!dateFilter.$gte) delete dateFilter.$gte;
      dateFilter.$lte = end;
    }
    const hasDateFilter = startDate || endDate;

    // Build Task Query
    const taskQuery: TaskQuery = {
      childId: objectId,
      status: 'approved'
    };
    if (hasDateFilter) {
      taskQuery.updatedAt = dateFilter; // Using updatedAt as approximation for approval time if approvedAt missing
    }
    if (keyword) {
      taskQuery.name = { $regex: keyword, $options: 'i' };
    }

    // Build Order Query
    const orderQuery: OrderQuery = {
      childId: objectId,
      status: { $in: ['pending', 'verified'] }
    };
    if (hasDateFilter) {
      orderQuery.createdAt = dateFilter;
    }
    if (keyword) {
      orderQuery.rewardName = { $regex: keyword, $options: 'i' };
    }

    // Fetch data
    const [tasks, orders] = await Promise.all([
      Task.find(taskQuery).lean(),
      Order.find(orderQuery).lean()
    ]);

    // Normalize and merge
    const ledger = [
      ...(tasks as unknown as LedgerTask[]).map((t) => ({
        _id: t._id,
        type: 'income',
        name: t.name,
        points: t.points,
        date: t.approvedAt || t.updatedAt,
        icon: t.icon || '⭐'
      })),
      ...(orders as unknown as LedgerOrder[]).map((o) => ({
        _id: o._id,
        type: 'expense',
        name: o.rewardName,
        points: o.pointsSpent,
        date: o.createdAt,
        icon: o.rewardIcon || '🎁'
      }))
    ];

    // Sort by date desc
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const total = ledger.length;
    const paginatedData = ledger.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: unknown) {
    console.error('Get ledger error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
