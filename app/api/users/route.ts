import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { username, password, role, familyId, identity } = await request.json();

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
    console.error('Create user API error:', e);
    return NextResponse.json({ success: false, message: (e as Error).message || 'Error' });
  }
}

export async function PUT(request: NextRequest) {
  try {
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
    return NextResponse.json({ success: false, message: 'Error' });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Error' });
  }
}