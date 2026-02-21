import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { getTokenPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const authUserId = payload.userId;
    const authRole = payload.role;

    await connectDB();

    const matchQuery: Record<string, unknown> = {};
    if (authRole === "parent") {
      matchQuery.userId = new mongoose.Types.ObjectId(authUserId);
    } else if (authRole === "child") {
      matchQuery.childId = new mongoose.Types.ObjectId(authUserId);
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      rejectedTasks,
      completedTasks,
      pendingTasks,
      typeStats,
      dailyCompleted,
      weeklyCompleted,
      advancedCompleted,
      todayCompleted,
      todayOnTime,
      todayOverdue,
    ] = await Promise.all([
      Task.countDocuments({ ...matchQuery, status: "rejected" }),
      Task.countDocuments({ ...matchQuery, status: "approved" }),
      Task.countDocuments({ ...matchQuery, status: { $in: ["pending", "submitted"] } }),
      Task.aggregate([
        { $match: { ...matchQuery, status: "approved" } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Task.countDocuments({ ...matchQuery, type: "daily", status: "approved" }),
      Task.countDocuments({ ...matchQuery, type: "weekly", status: "approved" }),
      Task.countDocuments({ ...matchQuery, type: "advanced", status: "approved" }),
      Task.countDocuments({
        ...matchQuery,
        status: "approved",
        completedAt: { $gte: startOfToday, $lte: endOfToday },
      }),
      Task.countDocuments({
        ...matchQuery,
        status: "approved",
        completedAt: { $gte: startOfToday, $lte: endOfToday },
        $expr: { $lte: ["$completedAt", "$deadline"] },
      }),
      Task.countDocuments({
        ...matchQuery,
        status: "approved",
        deadline: { $exists: true, $ne: null },
        completedAt: { $exists: true },
        $expr: { $gt: ["$completedAt", "$deadline"] },
      }),
    ]);

    const typeDistribution = [
      { type: "daily", label: "日常任务", count: dailyCompleted, color: "#22c55e" },
      { type: "weekly", label: "周任务", count: weeklyCompleted, color: "#8b5cf6" },
      { type: "advanced", label: "挑战任务", count: advancedCompleted, color: "#f97316" },
    ];

    return NextResponse.json({
      success: true,
      stats: {
        rejected: rejectedTasks,
        completed: completedTasks,
        pending: pendingTasks,
        todayCompleted,
        todayOnTime,
        todayOverdue,
        typeDistribution,
      },
    });
  } catch (error: unknown) {
    console.error("Get task stats error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
