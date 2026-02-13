import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task, { ITask } from "@/models/Task";
import User from "@/models/User";
import { getUserIdFromToken } from "@/lib/auth";

interface ITaskQuery {
  childId?: mongoose.Types.ObjectId;
  status?: "pending" | "submitted" | "approved" | "rejected";
  userId?: mongoose.Types.ObjectId;
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
    // For GET method, if auth fails, we might still want to allow access for child dashboard
    // But child dashboard requests usually include the token of the logged-in user (parent or child)
    // If the child is logged in, they have a token. If the parent is viewing, they have a token.

    // The issue might be that child requests are not sending the token properly or the token is invalid.
    // However, if we look at the ChildDashboard component, it sends the token:
    // headers: { "Authorization": `Bearer ${currentUser.token}` }

    // If 401 happens, it means getUserIdFromToken returned null.

    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);

    // Allow if we have a valid childId query param and it matches a public/shared view scenario?
    // But for now, strict auth is safer.

    if (!authUserId) {
      // Allow access if childId is present (public read-only for child dashboard scenario if needed, OR strict)
      // The requirement says "Child page API returns 401".
      // If the child is visiting their page, they should be logged in as a child user (role: child).
      // If they are logged in, getUserIdFromToken should return their ID.

      // If the token is missing or invalid, we return 401.
      // However, if we want to allow viewing tasks without strict auth (e.g. via a shared link?), we could relax this.
      // But typically, the child logs in with username/password.

      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const status = searchParams.get("status") as ITask["status"];
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (userId) {
      await generateRecurringTasks(userId);
    }

    const query: ITaskQuery = {};
    if (childId) query.childId = new mongoose.Types.ObjectId(childId);
    if (status) query.status = status;
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);

    const skip = (page - 1) * limit;

    // Use aggregation to join with User collection for child details
    const tasks = await Task.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
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
      userId,
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

    if (!userId || !childId || !name || points === undefined) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 });
    }

    const task = await Task.create({
      userId,
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

    // Handle point transaction only if status is changing to approved
    if (status === "approved") {
      await User.findByIdAndUpdate(task.childId, {
        $inc: { totalPoints: task.points, availablePoints: task.points },
      });
    }

    return NextResponse.json({ success: true, task });
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
