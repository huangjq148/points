import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task, { ITask } from "@/models/Task";
import User from "@/models/User";
import { getTokenPayload, getUserIdFromToken } from "@/lib/auth";
import { updateGamificationProgress } from "@/lib/gamification/progress";
import { checkAndAwardAchievements } from "@/lib/gamification/achievements";
import type { TaskCompletionContext } from "@/lib/gamification/achievements";
import { AccountModel, TransactionModel } from "@/models/Economy";

interface ITaskQuery {
  childId?: mongoose.Types.ObjectId;
  status?: "pending" | "submitted" | "approved" | "rejected" | "expired" | "failed";
  userId?: mongoose.Types.ObjectId;
  name?: { $regex: string; $options: string };
  approvedAt?: { $gte?: Date; $lte?: Date };
  deadline?: { $gte?: Date; $lte?: Date; $exists?: boolean; $eq?: Date | null };
  $or?: Array<Record<string, any>>;
}

async function generateRecurringTasks(userId: string) {
  const recurringTasks = await Task.find({
    userId,
    recurrence: { $in: ["daily", "weekly"] },
  });

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  for (const template of recurringTasks) {
    let shouldCreate = false;

    if (template.recurrence === "daily") {
      shouldCreate = true;
    } else if (template.recurrence === "weekly") {
      // Default to Sunday (0) if not specified, or skip?
      // If recurrenceDay is present, match it.
      if (template.recurrenceDay !== undefined && template.recurrenceDay === dayOfWeek) {
        shouldCreate = true;
      }
    } else if (template.recurrence === "monthly") {
      if (template.recurrenceDay !== undefined && template.recurrenceDay === dayOfMonth) {
        shouldCreate = true;
      }
    }

    if (!shouldCreate) continue;

    // Check if template itself was created today (to avoid double creation on creation day)
    if (template.createdAt >= startOfToday) continue;

    // Check for existing instance created TODAY
    const instance = await Task.findOne({
      originalTaskId: template._id,
      createdAt: { $gte: startOfToday },
    });

    if (!instance) {
      await Task.create({
        userId: template.userId,
        childId: template.childId,
        name: template.name,
        description: template.description,
        points: template.points,
        type: template.type,
        icon: template.icon,
        requirePhoto: template.requirePhoto,
        imageUrl: template.imageUrl,
        status: "pending",
        recurrence: "none",
        originalTaskId: template._id,
      });
    }
  }
}

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

    if (authRole === "parent") {
      await generateRecurringTasks(authUserId);
    }

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

    // Use aggregation to join with User collection for child details
    const tasks = await Task.aggregate([
      { $match: query },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "childId",
          foreignField: "_id",
          as: "childInfo",
        },
      },
      {
        $addFields: {
          childName: {
            $let: {
              vars: { firstChild: { $arrayElemAt: ["$childInfo", 0] } },
              in: { $ifNull: ["$$firstChild.nickname", "$$firstChild.username", "未知"] },
            },
          },
          childAvatar: {
            $let: {
              vars: { firstChild: { $arrayElemAt: ["$childInfo", 0] } },
              in: { $ifNull: ["$$firstChild.avatar", "👶"] },
            },
          },
        },
      },
      { $project: { childInfo: 0 } },
    ]);

    const total = await Task.countDocuments(query);

    return NextResponse.json({ success: true, tasks, total, page, limit });
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
      recurrence,
      recurrenceDay,
      deadline,
    } = body;

    if (!childId || !name || points === undefined) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 });
    }

    const task = await Task.create({
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
      recurrence: recurrence || "none",
      recurrenceDay,
      deadline: deadline ? new Date(deadline) : undefined,
    });

    return NextResponse.json({ success: true, task });
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

    const updateData: Partial<ITask> = {};

    // Status update logic
    if (status) {
      updateData.status = status;
      if (status === "submitted") {
        updateData.submittedAt = new Date();
        // Clear rejection reason when re-submitting
        updateData.rejectionReason = ""; 
      }
      if (status === "approved") {
        updateData.approvedAt = new Date();
        updateData.completedAt = new Date();
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

      // 检查成就
      const previousStatus = task.status;
      const isResubmit = previousStatus === 'rejected';
      const previousRejectedAt = task.rejectionReason ? task.updatedAt : undefined;
      
      const now = new Date();
      const childBirthday = await User.findById(task.childId).select('birthday');
      const isBirthday = childBirthday?.birthday && 
        now.getMonth() === childBirthday.birthday.getMonth() &&
        now.getDate() === childBirthday.birthday.getDate();

      const achievementContext: TaskCompletionContext = {
        task: task,
        completedAt: now,
        isResubmit,
        previousRejectedAt,
        isBirthday,
      };

      const achievementResult = await checkAndAwardAchievements(task.childId.toString(), achievementContext);

      return NextResponse.json({ 
        success: true, 
        task,
        gamification: gamificationResult,
        economy: economyResult,
        achievements: achievementResult,
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
