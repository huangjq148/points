import { getUserIdFromToken, hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    const query: Record<string, unknown> = {};
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await User.countDocuments(query);

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        identity: u.identity,
        nickname: u.nickname,
        gender: u.gender,
        familyId: u.familyId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        type: "parent", // Consistent with frontend expectations
        isMe: u._id.toString() === userId,
      })),
      total,
      page,
      limit
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: (error as Error).message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { username, password, role, identity, familyId, nickname, gender } = await request.json();

    const exist = await User.findOne({ username });
    if (exist) return NextResponse.json({ success: false, message: "用户名已存在" });

    const user = await User.create({
      username,
      password: password ? await hashPassword(password) : await hashPassword("123456"),
      role: role || "parent",
      identity,
      nickname,
      gender,
      familyId, // Optional
      children: [],
    });

    return NextResponse.json({ success: true, user });
  } catch (e) {
    console.error("Create user error:", e);
    return NextResponse.json({ success: false, message: (e as Error).message || "Error" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id, username, password, role, identity, nickname, gender } = await request.json();

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ success: false, message: "User not found" });

    if (username) user.username = username;
    if (password) user.password = await hashPassword(password);
    if (role) user.role = role;
    if (identity !== undefined) user.identity = identity;
    if (nickname !== undefined) user.nickname = nickname;
    if (gender !== undefined) user.gender = gender;

    await user.save();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, message: "Error" });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, message: "Missing id" });

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, message: (e as Error).message || "Error" });
  }
}
