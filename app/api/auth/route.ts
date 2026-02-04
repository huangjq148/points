import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Child, { IChild } from '@/models/Child';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { phone, pin, action, childId } = await request.json();

    if (action === 'login') {
      let user = await User.findOne({ phone });
      
      if (!user) {
        user = await User.create({ phone, pin, children: [] });
      }

      const children = await Child.find({ userId: user._id });
      return NextResponse.json({ 
        success: true, 
        user: { id: user._id, phone: user.phone, pin: user.pin },
        children: children.map((c: IChild) => ({
            id: c._id.toString(),
            nickname: c.nickname,
            avatar: c.avatar,
            availablePoints: c.availablePoints
          }))
      });
    }

    if (action === 'verify-pin') {
      const user = await User.findOne({ phone, pin });
      if (!user) {
        return NextResponse.json({ success: false, message: 'PIN码错误' }, { status: 401 });
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

    if (action === 'add-child') {
      const user = await User.findOne({ phone });
      if (!user) {
        return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
      }
      const child = await Child.create({
        userId: user._id,
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
