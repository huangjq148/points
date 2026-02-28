import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { 
  UserAvatar, 
  AvatarLevel, 
  MedalDefinition, 
  UserMedal,
  AvatarSkin,
  AvatarAccessory 
} from '@/models/Gamification';
import { getTokenPayload } from '@/lib/auth';

interface AvatarProgressLike {
  level: number;
  currentXP: number;
  totalXP: number;
  unlockedSkins: string[];
  unlockedAccessories: string[];
  totalTasksCompleted: number;
  maxConsecutiveDays: number;
}

interface LevelUpUpdate {
  level?: number;
  currentXP?: number;
  totalXP?: number;
  unlockedSkins?: string[];
  unlockedAccessories?: string[];
}

// 辅助函数：检查是否为同一天
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// 辅助函数：检查是否为昨天
function isYesterday(date: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

// 计算升级并解锁奖励
async function processLevelUp(userAvatar: AvatarProgressLike, xpGained: number) {
  const updates: LevelUpUpdate = {};
  let levelsGained = 0;
  const unlockedRewards: Array<Record<string, unknown>> = [];

  // 获取当前等级信息
  const currentLevelInfo = await AvatarLevel.findOne({ level: userAvatar.level });
  const nextLevelInfo = await AvatarLevel.findOne({ level: userAvatar.level + 1 });

  if (!nextLevelInfo) {
    // 已达到最高等级
    return { updates, levelsGained, unlockedRewards };
  }

  let newCurrentXP = userAvatar.currentXP + xpGained;
  const newTotalXP = userAvatar.totalXP + xpGained;
  let newLevel = userAvatar.level;

  // 检查是否升级
  while (nextLevelInfo && newCurrentXP >= (nextLevelInfo.xpRequired - (currentLevelInfo?.xpRequired || 0))) {
    newLevel++;
    levelsGained++;
    newCurrentXP -= (nextLevelInfo.xpRequired - (currentLevelInfo?.xpRequired || 0));

    // 检查新等级解锁的皮肤
    const newSkins = await AvatarSkin.find({ unlockLevel: newLevel });
    for (const skin of newSkins) {
      if (!userAvatar.unlockedSkins.includes(skin.id)) {
        unlockedRewards.push({
          type: 'skin',
          ...skin.toObject(),
        });
      }
    }

    // 检查新等级解锁的配饰
    const newAccessories = await AvatarAccessory.find({ unlockLevel: newLevel });
    for (const acc of newAccessories) {
      if (!userAvatar.unlockedAccessories.includes(acc.id)) {
        unlockedRewards.push({
          type: 'accessory',
          ...acc.toObject(),
        });
      }
    }

    // 继续检查下一级
    const nextNextLevel = await AvatarLevel.findOne({ level: newLevel + 1 });
    if (!nextNextLevel) break;
  }

  updates.level = newLevel;
  updates.currentXP = newCurrentXP;
  updates.totalXP = newTotalXP;

  // 解锁新皮肤和配饰
  const allNewSkins = await AvatarSkin.find({ unlockLevel: { $lte: newLevel } });
  updates.unlockedSkins = [...new Set([...userAvatar.unlockedSkins, ...allNewSkins.map(s => s.id)])];

  const allNewAccessories = await AvatarAccessory.find({ unlockLevel: { $lte: newLevel } });
  updates.unlockedAccessories = [...new Set([...userAvatar.unlockedAccessories, ...allNewAccessories.map(a => a.id)])];

  return { updates, levelsGained, unlockedRewards };
}

// 检查并授予勋章
async function checkAndAwardMedals(userId: string, userAvatar: AvatarProgressLike) {
  const newMedals: Array<Record<string, unknown>> = [];

  // 获取所有勋章定义
  const allMedals = await MedalDefinition.find();

  // 获取用户已有的勋章
  const existingUserMedals = await UserMedal.find({ userId: new mongoose.Types.ObjectId(userId) });
  const existingMedalIds = new Set(existingUserMedals.map(um => um.medalId.toString()));

  for (const medal of allMedals) {
    if (existingMedalIds.has(medal._id.toString())) {
      continue; // 已经获得该勋章
    }

    let requirementMet = false;

    if (medal.requirementType === 'total') {
      requirementMet = userAvatar.totalTasksCompleted >= medal.requirement;
    } else if (medal.requirementType === 'consecutive') {
      requirementMet = userAvatar.maxConsecutiveDays >= medal.requirement;
    }

    if (requirementMet) {
      // 授予勋章
      await UserMedal.create({
        userId: new mongoose.Types.ObjectId(userId),
        medalId: medal._id,
        earnedAt: new Date(),
        progress: medal.requirement,
        isNew: true,
      });

      newMedals.push({
        ...medal.toObject(),
        isNew: true,
      });
    }
  }

  return newMedals;
}

// 更新任务进度（完成任务时调用）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await request.json();
    const { taskPoints = 10, isTaskCompletion = true } = body;

    await connectDB();

    // 获取或创建用户角色数据
    let userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 计算连续天数
    let newConsecutiveDays = userAvatar.consecutiveDays;
    let newMaxConsecutiveDays = userAvatar.maxConsecutiveDays;
    let newTotalTasksCompleted = userAvatar.totalTasksCompleted;

    if (isTaskCompletion) {
      newTotalTasksCompleted += 1;

      if (!userAvatar.lastTaskDate) {
        // 第一次完成任务
        newConsecutiveDays = 1;
        newMaxConsecutiveDays = 1;
      } else {
        const lastTaskDate = new Date(userAvatar.lastTaskDate);

        if (isSameDay(lastTaskDate, today)) {
          // 今天已经做过任务，不增加连续天数
        } else if (isYesterday(lastTaskDate, today)) {
          // 昨天做了任务，连续天数+1
          newConsecutiveDays += 1;
        } else {
          // 中断了，重新开始
          newConsecutiveDays = 1;
        }

        // 更新最大连续天数
        newMaxConsecutiveDays = Math.max(newMaxConsecutiveDays, newConsecutiveDays);
      }
    }

    // 计算经验值（任务积分 + 额外奖励）
    let xpGained = taskPoints;
    
    // 连续天数加成
    if (newConsecutiveDays >= 7) {
      xpGained += 5; // 连续7天额外奖励
    }
    if (newConsecutiveDays >= 21) {
      xpGained += 10; // 连续21天额外奖励
    }

    // 处理升级逻辑
    const { updates: levelUpdates, levelsGained, unlockedRewards } = await processLevelUp(
      { ...userAvatar.toObject(), consecutiveDays: newConsecutiveDays },
      xpGained
    );

    // 更新用户数据
    const updateData = {
      ...levelUpdates,
      consecutiveDays: newConsecutiveDays,
      maxConsecutiveDays: newMaxConsecutiveDays,
      totalTasksCompleted: newTotalTasksCompleted,
      lastTaskDate: today,
    };

    userAvatar = await UserAvatar.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      updateData,
      { new: true, upsert: true }
    );

    // 检查勋章
    const newMedals = await checkAndAwardMedals(userId, {
      ...userAvatar.toObject(),
      totalTasksCompleted: newTotalTasksCompleted,
      maxConsecutiveDays: newMaxConsecutiveDays,
    });

    // 获取当前等级信息
    const currentLevel = await AvatarLevel.findOne({ level: userAvatar.level });

    return NextResponse.json({
      success: true,
      data: {
        xpGained,
        totalXP: userAvatar.totalXP,
        currentXP: userAvatar.currentXP,
        level: userAvatar.level,
        levelName: currentLevel?.name,
        levelTitle: currentLevel?.title,
        levelsGained,
        consecutiveDays: newConsecutiveDays,
        maxConsecutiveDays: newMaxConsecutiveDays,
        totalTasksCompleted: newTotalTasksCompleted,
        newMedals,
        unlockedRewards,
      },
    });
  } catch (error) {
    console.error('更新游戏化进度失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 获取用户游戏化统计数据
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = getTokenPayload(authHeader);

    if (!payload) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const userId = payload.userId;
    await connectDB();

    const userAvatar = await UserAvatar.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userAvatar) {
      return NextResponse.json({
        success: true,
        data: {
          level: 1,
          totalXP: 0,
          consecutiveDays: 0,
          maxConsecutiveDays: 0,
          totalTasksCompleted: 0,
        },
      });
    }

    // 获取勋章统计
    const medalCount = await UserMedal.countDocuments({ 
      userId: new mongoose.Types.ObjectId(userId) 
    });

    const currentLevel = await AvatarLevel.findOne({ level: userAvatar.level });

    return NextResponse.json({
      success: true,
      data: {
        level: userAvatar.level,
        levelName: currentLevel?.name,
        levelTitle: currentLevel?.title,
        totalXP: userAvatar.totalXP,
        currentXP: userAvatar.currentXP,
        consecutiveDays: userAvatar.consecutiveDays,
        maxConsecutiveDays: userAvatar.maxConsecutiveDays,
        totalTasksCompleted: userAvatar.totalTasksCompleted,
        medalCount,
        stage: userAvatar.stage,
      },
    });
  } catch (error) {
    console.error('获取游戏化统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
