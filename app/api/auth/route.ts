import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { signToken, hashPassword, comparePassword } from '@/lib/auth';

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { username, password, action, childId, inviteCode } = await request.json();

    if (action === 'login') {
      console.log('Login attempt:', username);
      let user = await User.findOne({ username });

      if (!user) {
        // Only parent users can register via login page if not exists?
        // Or if it is a child logging in?
        // The requirement says "Login register uses account login".
        // If user doesn't exist, we create it. Default role parent?
        // If creating a child, it should be done via parent dashboard.
        // So here we assume it's a parent or independent user registering.
        
        // However, if a child tries to login and doesn't exist, should we create it?
        // Probably not. Child accounts are created by parents.
        // But for simplicity/MVP, maybe we allow it?
        // No, let's stick to: New registrations are Parents. Children created by Parent.
        
        const newId = new mongoose.Types.ObjectId();
        const hashedPassword = await hashPassword(password);

        const createUser = async () => {
          return await User.create({
            _id: newId,
            username,
            password: hashedPassword,
            role: 'parent',
            familyId: newId,
            inviteCode: generateInviteCode(),
            avatar: '👤',
            totalPoints: 0,
            availablePoints: 0
          });
        };

        try {
          user = await createUser();
          } catch (err: unknown) {
          console.error('Create user error:', err);
          return NextResponse.json({ success: false, message: '注册失败，请稍后重试' });
        }
      } else {
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
          return NextResponse.json({ success: false, message: '密码错误' });
        }

        // Migration: If password was plain text (matched by comparePassword fallback), hash it now
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
            console.log(`Migrating password for user ${user.username} to hash`);
            user.password = await hashPassword(password);
            await user.save();
        }

        let changed = false;
        if (!user.familyId) {
          user.familyId = user._id;
          changed = true;
        }
        if (!user.inviteCode) {
          user.inviteCode = generateInviteCode();
          changed = true;
        }
        if (!user.role) {
          user.role = 'parent';
          changed = true;
        }
        if (changed) await user.save();
      }

      // Fetch children (Users with role='child' in the same family)
      // Note: If I am a child, I might see siblings?
      // Or if I am a parent, I see my children.
      // Actually, frontend expects 'children' array for the dashboard.
      // If I am a parent, I want to see all children in my family.
      const childrenUsers = await User.find({ 
        familyId: user.familyId, 
        role: 'child' 
      });

      // Generate JWT Token
      const token = signToken({
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        familyId: user.familyId?.toString()
      });

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          familyId: user.familyId,
          inviteCode: user.inviteCode,
          avatar: user.avatar,
          availablePoints: user.availablePoints
        },
        children: childrenUsers.map(c => ({
          id: c._id.toString(),
          nickname: c.identity || c.username,
          username: c.username,
          avatar: c.avatar,
          totalPoints: c.totalPoints,
          availablePoints: c.availablePoints
        }))
      });
    }

    if (action === 'join-family') {
      const user = await User.findOne({ username });
      if (!user || !(await comparePassword(password, user.password))) {
        return NextResponse.json({ success: false, message: '用户不存在或密码错误' }, { status: 401 });
      }

      const targetUser = await User.findOne({ inviteCode });
      if (!targetUser) {
        return NextResponse.json({ success: false, message: '邀请码无效' }, { status: 404 });
      }

      user.familyId = targetUser.familyId;
      await user.save();

      return NextResponse.json({ success: true, message: '成功加入家庭' });
    }

    if (action === 'get-family-members') {
      const user = await User.findOne({ username });
      if (!user || !(await comparePassword(password, user.password))) {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 401 });
      }

      if (!user.familyId) {
        return NextResponse.json({ success: true, members: [] });
      }

      const members = await User.find({ familyId: user.familyId });

      return NextResponse.json({
        success: true,
        members: members.map(m => ({
          id: m._id.toString(),
          username: m.username,
          role: m.role || 'parent',
          identity: m.identity || '',
          type: m.role === 'child' ? 'child' : 'parent',
          isMe: m._id.toString() === user._id.toString(),
          avatar: m.avatar,
          availablePoints: m.availablePoints
        }))
      });
    }

    if (action === 'verify-password') {
      const user = await User.findOne({ username });
      if (!user || !(await comparePassword(password, user.password))) {
        return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
      }
      const children = await User.find({ 
        familyId: user.familyId || user._id, 
        role: 'child' 
      });
      return NextResponse.json({
        success: true,
        children: children.map(c => ({
          id: c._id.toString(),
          nickname: c.identity || c.username,
          username: c.username,
          avatar: c.avatar,
          totalPoints: c.totalPoints,
          availablePoints: c.availablePoints
        }))
      });
    }

    if (action === 'get-children-by-username') {
      const user = await User.findOne({ username });
      if (!user) {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
      }
      const children = await User.find({
        familyId: user.familyId || user._id,
        role: 'child'
      });
      return NextResponse.json({
        success: true,
        children: children.map(c => ({
          id: c._id.toString(),
          nickname: c.identity || c.username,
          username: c.username,
          avatar: c.avatar,
          totalPoints: c.totalPoints,
          availablePoints: c.availablePoints
        }))
      });
    }

    if (action === 'add-child') {
       // Deprecated/Legacy
       return NextResponse.json({ success: false, message: 'Please use /api/children' }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
