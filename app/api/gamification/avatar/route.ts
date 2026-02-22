import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { UserAvatar, AvatarLevel, AvatarSkin, AvatarAccessory } from '@/models/Gamification';
import { getTokenPayload } from '@/lib/auth';

// 获取用户角色成长数据
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    await connectDB();

    // 获取或初始化用户角色数据
    let userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
      // 创建默认角色数据
      userAvatar = await UserAvatar.create({
        userId: new mongoose.Types.ObjectId(userId),
        level: 1,
        currentXP: 0,
        totalXP: 0,
        stage: 'egg',
        unlockedSkins: ['default'],
        currentSkin: 'default',
        equippedAccessories: [],
        unlockedAccessories: [],
        consecutiveDays: 0,
        maxConsecutiveDays: 0,
        totalTasksCompleted: 0,
      });
    }

    // 获取所有等级信息
    const allLevels = await AvatarLevel.find().sort({ level: 1 });

    // 获取当前等级和下一级信息
    const currentLevelInfo = allLevels.find(l => l.level === userAvatar?.level) || allLevels[0];
    const nextLevelInfo = allLevels.find(l => l.level === (userAvatar?.level || 1) + 1);

    // 计算升级进度
    let levelProgress = 0;
    let levelProgressPercent = 0;
    let xpToNextLevel = 0;

    if (nextLevelInfo && userAvatar) {
      const currentLevelXP = currentLevelInfo?.xpRequired || 0;
      const nextLevelXP = nextLevelInfo.xpRequired;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const xpCurrent = userAvatar.currentXP - currentLevelXP;
      levelProgress = Math.max(0, xpCurrent);
      xpToNextLevel = Math.max(0, xpNeeded - xpCurrent);
      levelProgressPercent = Math.min(100, Math.round((xpCurrent / xpNeeded) * 100));
    } else {
      levelProgressPercent = 100;
    }

    // 获取所有皮肤和配饰
    const allSkins = await AvatarSkin.find().sort({ unlockLevel: 1 });
    const allAccessories = await AvatarAccessory.find().sort({ unlockLevel: 1 });

    // 检查解锁状态
    const unlockedSkinIds = new Set(userAvatar?.unlockedSkins || []);
    const unlockedAccessoryIds = new Set(userAvatar?.unlockedAccessories || []);

    const skinsWithStatus = allSkins.map(skin => ({
      ...skin.toObject(),
      isUnlocked: unlockedSkinIds.has(skin.id) || userAvatar!.level >= skin.unlockLevel,
    }));

    const accessoriesWithStatus = allAccessories.map(acc => ({
      ...acc.toObject(),
      isUnlocked: unlockedAccessoryIds.has(acc.id) || userAvatar!.level >= acc.unlockLevel,
      isEquipped: userAvatar?.equippedAccessories?.includes(acc.id) || false,
    }));

    // 确定当前阶段
    const getStageFromLevel = (level: number): string => {
      if (level >= 10) return 'legend';
      if (level >= 7) return 'hero';
      if (level >= 5) return 'adventurer';
      if (level >= 3) return 'explorer';
      if (level >= 2) return 'hatchling';
      return 'egg';
    };

    const stage = getStageFromLevel(userAvatar?.level || 1);

    // 阶段信息
    const stageInfo = {
      egg: { name: '待孵化的蛋', description: '充满潜力的开始', icon: '🥚', color: '#FFE4B5' },
      hatchling: { name: '小小破壳儿', description: '初生的探险家', icon: '🐣', color: '#FFF8DC' },
      explorer: { name: '见习探险家', description: '勇敢的初学者', icon: '🐥', color: '#98FB98' },
      adventurer: { name: '探险队长', description: '经验丰富的领袖', icon: '🦅', color: '#87CEEB' },
      hero: { name: '英雄', description: '万人敬仰的英雄', icon: '🦄', color: '#DDA0DD' },
      legend: { name: '传奇', description: '永恒的传说', icon: '🐉', color: '#FFD700' },
    };

    return NextResponse.json({
      success: true,
      data: {
        avatar: {
          ...userAvatar?.toObject(),
          stage,
          stageInfo: stageInfo[stage as keyof typeof stageInfo],
        },
        levelInfo: {
          current: currentLevelInfo,
          next: nextLevelInfo,
          progress: levelProgress,
          progressPercent: levelProgressPercent,
          xpToNextLevel,
          allLevels,
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
      { status: 500 }
    );
  }
}

// 更新角色配置（皮肤、配饰、名字）
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
      // 检查皮肤是否已解锁
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
      { new: true }
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
      { status: 500 }
    );
  }
}