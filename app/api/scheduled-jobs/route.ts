import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ScheduledJobModel, { IScheduledJob } from "@/models/ScheduledJob";
import Task from "@/models/Task";
import TaskTemplate from "@/models/TaskTemplate";
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

    // 构建 cron 表达式
    let cronExpression = "";
    const { frequency, config } = body;
    const publishTime = config?.publishTime || "00:00";
    const [hours, minutes] = publishTime.split(":").map(Number);

    switch (frequency) {
      case "minutely":
        cronExpression = "* * * * *";
        break;
      case "hourly":
        cronExpression = `0 * * * *`;
        break;
      case "daily":
        cronExpression = `${minutes} ${hours} * * *`;
        break;
      case "weekly":
        const dayOfWeek = config?.recurrenceDay ?? 1;
        cronExpression = `${minutes} ${hours} * * ${dayOfWeek}`;
        break;
      case "monthly":
        const dayOfMonth = config?.recurrenceDay ?? 1;
        cronExpression = `${minutes} ${hours} ${dayOfMonth} * *`;
        break;
      default:
        cronExpression = `${minutes} ${hours} * * *`;
    }

    const job = await ScheduledJobModel.create({
      ...body,
      cronExpression,
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
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  console.log("Generating recurring tasks for job:", job.name);
  console.log("Job config:", JSON.stringify(job.config, null, 2));

  // 从 job.config 获取配置
  const { taskTemplateId, selectedChildren, expiryPolicy } = job.config || {};

  if (!taskTemplateId) {
    console.log("Missing taskTemplateId in job config");
    return 0;
  }

  if (!selectedChildren || !Array.isArray(selectedChildren) || selectedChildren.length === 0) {
    console.log("Missing or empty selectedChildren in job config");
    return 0;
  }

  // 获取任务模板
  const template = await TaskTemplate.findById(taskTemplateId);

  if (!template) {
    console.log("Template not found:", taskTemplateId);
    return 0;
  }

  console.log("Found template:", template.name);

  let generatedCount = 0;

  // 为每个孩子创建任务
  for (const childId of selectedChildren) {
    console.log(`Processing child: ${childId}`);

    // 检查今天是否已创建
    const existingTask = await Task.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      childId: new mongoose.Types.ObjectId(childId),
      name: template.name,
      createdAt: { $gte: startOfToday },
    });

    if (existingTask) {
      console.log(`Task already exists for child ${childId} today`);
      continue;
    }

    // 创建截止时间（当天结束）
    const deadline = new Date(now);
    deadline.setHours(23, 59, 59, 999);

    const taskData = {
      userId: new mongoose.Types.ObjectId(userId),
      childId: new mongoose.Types.ObjectId(childId),
      name: template.name,
      description: template.description || "",
      points: template.points || 0,
      type: template.type || "daily",
      icon: template.icon || "⭐",
      requirePhoto: template.requirePhoto || false,
      imageUrl: template.imageUrl,
      status: "pending" as const,
      deadline,
      expiryPolicy: expiryPolicy || "auto_close",
    };

    console.log("Creating task with data:", JSON.stringify(taskData, null, 2));

    try {
      const newTask = await Task.create(taskData);
      console.log(`Created task for child ${childId}:`, newTask._id);
      generatedCount++;
    } catch (err: any) {
      console.error(`Failed to create task for child ${childId}:`, err.message);
    }
  }

  console.log(`Total tasks generated: ${generatedCount}`);
  return generatedCount;
}
