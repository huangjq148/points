import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { UserAvatar, AvatarSkin, AvatarAccessory } from '@/models/Gamification';
import { getTokenPayload } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    await connectDB();

    let userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
      userAvatar = await UserAvatar.create({
        userId: new mongoose.Types.ObjectId(userId),
        currentXP: 0,
        totalXP: 0,
        stage: 'egg',
        unlockedSkins: ['default'],
        currentSkin: 'default',
        equippedAccessories: [],
        unlockedAccessories: [],
        totalTasksCompleted: 0,
      });
    }

    const allSkins = await AvatarSkin.find().sort({ unlockLevel: 1 });
    const allAccessories = await AvatarAccessory.find().sort({ unlockLevel: 1 });

    const skinsWithStatus = allSkins.map((skin) => ({
      ...skin.toObject(),
      isUnlocked: true,
    }));

    const accessoriesWithStatus = allAccessories.map((acc) => ({
      ...acc.toObject(),
      isUnlocked: true,
      isEquipped: userAvatar?.equippedAccessories?.includes(acc.id) || false,
    }));

    const stageInfo = {
      egg: { name: '探险伙伴', description: '陪你完成每一次任务', icon: '🥚', color: '#FFE4B5' },
    };

    return NextResponse.json({
      success: true,
      data: {
        avatar: {
          ...userAvatar?.toObject(),
          stage: 'egg',
          stageInfo: stageInfo.egg,
        },
        customization: {
          skins: skinsWithStatus,
          accessories: accessoriesWithStatus,
        },
      },
    });
  } catch (error) {
    console.error('获取角色成长数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { currentSkin, equippedAccessories, petName } = body;

    await connectDB();

    const updateData: Partial<typeof body> = {};

    if (currentSkin !== undefined) {
      const skin = await AvatarSkin.findOne({ id: currentSkin });
      if (skin) {
        updateData.currentSkin = currentSkin;
      }
    }

    if (equippedAccessories !== undefined) {
      updateData.equippedAccessories = equippedAccessories;
    }

    if (petName !== undefined) {
      updateData.petName = petName;
    }

    const userAvatar = await UserAvatar.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      updateData,
      { new: true },
    );

    if (!userAvatar) {
      return NextResponse.json({ success: false, message: '角色数据不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '角色配置更新成功',
      data: userAvatar,
    });
  } catch (error) {
    console.error('更新角色配置失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败', error: (error as Error).message },
      { status: 500 },
    );
  }
}
