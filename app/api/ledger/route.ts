import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import Order from '@/models/Order';
import { TransactionModel } from '@/models/Economy';
import mongoose from 'mongoose';
import { getTokenPayload } from '@/lib/auth';

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

interface TransactionQuery {
  userId: mongoose.Types.ObjectId;
  createdAt?: DateFilter;
  description?: { $regex: string; $options: string };
}

interface LedgerTask {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  points: number;
  status: string;
  requirePhoto?: boolean;
  approvedAt?: Date;
  updatedAt: Date;
  submittedAt?: Date;
  rejectionReason?: string;
  photoUrl?: string;
  icon?: string;
  imageUrl?: string;
  auditHistory?: Array<{
    submittedAt: Date;
    photoUrl?: string;
    submitNote?: string;
    auditedAt?: Date;
    status?: 'approved' | 'rejected';
    auditNote?: string;
  }>;
}

interface LedgerOrder {
  _id: mongoose.Types.ObjectId;
  rewardName: string;
  pointsSpent: number;
  createdAt: Date;
  rewardIcon?: string;
  type?: 'reward' | 'deduction';
}

interface LedgerTransaction {
  _id: mongoose.Types.ObjectId;
  type: 'income' | 'expense' | 'reward';
  amount: number;
  description: string;
  createdAt: Date;
  currency: 'coins' | 'stars';
  relatedTaskId?: mongoose.Types.ObjectId;
  relatedRewardId?: mongoose.Types.ObjectId;
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
  const typeFilter = searchParams.get('typeFilter') as 'all' | 'income' | 'expense' | null;

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

    const transactionQuery: TransactionQuery = {
      userId: objectId,
    };
    if (hasDateFilter) {
      transactionQuery.createdAt = dateFilter;
    }
    if (keyword) {
      transactionQuery.description = { $regex: keyword, $options: 'i' };
    }

    // Fetch data
    const [tasks, orders, transactions] = await Promise.all([
      Task.find(taskQuery).lean(),
      Order.find(orderQuery).lean(),
      TransactionModel.find(transactionQuery).lean()
    ]);

    // Normalize and merge
    const ledger = [
      ...(tasks as unknown as LedgerTask[]).map((t) => ({
        _id: t._id,
        sourceType: 'task',
        sourceId: t._id.toString(),
        type: 'income',
        name: t.name,
        points: t.points,
        date: t.approvedAt || t.updatedAt,
        icon: t.icon || '⭐',
        taskDetail: {
          _id: t._id.toString(),
          name: t.name,
          description: t.description || "",
          icon: t.icon || "⭐",
          points: t.points,
          status: t.status,
          requirePhoto: t.requirePhoto || false,
          approvedAt: t.approvedAt || null,
          submittedAt: t.submittedAt || null,
          updatedAt: t.updatedAt,
          rejectionReason: t.rejectionReason || "",
          photoUrl: t.photoUrl || "",
          imageUrl: t.imageUrl || "",
          auditHistory: (t.auditHistory || []).map((record) => ({
            submittedAt: record.submittedAt,
            photoUrl: record.photoUrl || "",
            submitNote: record.submitNote || "",
            auditedAt: record.auditedAt || null,
            status: record.status || undefined,
            auditNote: record.auditNote || "",
          })),
        },
      })),
      ...(orders as unknown as LedgerOrder[]).map((o) => ({
        _id: o._id,
        sourceType: 'order',
        sourceId: o._id.toString(),
        type: o.type === 'deduction' ? 'deduction' : o.type === 'reward' && o.pointsSpent < 0 ? 'reward' : 'expense',
        name: o.rewardName,
        points: Math.abs(o.pointsSpent),
        date: o.createdAt,
        icon: o.rewardIcon || (o.type === 'deduction' ? '⚠️' : '🎁'),
        feedback: o.rewardName,
      })),
      ...(transactions as unknown as LedgerTransaction[])
        // 任务完成会同时写入任务账目和金币/荣誉分交易记录；
        // 钱包页只展示一条任务收入，因此过滤掉关联任务的交易记录。
        .filter((t) => !t.relatedTaskId)
        .map((t) => ({
        _id: t._id,
        sourceType: 'transaction',
        sourceId: t._id.toString(),
        type: t.type === 'reward' ? 'reward' : t.type === 'income' ? 'income' : 'expense',
        name: t.description,
        points: Math.abs(t.amount),
        date: t.createdAt,
        icon: t.type === 'reward' ? '🎁' : t.type === 'expense' ? '⚠️' : '⭐',
        feedback: t.description,
      }))
    ];

    const filteredLedger = typeFilter && typeFilter !== 'all'
      ? ledger.filter((item) => {
          const isIncome = item.type === 'income' || item.type === 'reward';
          const isExpense = item.type === 'expense' || item.type === 'deduction';
          return typeFilter === 'income' ? isIncome : isExpense;
        })
      : ledger;

    // Sort by date desc
    filteredLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const total = filteredLedger.length;
    const paginatedData = filteredLedger.slice((page - 1) * limit, page * limit);

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
