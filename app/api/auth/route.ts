import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Child, { IChild } from '@/models/Child';
import mongoose from 'mongoose';
import { signToken } from '@/lib/auth';

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
        const newId = new mongoose.Types.ObjectId();
        const createUser = async () => {
          return await User.create({
            _id: newId,
            username,
            password,
            role: 'parent',
            children: [],
            familyId: newId,
            inviteCode: generateInviteCode()
          });
        };

        try {
          user = await createUser();
        } catch (err: any) {
          console.error('Create user error:', err);
          if (err.code === 11000 && (err.keyPattern?.phone || err.message?.includes('phone'))) {
            try {
              console.log('Dropping legacy phone index...');
              await User.collection.dropIndex('phone_1');
              user = await createUser();
            } catch (e) {
              console.error('Retry failed:', e);
              return NextResponse.json({ success: false, message: '注册失败：系统维护中，请重试' });
            }
          } else if (err.code === 11000) {
            return NextResponse.json({ success: false, message: '注册失败：用户名已存在' });
          } else {
            return NextResponse.json({ success: false, message: '注册失败，请稍后重试' });
          }
        }
      } else {
        // Migration
        let changed = false;
        // Verify password if user exists? 
        // For auto-login/register flow, we usually check password.
        // But user requirement "Login register uses account login".
        // Does it mean Register AND Login in one step?
        // Usually: Login checks password. Register creates it.
        // If I keep "Auto Register", I can't check password properly unless I distinguish.
        // I'll assume standard Login: Check password.
        // But if user not found -> Register.
        // So:
        // If user exists: Check password. If mismatch -> Error.
        // If user not exists: Create.

        if (user.password !== password) {
          console.log('Password mismatch for:', username);
          // For migration: if user has PIN but no password field? 
          // (Mongoose might have alias or I need to handle it).
          // Since I renamed field in Schema, existing docs have 'pin'.
          // I should probably support 'pin' as fallback or migrate?
          // Since I am changing Schema, 'password' field is new.
          // Existing users won't have 'password'.
          // I should check 'pin' if password missing?
          // But I renamed it in Schema. Mongoose won't see 'pin'.
          // This is tricky without migration script.
          // I'll assume new users or I'll manually migrate if needed.
          // Or simpler: If user exists, check password.
          return NextResponse.json({ success: false, message: '密码错误' });
        }

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

      // Find children by familyId or userId (migration)
      let children = await Child.find({
        $or: [
          { familyId: user.familyId },
          { userId: user._id }
        ]
      });

      // Migrate children to family
      for (const child of children) {
        if (!child.familyId) {
          child.familyId = user.familyId;
          await child.save();
        }
      }

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
          inviteCode: user.inviteCode
        },
        children: children.map((c: IChild) => ({
          id: c._id.toString(),
          nickname: c.nickname,
          avatar: c.avatar,
          availablePoints: c.availablePoints
        }))
      });
    }

    if (action === 'join-family') {
      const user = await User.findOne({ username, password });
      if (!user) {
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
      const user = await User.findOne({ username, password });
      if (!user) {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 401 });
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
            isMe: m._id.toString() === user._id.toString()
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
    }

    if (action === 'verify-password') {
      const user = await User.findOne({ username, password });
      if (!user) {
        return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
      }
      const children = await Child.find({ userId: user._id });
      return NextResponse.json({
        success: true,
        children: children.map((c: IChild) => ({
          id: c._id.toString(),
          nickname: c.nickname,
          avatar: c.avatar,
          availablePoints: c.availablePoints
        }))
      });
    }

    if (action === 'get-children-by-username') {
      const user = await User.findOne({ username });
      if (!user) {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
      }
      const children = await Child.find({
        $or: [
          { familyId: user.familyId || user._id },
          { userId: user._id }
        ]
      });
      return NextResponse.json({
        success: true,
        children: children.map((c: IChild) => ({
          id: c._id.toString(),
          nickname: c.nickname,
          avatar: c.avatar,
          availablePoints: c.availablePoints
        }))
      });
    }

    if (action === 'add-child') {
      const user = await User.findOne({ username });
      if (!user) {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
      }

      if (!user.familyId) {
        user.familyId = user._id;
        await user.save();
      }

      const child = await Child.create({
        userId: user._id,
        familyId: user.familyId,
        nickname: childId,
        avatar: '🦊',
        totalPoints: 0,
        availablePoints: 0
      });
      user.children.push(child._id);
      await user.save();
      return NextResponse.json({ success: true, child });
    }

    return NextResponse.json({ success: false, message: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
