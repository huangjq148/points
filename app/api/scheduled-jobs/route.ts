import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ScheduledJobModel, { IScheduledJob } from "@/models/ScheduledJob";
import Task from "@/models/Task";
import { getTokenPayload } from "@/lib/auth";
import mongoose from "mongoose";

// 获取定时任务列表
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const authUserId = payload.userId;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    await connectDB();

    const query: any = { userId: new mongoose.Types.ObjectId(authUserId) };
    if (type) query.type = type;

    const jobs = await ScheduledJobModel.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("Get scheduled jobs error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// 创建定时任务
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const authUserId = payload.userId;
    const body = await request.json();

    await connectDB();

    const job = await ScheduledJobModel.create({
      ...body,
      userId: new mongoose.Types.ObjectId(authUserId),
      status: "stopped", // 默认停止状态
      runCount: 0,
      successCount: 0,
      errorCount: 0,
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("Create scheduled job error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// 手动执行定时任务
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const authUserId = payload.userId;
    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await ScheduledJobModel.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      userId: new mongoose.Types.ObjectId(authUserId),
    });

    if (!job) {
      return NextResponse.json(
        { success: false, message: "定时任务不存在" },
        { status: 404 }
      );
    }

    let result: any = {};

    switch (action) {
      case "start":
        job.status = "running";
        job.nextRunAt = calculateNextRun(job.frequency);
        await job.save();
        result = { message: "定时任务已启动", job };
        break;

      case "stop":
        job.status = "stopped";
        job.nextRunAt = undefined;
        await job.save();
        result = { message: "定时任务已停止", job };
        break;

      case "run":
        // 手动执行一次
        result = await executeJob(job, authUserId);
        break;

      default:
        return NextResponse.json(
          { success: false, message: "未知的操作类型" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Update scheduled job error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// 删除定时任务
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const authUserId = payload.userId;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "缺少jobId" },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await ScheduledJobModel.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(jobId),
      userId: new mongoose.Types.ObjectId(authUserId),
    });

    if (!job) {
      return NextResponse.json(
        { success: false, message: "定时任务不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "定时任务已删除",
    });
  } catch (error: any) {
    console.error("Delete scheduled job error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// 计算下次运行时间
function calculateNextRun(frequency: string): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case "minutely":
      next.setMinutes(next.getMinutes() + 1, 0, 0);
      break;
    case "hourly":
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    default:
      next.setMinutes(next.getMinutes() + 1);
  }

  return next;
}

// 执行定时任务
async function executeJob(job: IScheduledJob, userId: string) {
  const startTime = new Date();
  let createdCount = 0;
  let error: string | null = null;

  try {
    switch (job.type) {
      case "recurring_task":
        createdCount = await generateRecurringTasks(userId, job);
        break;

      case "daily_reset":
        // 这里可以调用 dailyReset 逻辑
        const { resetDailyTasks } = await import("@/lib/cron/dailyReset");
        await resetDailyTasks();
        break;

      default:
        throw new Error("未实现的任务类型");
    }

    // 更新任务状态
    job.lastRunAt = startTime;
    job.nextRunAt = calculateNextRun(job.frequency);
    job.runCount += 1;
    job.successCount += 1;
    await job.save();

    return {
      message: "定时任务执行成功",
      createdCount,
      job,
    };
  } catch (err: any) {
    // 更新错误状态
    job.lastRunAt = startTime;
    job.lastError = err.message;
    job.runCount += 1;
    job.errorCount += 1;
    job.status = "error";
    await job.save();

    throw err;
  }
}

// 生成周期任务
async function generateRecurringTasks(
  userId: string,
  job: IScheduledJob
): Promise<number> {
  const now = new Date();
  const startOfCurrentMinute = new Date(now);
  startOfCurrentMinute.setSeconds(0, 0);

  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  // 查询周期任务模板
  const query: any = {
    userId: new mongoose.Types.ObjectId(userId),
    isRecurring: true,
    isRecurringTemplate: true,
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: null },
      { validUntil: { $gte: now } },
    ],
    $or: [
      { validFrom: { $exists: false } },
      { validFrom: null },
      { validFrom: { $lte: now } },
    ],
  };

  // 如果指定了特定任务模板
  if (job.config?.taskTemplateId) {
    query._id = new mongoose.Types.ObjectId(job.config.taskTemplateId);
  }

  const recurringTasks = await Task.find(query);
  let generatedCount = 0;

  for (const template of recurringTasks) {
    let shouldCreate = false;
    let timeWindow: Date = startOfCurrentMinute;

    switch (template.recurrence) {
      case "minutely":
        shouldCreate = true;
        break;
      case "daily":
        shouldCreate = true;
        timeWindow = new Date(now);
        timeWindow.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        if (
          template.recurrenceDay !== undefined &&
          template.recurrenceDay === dayOfWeek
        ) {
          shouldCreate = true;
          timeWindow = new Date(now);
          timeWindow.setHours(0, 0, 0, 0);
        }
        break;
      case "monthly":
        if (
          template.recurrenceDay !== undefined &&
          template.recurrenceDay === dayOfMonth
        ) {
          shouldCreate = true;
          timeWindow = new Date(now);
          timeWindow.setHours(0, 0, 0, 0);
        }
        break;
    }

    if (!shouldCreate) continue;

    // 检查是否已存在
    const existingInstance = await Task.findOne({
      originalTaskId: template._id,
      createdAt: { $gte: timeWindow },
    });

    if (!existingInstance) {
      const deadline = new Date(now);
      if (template.recurrence === "minutely") {
        deadline.setMinutes(deadline.getMinutes() + 1, 0, 0);
      } else {
        deadline.setHours(23, 59, 59, 999);
      }

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
        isRecurring: false,
        isRecurringTemplate: false,
        originalTaskId: template._id,
        deadline,
        expiryPolicy: template.expiryPolicy,
      });
      generatedCount++;
    }
  }

  return generatedCount;
}
