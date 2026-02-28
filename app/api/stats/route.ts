import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import Order from '@/models/Order';
import { getTokenPayload } from '@/lib/auth';

interface TaskStatusAgg {
  _id: string;
  count: number;
  totalPoints?: number;
}

interface DailyStatAgg {
  _id: {
    year: number;
    month: number;
    day: number;
  };
  count: number;
  points: number;
}

interface DomainStatAgg {
  _id: string;
  count: number;
  points: number;
}

// 获取家庭统计数据
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // week, month
    const childId = searchParams.get('childId');

    const now = new Date();
    let startDate: Date;
    
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    }

    const matchQuery: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: now }
    };

    // 如果家长角色，查询其孩子的数据
    if (payload.role === 'parent') {
      const children = await User.find({ familyId: payload.familyId, role: 'child' });
      const childIds = children.map(c => c._id);
      matchQuery.childId = { $in: childIds };
    } else if (payload.role === 'child') {
      matchQuery.childId = new mongoose.Types.ObjectId(payload.userId);
    }

    // 特定孩子筛选
    if (childId) {
      matchQuery.childId = new mongoose.Types.ObjectId(childId);
    }

    // 1. 任务完成情况统计
    const taskStats = (await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points' }
        }
      }
    ])) as TaskStatusAgg[];

    // 2. 按类型统计
    const taskTypeStats = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. 按天统计（趋势）
    const dailyStats = (await Task.aggregate([
      { $match: { ...matchQuery, status: 'approved' } },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' }
          },
          count: { $sum: 1 },
          points: { $sum: '$points' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])) as DailyStatAgg[];

    // 4. 孩子表现排名（仅限家长）
    let childRankings: Array<Record<string, unknown>> = [];
    if (payload.role === 'parent') {
      childRankings = await Task.aggregate([
        { 
          $match: { 
            ...matchQuery,
            status: 'approved'
          }
        },
        {
          $group: {
            _id: '$childId',
            completedTasks: { $sum: 1 },
            totalPoints: { $sum: '$points' }
          }
        },
        { $sort: { totalPoints: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'child'
          }
        },
        { $unwind: '$child' },
        {
          $project: {
            childId: '$_id',
            childName: '$child.username',
            avatar: '$child.avatar',
            completedTasks: 1,
            totalPoints: 1
          }
        }
      ]);
    }

    // 5. 领域分析
    const domainStats = (await Task.aggregate([
      { $match: { ...matchQuery, status: 'approved' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          points: { $sum: '$points' }
        }
      }
    ])) as DomainStatAgg[];

    // 6. 订单/奖励兑换统计
    const orderStats = (await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: now },
          ...(childId && { childId: new mongoose.Types.ObjectId(childId) })
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points' }
        }
      }
    ])) as TaskStatusAgg[];

    // 格式化数据
    const stats = {
      period,
      dateRange: { start: startDate, end: now },
      tasks: {
        total: taskStats.reduce((sum: number, s) => sum + s.count, 0),
        completed: taskStats.find((s) => s._id === 'approved')?.count || 0,
        pending: taskStats.find((s) => s._id === 'pending')?.count || 0,
        submitted: taskStats.find((s) => s._id === 'submitted')?.count || 0,
        rejected: taskStats.find((s) => s._id === 'rejected')?.count || 0,
        totalPoints: taskStats.reduce((sum: number, s) => sum + (s.totalPoints || 0), 0)
      },
      dailyTrend: dailyStats.map(d => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        count: d.count,
        points: d.points
      })),
      domains: domainStats.map(d => ({
        type: d._id,
        count: d.count,
        points: d.points
      })),
      childRankings,
      orders: {
        total: orderStats.reduce((sum, s) => sum + s.count, 0),
        redeemed: orderStats.find(s => s._id === 'redeemed')?.count || 0,
        pending: orderStats.find(s => s._id === 'pending')?.count || 0,
        totalPoints: orderStats.reduce((sum, s) => sum + (s.totalPoints || 0), 0)
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
