import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { eachDayOfIntervalWithOptions } from 'date-fns/fp';
import { getUserIdFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query: Record<string, unknown> = {};
    const users = await User.find(query);

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        identity: u.identity,
        familyId: u.familyId,
        type: 'parent', // Consistent with frontend expectations
        isMe: u._id.toString() === userId
      }))
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { username, password, role, identity, familyId } = await request.json();

    const exist = await User.findOne({ username });
    if (exist) return NextResponse.json({ success: false, message: '用户名已存在' });

    const user = await User.create({
      username,
      password: password || '123456',
      role: role || 'parent',
      identity,
      familyId, // Optional
      children: []
    });

    return NextResponse.json({ success: true, user });
  } catch (e) {
    console.error('Create user error:', e);
    return NextResponse.json({ success: false, message: (e as Error).message || 'Error' });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const authUserId = getUserIdFromToken(authHeader);
    if (!authUserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id, username, password, role, identity } = await request.json();

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ success: false, message: 'User not found' });

    if (username) user.username = username;
    if (password) user.password = password;
    if (role) user.role = role;
    if (identity !== undefined) user.identity = identity;

    await user.save();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, message: 'Error' });
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

    if (!id) return NextResponse.json({ success: false, message: 'Missing id' });

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Error' });
  }
}
