import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task, { IAuditRecord, ITask } from "@/models/Task";
import User from "@/models/User";
import { getTokenPayload, getUserIdFromToken } from "@/lib/auth";
import { updateGamificationProgress } from "@/lib/gamification/progress";
import { AccountModel, TransactionModel } from "@/models/Economy";

interface ITaskQuery {
  childId?: mongoose.Types.ObjectId;
  status?: "pending" | "submitted" | "approved" | "rejected" | "expired" | "failed";
  userId?: mongoose.Types.ObjectId;
  name?: { $regex: string; $options: string };
  approvedAt?: { $gte?: Date; $lte?: Date };
  deadline?: { $gte?: Date; $lte?: Date; $exists?: boolean; $eq?: Date | null };
  $or?: Array<Record<string, unknown>>;
}

// 注意：周期任务自动创建功能已移至定时任务管理器
// 由 /api/scheduled-jobs 控制，不再在获取任务列表时自动创建

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const authUserId = payload.userId;
    const authRole = payload.role;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const status = searchParams.get("status") as ITask["status"];
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const searchName = searchParams.get("searchName");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const deadlineFrom = searchParams.get("deadlineFrom");
    const deadlineTo = searchParams.get("deadlineTo");
    const includeExpired = searchParams.get("includeExpired") === "true";
    const excludeCompletedBeforeDeadline = searchParams.get("excludeCompletedBeforeDeadline") === "true";

    // 注意：周期任务自动创建已移至定时任务管理器
    // 不再在获取任务列表时自动创建

    const query: ITaskQuery = {};
    if (authRole === "parent") {
      query.userId = new mongoose.Types.ObjectId(authUserId);
      if (childId) query.childId = new mongoose.Types.ObjectId(childId);
    } else if (authRole === "child") {
      query.childId = new mongoose.Types.ObjectId(authUserId);
    }

    if (status) query.status = status;

    // 添加搜索条件
    if (searchName) {
      query.name = { $regex: searchName, $options: "i" };
    }

    // 添加日期范围筛选
    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      query.approvedAt = dateQuery;
    }

    // 添加截止日期范围筛选
    if (deadlineFrom || deadlineTo) {
      const deadlineQuery: Record<string, Date> = {};
      if (deadlineFrom) deadlineQuery.$gte = new Date(deadlineFrom);
      if (deadlineTo) deadlineQuery.$lte = new Date(deadlineTo);
      query.deadline = deadlineQuery;
    }

    // 过滤已完成且截止日期已过的任务
    if (excludeCompletedBeforeDeadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.$or = [
        { status: { $ne: "approved" } },
        { deadline: { $exists: false } },
        { deadline: { $eq: null } },
        { deadline: { $gte: today } },
        { status: { $ne: "approved" }, deadline: { $lt: today } }
      ];
    }

    // 包含已过期的任务（未完成的且截止日期在今天之前）
    if (!includeExpired && !deadlineFrom && !deadlineTo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!query.$or) {
        query.$or = [
          { status: { $ne: "approved" } },
          { deadline: { $exists: false } },
          { deadline: { $eq: null } },
          { deadline: { $gte: today } }
        ];
      }
    }

    const skip = (page - 1) * limit;

    // 先查询任务
    const tasks = await Task.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 获取所有 childId
    const childIds = tasks.map(t => t.childId.toString());

    // 查询孩子信息
    const children = await User.find({ _id: { $in: childIds } })
      .select('_id nickname username avatar')
      .lean();

    // 创建孩子信息映射
    const childMap = new Map();
    children.forEach(c => {
      childMap.set(c._id.toString(), {
        name: c.nickname || c.username || '未知',
        avatar: c.avatar || '👶'
      });
    });

    // 组装数据
    const tasksWithChildInfo = tasks.map(task => {
      const childInfo = childMap.get(task.childId.toString()) || { name: '未知', avatar: '👶' };

      // 处理审核记录，确保日期正确序列化
      const auditHistory = task.auditHistory ? [...task.auditHistory]
        .sort((a, b) => {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA;
        })
        .map(record => ({
          ...record,
          _id: record._id?.toString(),
          submittedAt: record.submittedAt ? new Date(record.submittedAt).toISOString() : undefined,
          auditedAt: record.auditedAt ? new Date(record.auditedAt).toISOString() : undefined,
          auditedBy: record.auditedBy?.toString(),
        })) : [];

      return {
        ...task,
        _id: task._id.toString(),
        childId: task.childId.toString(),
        userId: task.userId.toString(),
        childName: childInfo.name,
        childAvatar: childInfo.avatar,
        // 日期字段序列化
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
        updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : undefined,
        submittedAt: task.submittedAt ? new Date(task.submittedAt).toISOString() : undefined,
        approvedAt: task.approvedAt ? new Date(task.approvedAt).toISOString() : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : undefined,
        deadline: task.deadline ? new Date(task.deadline).toISOString() : undefined,
        auditHistory,
      };
    });

    const total = await Task.countDocuments(query);

    return NextResponse.json({ success: true, tasks: tasksWithChildInfo, total, page, limit });
  } catch (error: unknown) {
    console.error("Get tasks error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await request.json();
    const {
      childId,
      name,
      description,
      points,
      type,
      icon,
      requirePhoto,
      imageUrl,
      deadline,
    } = body;

    if (!childId || !name || points === undefined) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 });
    }

    // 创建任务数据
    const taskData = {
      userId: authUserId,
      childId,
      name,
      description: description || "",
      points,
      type: type || "daily",
      icon: icon || "⭐",
      requirePhoto: requirePhoto || false,
      status: "pending",
      imageUrl,
      deadline: deadline ? new Date(deadline) : undefined,
    };

    const task = await Task.create(taskData);

    return NextResponse.json({ 
      success: true, 
      task,
      message: "任务创建成功"
    });
  } catch (error: unknown) {
    console.error("Create task error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await request.json();
    const { taskId, status, photoUrl, rejectionReason, name, description, points, type, icon, requirePhoto, imageUrl, deadline } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, message: "缺少taskId" }, { status: 400 });
    }

    // 先获取当前任务
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return NextResponse.json({ success: false, message: "任务不存在" }, { status: 404 });
    }

    const updateData: Partial<ITask> = {};

    // Status update logic
    if (status) {
      updateData.status = status;
      if (status === "submitted") {
        updateData.submittedAt = new Date();
        // Clear rejection reason when re-submitting
        updateData.rejectionReason = "";
        // 确保 auditHistory 数组存在
        if (!existingTask.auditHistory) {
          existingTask.auditHistory = [];
        }
        // 创建新的审核记录并添加到数组
        const newAuditRecord: IAuditRecord = {
          submittedAt: new Date(),
          photoUrl: photoUrl || undefined,
          submitNote: undefined,
        };
        existingTask.auditHistory.push(newAuditRecord);
        updateData.auditHistory = existingTask.auditHistory;
      }
      if (status === "approved" || status === "rejected") {
        updateData.approvedAt = status === "approved" ? new Date() : undefined;
        if (status === "approved") {
          updateData.completedAt = new Date();
        }
        // 更新最新的未审核记录
        if (existingTask.auditHistory && existingTask.auditHistory.length > 0) {
          // 找到最后一个未审核的记录
          for (let i = existingTask.auditHistory.length - 1; i >= 0; i--) {
            if (!existingTask.auditHistory[i].auditedAt) {
              existingTask.auditHistory[i].auditedAt = new Date();
              existingTask.auditHistory[i].status = status;
              existingTask.auditHistory[i].auditNote = rejectionReason || undefined;
              existingTask.auditHistory[i].auditedBy = new mongoose.Types.ObjectId(authUserId);
              break;
            }
          }
          updateData.auditHistory = existingTask.auditHistory;
        }
      }
    }

    // Regular field updates
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (points !== undefined) updateData.points = points;
    if (type) updateData.type = type;
    if (icon) updateData.icon = icon;
    if (requirePhoto !== undefined) updateData.requirePhoto = requirePhoto;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (photoUrl) updateData.photoUrl = photoUrl;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (deadline) updateData.deadline = new Date(deadline);

    // 保存更新后的任务
    const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true });

    if (!task) {
      return NextResponse.json({ success: false, message: "任务不存在" }, { status: 404 });
    }

    // Handle point transaction and gamification progress only if status is changing to approved
    let gamificationResult = null;
    let economyResult = null;
    if (status === "approved") {
      await User.findByIdAndUpdate(task.childId, {
        $inc: { totalPoints: task.points, availablePoints: task.points },
      });
      
      // 更新游戏化进度
      gamificationResult = await updateGamificationProgress(task.childId.toString(), task.points);
      
      // 经济系统奖励：金币和荣誉分
      const childId = task.childId.toString();
      const taskPoints = task.points;
      
      // 获取或创建账户
      let account = await AccountModel.findOne({ userId: new mongoose.Types.ObjectId(childId) });
      if (!account) {
        account = await AccountModel.create({
          userId: new mongoose.Types.ObjectId(childId),
          coins: 0,
          stars: 0,
          creditScore: 80,
          creditLimit: 100,
          creditUsed: 0,
          interestRate: 0.001,
        });
      }
      
      // 奖励金币 (任务积分 = 金币)
      const coinsEarned = taskPoints;
      account.coins += coinsEarned;
      
      // 奖励荣誉分 (任务积分的10%)
      const starsEarned = Math.max(1, Math.floor(taskPoints * 0.1));
      account.stars += starsEarned;
      
      await account.save();
      
      // 记录交易
      await TransactionModel.create({
        userId: new mongoose.Types.ObjectId(childId),
        type: 'reward',
        currency: 'coins',
        amount: coinsEarned,
        balance: account.coins,
        description: `完成任务: ${task.name}`,
        relatedTaskId: task._id,
      });
      
      await TransactionModel.create({
        userId: new mongoose.Types.ObjectId(childId),
        type: 'reward',
        currency: 'stars',
        amount: starsEarned,
        balance: account.stars,
        description: `完成任务荣誉奖励: ${task.name}`,
        relatedTaskId: task._id,
      });
      
      economyResult = {
        coinsEarned,
        starsEarned,
        totalCoins: account.coins,
        totalStars: account.stars,
      };

      return NextResponse.json({ 
        success: true, 
        task,
        gamification: gamificationResult,
        economy: economyResult,
      });
    }

    return NextResponse.json({ 
      success: true, 
      task,
      gamification: gamificationResult,
      economy: economyResult,
    });
  } catch (error: unknown) {
    console.error("Update task error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ success: false, message: "缺少taskId" }, { status: 400 });
    }

    const task = await Task.findByIdAndDelete(taskId);

    if (!task) {
      return NextResponse.json({ success: false, message: "任务不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "任务删除成功" });
  } catch (error: unknown) {
    console.error("Delete task error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
