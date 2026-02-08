import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getUserIdFromToken } from "@/lib/auth";
import TaskModel from "@/models/Task";

interface ChildData {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  totalPoints?: number;
  availablePoints?: number;
  activeRewardsCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify JWT Token
    const authHeader = request.headers.get("Authorization");
    const userId = getUserIdFromToken(authHeader);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    let childrenData: ChildData[] = [];
    // 在你的 GET 方法中
    if (user.role === "parent" && user.familyId) {
      childrenData = await User.aggregate([
        {
          // 1. 筛选当前家庭的所有孩子
          $match: { familyId: user.familyId, role: "child" }
        },
        {
          // 2. 关联 Task 表：仅查询状态为 submitted 的任务
          $lookup: {
            from: "tasks", // 集合名通常是模型名的小写复数
            let: { child_id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$childId", "$$child_id"] }, // 注意这里是 childId
                      { $eq: ["$status", "submitted"] }
                    ]
                  }
                }
              }
            ],
            as: "submittedTasks"
          }
        },
        {
          // 3. 关联 Rewards 表：仅查询 userId 匹配且 isActive 为 true 的奖励
          $lookup: {
            from: "orders", // 确保集合名正确
            let: { child_id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$childId", "$$child_id"] }, // 根据你说的，这里是 userId
                      { $eq: ["$status", "pending"] }
                    ]
                  }
                }
              }
            ],
            as: "writeOf"
          }
        },
        {
          // 4. 格式化输出字段
          $project: {
            id: "$_id",
            username: 1,
            avatar: 1,
            totalPoints: 1,
            availablePoints: 1,
            submittedTasks: 1,
            writeOf: 1,
            submittedCount: { $size: "$submittedTasks" },
            writeOfCount: { $size: "$writeOf" }
          }
        }
      ]);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        familyId: user.familyId,
        inviteCode: user.inviteCode,
        totalPoints: user.totalPoints,
        availablePoints: user.availablePoints,
        children: childrenData,
      },
    });
  } catch (error) {
    console.error("Current user error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
