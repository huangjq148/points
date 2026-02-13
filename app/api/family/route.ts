import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getUserIdFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);

    const user = await User.findById(authUserId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!user.familyId) {
      return NextResponse.json({ success: true, members: [], total: 0, page, limit });
    }

    // Fetch all family members (parents and children) from User collection
    const skip = (page - 1) * limit;
    const familyMembers = await User.find({ familyId: user.familyId })
      .skip(skip)
      .limit(limit);
      
    const total = await User.countDocuments({ familyId: user.familyId });

    return NextResponse.json({
      success: true,
      members: familyMembers.map(m => ({
        id: m._id.toString(),
        username: m.username,
        role: m.role || 'parent', // 'parent' | 'child'
        identity: m.identity || (m.role === 'child' ? '孩子' : '家长'),
        type: m.role === 'child' ? 'child' : 'parent', // specific type for frontend
        isMe: m._id.toString() === authUserId,
        avatar: m.avatar,
        totalPoints: m.totalPoints,
        availablePoints: m.availablePoints
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Get family error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { action, targetUsername } = await request.json();

    if (action === 'create_family') {
      const currentUser = await User.findById(authUserId);
      if (!currentUser) {
        return NextResponse.json({ success: false, message: 'Current user not found' });
      }

      if (currentUser.familyId) {
        return NextResponse.json({ success: false, message: '您已有家庭' });
      }

      currentUser.familyId = new mongoose.Types.ObjectId();
      await currentUser.save();

      return NextResponse.json({ success: true, message: '创建家庭成功', familyId: currentUser.familyId });
    }

    if (action === 'invite_by_username') {
      if (!targetUsername) {
        return NextResponse.json({ success: false, message: 'Missing parameters' });
      }

      const currentUser = await User.findById(authUserId);
      if (!currentUser) {
        return NextResponse.json({ success: false, message: 'Current user not found' });
      }

      // Ensure current user has a familyId
      if (!currentUser.familyId) {
        currentUser.familyId = new mongoose.Types.ObjectId();
        await currentUser.save();
      }

      const targetUser = await User.findOne({ username: targetUsername });
      if (!targetUser) {
        return NextResponse.json({ success: false, message: '找不到该用户' });
      }

      if (targetUser.familyId) {
        if (targetUser.familyId.toString() === currentUser.familyId.toString()) {
          return NextResponse.json({ success: false, message: '该用户已在您的家庭中' });
        }
        return NextResponse.json({ success: false, message: '该用户已加入其他家庭' });
      }

      targetUser.familyId = currentUser.familyId;
      await targetUser.save();

      return NextResponse.json({ success: true, message: '邀请成功' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' });
  } catch (e) {
    console.error('Invite error:', e);
    return NextResponse.json({ success: false, message: 'Server error' });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 });

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ success: false, message: 'User not found' });

    // Remove from family
    user.familyId = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Remove family member error:', e);
    return NextResponse.json({ success: false, message: 'Error' });
  }
}
