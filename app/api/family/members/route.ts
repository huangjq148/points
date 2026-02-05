import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Child from '@/models/Child';

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
    console.error('Get family members error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { username, password, role, identity, familyId } = await request.json();

    if (!familyId && role !== 'admin') {
      // If not familyId provided, it creates a standalone user.
      // Allow this for "Add User" feature as requested.
      // But maybe we should warn? 
      // User said: "添加用户时，不应当自动加入当前家庭"
      // So we just allow it.
    }

    const exist = await User.findOne({ username });
    if (exist) return NextResponse.json({ success: false, message: '用户名已存在' });

    const user = await User.create({
      username,
      password: password || '123456',
      role: role || 'parent',
      identity,
      familyId,
      children: []
    });

    return NextResponse.json({ success: true, user });
  } catch (e) {
    console.error('Add family member error:', e);
    return NextResponse.json({ success: false, message: (e as Error).message || 'Error' });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { id, username, role, identity } = await request.json();
    
    // Ensure we are updating a user who is part of a family (or any user, but this API implies family context)
    // For now, we just update the user.
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ success: false, message: 'User not found' });

    if (username) user.username = username;
    if (role) user.role = role;
    if (identity !== undefined) user.identity = identity;

    await user.save();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Update family member error:', e);
    return NextResponse.json({ success: false, message: 'Error' });
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

    // Instead of deleting the user, we just remove them from the family
    user.familyId = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Remove family member error:', e);
    return NextResponse.json({ success: false, message: 'Error' });
  }
}
