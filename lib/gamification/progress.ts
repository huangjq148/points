import mongoose from 'mongoose';
import { UserAvatar } from '@/models/Gamification';

export interface GamificationUpdateResult {
  success: boolean;
  xpGained: number;
  unlockedRewards: Array<{
    type: 'skin' | 'accessory';
    id: string;
    name: string;
    icon: string;
  }>;
}

export async function updateGamificationProgress(
  userId: string | mongoose.Types.ObjectId,
  taskPoints: number,
): Promise<GamificationUpdateResult> {
  const result: GamificationUpdateResult = {
    success: false,
    xpGained: 0,
    unlockedRewards: [],
  };

  try {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    let userAvatar = await UserAvatar.findOne({ userId: userObjectId });
    if (!userAvatar) {
      userAvatar = await UserAvatar.create({
        userId: userObjectId,
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

    const xpGained = Number(taskPoints) || 0;
    const newTotalTasksCompleted = (userAvatar.totalTasksCompleted || 0) + 1;
    const newTotalXP = (userAvatar.totalXP || 0) + xpGained;

    result.xpGained = xpGained;

    await UserAvatar.findOneAndUpdate(
      { userId: userObjectId },
      {
        currentXP: newTotalXP,
        totalXP: newTotalXP,
        stage: 'egg',
        totalTasksCompleted: newTotalTasksCompleted,
        lastTaskDate: new Date(),
      },
      { upsert: true },
    );

    result.success = true;
    return result;
  } catch (error) {
    console.error('更新游戏化进度失败:', error);
    return result;
  }
}

export async function getGamificationStats(userId: string | mongoose.Types.ObjectId) {
  try {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const userAvatar = await UserAvatar.findOne({ userId: userObjectId });

    if (!userAvatar) {
      return {
        totalXP: 0,
        totalTasksCompleted: 0,
        stage: 'egg',
      };
    }

    return {
      totalXP: userAvatar.totalXP,
      currentXP: userAvatar.currentXP,
      totalTasksCompleted: userAvatar.totalTasksCompleted,
      stage: userAvatar.stage,
    };
  } catch (error) {
    console.error('获取游戏化统计失败:', error);
    return null;
  }
}
