import mongoose from 'mongoose';
import { 
  UserAvatar, 
  AvatarLevel, 
  MedalDefinition, 
  UserMedal,
  AvatarSkin,
  AvatarAccessory 
} from '@/models/Gamification';

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

export interface GamificationUpdateResult {
  success: boolean;
  xpGained: number;
  levelUp: boolean;
  newLevel?: number;
  newMedals: Array<{
    id: string;
    name: string;
    icon: string;
    level: string;
    xpReward: number;
  }>;
  unlockedRewards: Array<{
    type: 'skin' | 'accessory';
    id: string;
    name: string;
    icon: string;
  }>;
}

/**
 * 更新用户游戏化进度（完成任务时调用）
 */
export async function updateGamificationProgress(
  userId: string | mongoose.Types.ObjectId,
  taskPoints: number
): Promise<GamificationUpdateResult> {
  const result: GamificationUpdateResult = {
    success: false,
    xpGained: 0,
    levelUp: false,
    newMedals: [],
    unlockedRewards: [],
  };

  try {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 获取或创建用户角色数据
    let userAvatar = await UserAvatar.findOne({ userId: userObjectId });

    if (!userAvatar) {
      userAvatar = await UserAvatar.create({
        userId: userObjectId,
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

    const oldLevel = userAvatar.level;

    // 计算连续天数
    let newConsecutiveDays = userAvatar.consecutiveDays;
    let newMaxConsecutiveDays = userAvatar.maxConsecutiveDays;
    const newTotalTasksCompleted = userAvatar.totalTasksCompleted + 1;

    if (!userAvatar.lastTaskDate) {
      newConsecutiveDays = 1;
      newMaxConsecutiveDays = 1;
    } else {
      const lastTaskDate = new Date(userAvatar.lastTaskDate);

      if (isSameDay(lastTaskDate, today)) {
        // 今天已经做过任务，不增加连续天数
      } else if (isYesterday(lastTaskDate, today)) {
        newConsecutiveDays += 1;
      } else {
        newConsecutiveDays = 1;
      }

      newMaxConsecutiveDays = Math.max(newMaxConsecutiveDays, newConsecutiveDays);
    }

    // 计算经验值
    let xpGained = taskPoints;
    
    // 连续天数加成
    if (newConsecutiveDays >= 7) {
      xpGained += 5;
    }
    if (newConsecutiveDays >= 21) {
      xpGained += 10;
    }

    result.xpGained = xpGained;

    // 计算升级
    let newCurrentXP = userAvatar.currentXP + xpGained;
    let newTotalXP = userAvatar.totalXP + xpGained;
    let newLevel = userAvatar.level;

    // 检查升级
    let canLevelUp = true;
    while (canLevelUp) {
      const nextLevelInfo = await AvatarLevel.findOne({ level: newLevel + 1 });
      if (!nextLevelInfo) {
        canLevelUp = false;
        break;
      }

      const currentLevelInfo = await AvatarLevel.findOne({ level: newLevel });
      const currentLevelXP = currentLevelInfo?.xpRequired || 0;
      const xpNeeded = nextLevelInfo.xpRequired - currentLevelXP;
      const xpCurrent = newCurrentXP - currentLevelXP;

      if (xpCurrent >= xpNeeded) {
        newLevel++;
        newCurrentXP -= xpNeeded;

        // 检查新等级解锁的奖励
        const newSkins = await AvatarSkin.find({ unlockLevel: newLevel });
        for (const skin of newSkins) {
          if (!userAvatar.unlockedSkins.includes(skin.id)) {
            result.unlockedRewards.push({
              type: 'skin',
              id: skin.id,
              name: skin.name,
              icon: skin.icon,
            });
          }
        }

        const newAccessories = await AvatarAccessory.find({ unlockLevel: newLevel });
        for (const acc of newAccessories) {
          if (!userAvatar.unlockedAccessories.includes(acc.id)) {
            result.unlockedRewards.push({
              type: 'accessory',
              id: acc.id,
              name: acc.name,
              icon: acc.icon,
            });
          }
        }
      } else {
        canLevelUp = false;
      }
    }

    if (newLevel > oldLevel) {
      result.levelUp = true;
      result.newLevel = newLevel;
    }

    // 解锁所有新等级的皮肤和配饰
    const allNewSkins = await AvatarSkin.find({ unlockLevel: { $lte: newLevel } });
    const unlockedSkins = [...new Set([...userAvatar.unlockedSkins, ...allNewSkins.map(s => s.id)])];

    const allNewAccessories = await AvatarAccessory.find({ unlockLevel: { $lte: newLevel } });
    const unlockedAccessories = [...new Set([...userAvatar.unlockedAccessories, ...allNewAccessories.map(a => a.id)])];

    // 检查并授予勋章
    const allMedals = await MedalDefinition.find();
    const existingUserMedals = await UserMedal.find({ userId: userObjectId });
    const existingMedalIds = new Set(existingUserMedals.map(um => um.medalId.toString()));

    for (const medal of allMedals) {
      if (existingMedalIds.has(medal._id.toString())) {
        continue;
      }

      let requirementMet = false;

      if (medal.requirementType === 'total') {
        requirementMet = newTotalTasksCompleted >= medal.requirement;
      } else if (medal.requirementType === 'consecutive') {
        requirementMet = newMaxConsecutiveDays >= medal.requirement;
      }

      if (requirementMet) {
        await UserMedal.create({
          userId: userObjectId,
          medalId: medal._id,
          earnedAt: new Date(),
          progress: medal.requirement,
          isNew: true,
        });

        result.newMedals.push({
          id: medal._id.toString(),
          name: medal.name,
          icon: medal.icon,
          level: medal.level,
          xpReward: medal.xpReward,
        });

        // 勋章也奖励经验值
        xpGained += medal.xpReward;
        newTotalXP += medal.xpReward;
      }
    }

    // 更新用户数据
    await UserAvatar.findOneAndUpdate(
      { userId: userObjectId },
      {
        level: newLevel,
        currentXP: newCurrentXP,
        totalXP: newTotalXP,
        stage: getStageFromLevel(newLevel),
        unlockedSkins,
        unlockedAccessories,
        consecutiveDays: newConsecutiveDays,
        maxConsecutiveDays: newMaxConsecutiveDays,
        totalTasksCompleted: newTotalTasksCompleted,
        lastTaskDate: today,
      },
      { upsert: true }
    );

    result.success = true;
    return result;
  } catch (error) {
    console.error('更新游戏化进度失败:', error);
    return result;
  }
}

/**
 * 根据等级获取阶段
 */
function getStageFromLevel(level: number): string {
  if (level >= 10) return 'legend';
  if (level >= 7) return 'hero';
  if (level >= 5) return 'adventurer';
  if (level >= 3) return 'explorer';
  if (level >= 2) return 'hatchling';
  return 'egg';
}

/**
 * 获取用户游戏化统计
 */
export async function getGamificationStats(userId: string | mongoose.Types.ObjectId) {
  try {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    const userAvatar = await UserAvatar.findOne({ userId: userObjectId });
    const medalCount = await UserMedal.countDocuments({ userId: userObjectId });
    
    if (!userAvatar) {
      return {
        level: 1,
        totalXP: 0,
        consecutiveDays: 0,
        maxConsecutiveDays: 0,
        totalTasksCompleted: 0,
        medalCount: 0,
        stage: 'egg',
      };
    }

    const currentLevel = await AvatarLevel.findOne({ level: userAvatar.level });

    return {
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
    };
  } catch (error) {
    console.error('获取游戏化统计失败:', error);
    return null;
  }
}