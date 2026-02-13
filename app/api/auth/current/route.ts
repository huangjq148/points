import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getUserIdFromToken } from "@/lib/auth";

interface ChildData {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  totalPoints?: number;
  availablePoints?: number;
  pendingCount: number;      // 待完成任务数
  submittedCount: number;    // 待审核任务数
  orderCount: number;        // 待核销订单数
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
          // 2. 关联 Task 表：查询待完成任务 (status: pending)
          $lookup: {
            from: "tasks",
            let: { child_id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$childId", "$$child_id"] },
                      { $eq: ["$status", "pending"] }
                    ]
                  }
                }
              }
            ],
            as: "pendingTasks"
          }
        },
        {
          // 3. 关联 Task 表：查询待审核任务 (status: submitted)
          $lookup: {
            from: "tasks",
            let: { child_id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$childId", "$$child_id"] },
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
          // 4. 关联 Orders 表：查询待核销订单 (status: pending)
          $lookup: {
            from: "orders",
            let: { child_id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$childId", "$$child_id"] },
                      { $eq: ["$status", "pending"] }
                    ]
                  }
                }
              }
            ],
            as: "pendingOrders"
          }
        },
        {
          // 5. 格式化输出字段
          $project: {
            id: { $toString: "$_id" },
            username: 1,
            nickname: { $ifNull: ["$identity", "$username"] },
            avatar: 1,
            totalPoints: 1,
            availablePoints: 1,
            pendingCount: { $size: "$pendingTasks" },
            submittedCount: { $size: "$submittedTasks" },
            orderCount: { $size: "$pendingOrders" }
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
