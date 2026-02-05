import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Child from '@/models/Child';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (!user.familyId) {
      return NextResponse.json({ success: true, members: [] });
    }

    const members = await User.find({ familyId: user.familyId });
    const children = await Child.find({ familyId: user.familyId });

    return NextResponse.json({
      success: true,
      members: [
        ...members.map(m => ({
          id: m._id.toString(),
          username: m.username,
          role: m.role || 'parent',
          identity: m.identity || '',
          type: 'parent',
          isMe: m._id.toString() === userId
        })),
        ...children.map(c => ({
          id: c._id.toString(),
          username: c.nickname,
          role: 'child',
          identity: '孩子',
          type: 'child',
          isMe: false
        }))
      ]
    });
  } catch (error) {
    console.error('Get family error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { action, targetUsername, currentUserId } = await request.json();

    if (action === 'invite_by_username') {
      if (!targetUsername || !currentUserId) {
        return NextResponse.json({ success: false, message: 'Missing parameters' });
      }

      const currentUser = await User.findById(currentUserId);
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
