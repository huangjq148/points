import mongoose from 'mongoose';
import { 
  AchievementDefinition, 
  UserAchievement, 
  UserAchievementProgress,
  IAchievementDefinition
} from '@/models/Achievement';
import { UserAvatar } from '@/models/Gamification';
import { ITask } from '@/models/Task';

export interface AchievementCheckResult {
  newAchievements: Array<{
    id: string;
    name: string;
    icon: string;
    level: string;
    dimension: string;
    pointsReward: number;
    honorPoints: number;
    privileges?: string[];
  }>;
  updatedProgress: Record<string, number>;
}

export interface TaskCompletionContext {
  task: ITask;
  completedAt: Date;
  isResubmit: boolean;
  previousRejectedAt?: Date;
  isBirthday: boolean;
}

interface AchievementProgressSnapshot {
  totalTasksCompleted?: number;
  totalPointsEarned?: number;
  categoryCounts?: Record<string, number>;
  consecutiveDays?: number;
  maxConsecutiveDays?: number;
  earlyCompletionCount?: number;
  birthdayTasks?: number;
  resubmitQuickCount?: number;
  lastTaskDate?: Date;
  lastResubmitAt?: Date;
  [key: string]: unknown;
}

interface UserAvatarProgress {
  maxConsecutiveDays?: number;
}

const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const isYesterday = (date: Date, today: Date): boolean => {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

const getHourFromDate = (date: Date): number => {
  return date.getHours();
};

export async function checkAndAwardAchievements(
  userId: string | mongoose.Types.ObjectId,
  context?: TaskCompletionContext
): Promise<AchievementCheckResult> {
  const result: AchievementCheckResult = {
    newAchievements: [],
    updatedProgress: {},
  };

  try {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const now = new Date();

    let progress = await UserAchievementProgress.findOne({ userId: userObjectId });
    
    if (!progress) {
      progress = await UserAchievementProgress.create({
        userId: userObjectId,
        totalTasksCompleted: 0,
        totalPointsEarned: 0,
        categoryCounts: {},
        consecutiveDays: 0,
        maxConsecutiveDays: 0,
        earlyCompletionCount: 0,
        multiCategoryActive: 0,
        birthdayTasks: 0,
        resubmitQuickCount: 0,
        hiddenTriggers: {},
      });
    }

    const existingAchievements = await UserAchievement.find({ userId: userObjectId });
    const existingAchievementIds = new Set(existingAchievements.map(ua => ua.achievementId.toString()));

    const allDefinitions = await AchievementDefinition.find({ isActive: true });
    const userAvatar = await UserAvatar.findOne({ userId: userObjectId });

    const progressUpdates: Record<string, unknown> = {};
    let needsSave = false;

    if (context) {
      const { task, completedAt, isResubmit, previousRejectedAt, isBirthday } = context;

      progressUpdates.totalTasksCompleted = (progress.totalTasksCompleted || 0) + 1;
      progressUpdates.totalPointsEarned = (progress.totalPointsEarned || 0) + task.points;

      const categoryKey = task.taskCategory;
      const currentCategoryCount = (progress.categoryCounts as Record<string, number>)[categoryKey] || 0;
      progressUpdates[`categoryCounts.${categoryKey}`] = currentCategoryCount + 1;

      const currentHour = getHourFromDate(completedAt);
      if (currentHour < 8) {
        progressUpdates.earlyCompletionCount = (progress.earlyCompletionCount || 0) + 1;
      }

      if (isBirthday) {
        progressUpdates.birthdayTasks = (progress.birthdayTasks || 0) + 1;
      }

      if (isResubmit && previousRejectedAt) {
        const timeDiff = completedAt.getTime() - previousRejectedAt.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        if (minutesDiff <= 30) {
          progressUpdates.resubmitQuickCount = (progress.resubmitQuickCount || 0) + 1;
          progressUpdates.lastResubmitAt = completedAt;
        }
      }

      const lastTaskDate = progress.lastTaskDate;
      if (!lastTaskDate) {
        progressUpdates.consecutiveDays = 1;
        progressUpdates.maxConsecutiveDays = Math.max(progress.maxConsecutiveDays || 0, 1);
      } else {
        if (isSameDay(new Date(lastTaskDate), completedAt)) {
        } else if (isYesterday(new Date(lastTaskDate), completedAt)) {
          progressUpdates.consecutiveDays = (progress.consecutiveDays || 0) + 1;
          progressUpdates.maxConsecutiveDays = Math.max(progress.maxConsecutiveDays || 0, (progress.consecutiveDays || 0) + 1);
        } else {
          progressUpdates.consecutiveDays = 1;
          progressUpdates.maxConsecutiveDays = Math.max(progress.maxConsecutiveDays || 0, 1);
        }
      }
      progressUpdates.lastTaskDate = completedAt;
      needsSave = true;
    }

    const progressData = {
      ...progress.toObject(),
      ...progressUpdates,
      categoryCounts: {
        ...(progress.categoryCounts as Record<string, number>),
        ...Object.fromEntries(
          Object.entries(progressUpdates)
            .filter(([k]) => k.startsWith('categoryCounts.'))
            .map(([k, v]) => [k.replace('categoryCounts.', ''), v])
        ),
      },
    };

    for (const definition of allDefinitions) {
      if (existingAchievementIds.has(definition._id.toString())) {
        continue;
      }

      const isUnlocked = await checkAchievementCondition(definition, progressData, context, userAvatar);
      
      if (isUnlocked) {
        await UserAchievement.create({
          userId: userObjectId,
          achievementId: definition._id,
          earnedAt: now,
          progress: definition.requirement,
          isNew: true,
        });

        result.newAchievements.push({
          id: definition._id.toString(),
          name: definition.name,
          icon: definition.icon,
          level: definition.level,
          dimension: definition.dimension,
          pointsReward: definition.pointsReward,
          honorPoints: definition.honorPoints,
          privileges: definition.privileges,
        });

        existingAchievementIds.add(definition._id.toString());

        if (definition.pointsReward > 0 && userAvatar) {
          await UserAvatar.findOneAndUpdate(
            { userId: userObjectId },
            { $inc: { totalXP: definition.pointsReward, currentXP: definition.pointsReward } }
          );
        }

        if (definition.honorPoints > 0) {
          const UserModel = mongoose.models.User || mongoose.model('User');
          await UserModel.findByIdAndUpdate(userObjectId, {
            $inc: { honorPoints: definition.honorPoints }
          });
        }
      }

      const currentProgress = getProgressForDefinition(definition, progressData, context);
      result.updatedProgress[definition._id.toString()] = currentProgress;
    }

    if (needsSave) {
      await UserAchievementProgress.findByIdAndUpdate(progress._id, progressUpdates);
    }

    return result;
  } catch (error) {
    console.error('成就检测失败:', error);
    return result;
  }
}

async function checkAchievementCondition(
  definition: IAchievementDefinition,
  progress: AchievementProgressSnapshot,
  context?: TaskCompletionContext,
  userAvatar?: UserAvatarProgress | null
): Promise<boolean> {
  const { conditionType, requirement, requirementDetail } = definition;

  switch (conditionType) {
    case 'total_tasks':
      return (progress.totalTasksCompleted || 0) >= requirement;

    case 'total_points':
      return (progress.totalPointsEarned || 0) >= requirement;

    case 'category_tasks':
      if (!requirementDetail?.category) return false;
      const categoryCount = (progress.categoryCounts as Record<string, number>)[requirementDetail.category] || 0;
      return categoryCount >= requirement;

    case 'consecutive_days':
      return (progress.consecutiveDays || 0) >= requirement;

    case 'early_completion':
      return (progress.earlyCompletionCount || 0) >= requirement;

    case 'specific_time':
      if (!context || !requirementDetail?.hour) return false;
      const currentHour = getHourFromDate(context.completedAt);
      return currentHour <= requirementDetail.hour;

    case 'resubmit_quick':
      return (progress.resubmitQuickCount || 0) >= requirement;

    case 'birthday_task':
      return Boolean(context?.isBirthday) && (progress.birthdayTasks || 0) >= requirement;

    case 'category_streak':
      if (!requirementDetail?.category) return false;
      return (progress.maxConsecutiveDays || 0) >= requirement;

    case 'streak_any_time':
      if (!userAvatar) return false;
      return (userAvatar.maxConsecutiveDays || 0) >= requirement;

    default:
      return false;
  }
}

function getProgressForDefinition(
  definition: IAchievementDefinition,
  progress: AchievementProgressSnapshot,
  context?: TaskCompletionContext
): number {
  const { conditionType, requirement, requirementDetail } = definition;

  switch (conditionType) {
    case 'total_tasks':
      return Math.min(requirement, progress.totalTasksCompleted || 0);

    case 'total_points':
      return Math.min(requirement, progress.totalPointsEarned || 0);

    case 'category_tasks':
      if (!requirementDetail?.category) return 0;
      return Math.min(requirement, (progress.categoryCounts as Record<string, number>)[requirementDetail.category] || 0);

    case 'consecutive_days':
      return Math.min(requirement, progress.consecutiveDays || 0);

    case 'early_completion':
      return Math.min(requirement, progress.earlyCompletionCount || 0);

    case 'specific_time':
      if (!context || !requirementDetail?.hour) return 0;
      const currentHour = getHourFromDate(context.completedAt);
      return currentHour <= requirementDetail.hour ? 1 : 0;

    case 'resubmit_quick':
      return Math.min(requirement, progress.resubmitQuickCount || 0);

    case 'birthday_task':
      return context?.isBirthday ? 1 : 0;

    case 'category_streak':
      return Math.min(requirement, progress.maxConsecutiveDays || 0);

    case 'streak_any_time':
      return Math.min(requirement, progress.maxConsecutiveDays || 0);

    default:
      return 0;
  }
}

export async function getUserAchievements(userId: string | mongoose.Types.ObjectId) {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const definitions = await AchievementDefinition.find({ isActive: true }).sort({ order: 1 });
  const userAchievements = await UserAchievement.find({ userId: userObjectId });
  let userProgress = await UserAchievementProgress.findOne({ userId: userObjectId });
  const userAvatar = await UserAvatar.findOne({ userId: userObjectId });

  if (!userProgress) {
    userProgress = {
      totalTasksCompleted: 0,
      totalPointsEarned: 0,
      categoryCounts: {},
      consecutiveDays: 0,
      maxConsecutiveDays: 0,
      earlyCompletionCount: 0,
      multiCategoryActive: 0,
      birthdayTasks: 0,
      resubmitQuickCount: 0,
    } as AchievementProgressSnapshot;
  }

  const earnedIds = new Set(userAchievements.map(ua => ua.achievementId.toString()));

  return definitions.map(def => {
    const userAch = userAchievements.find(ua => ua.achievementId.toString() === def._id.toString());
    const isEarned = earnedIds.has(def._id.toString());
    
    let progress = 0;
    let progressPercent = 0;

    if (isEarned) {
      progress = def.requirement;
      progressPercent = 100;
    } else {
      progress = calculateProgress(def, userProgress, userAvatar);
      progressPercent = Math.min(100, Math.round((progress / def.requirement) * 100));
    }

    return {
      id: def._id.toString(),
      dimension: def.dimension,
      category: def.category,
      level: def.level,
      name: def.name,
      description: def.description,
      icon: def.icon,
      requirement: def.requirement,
      conditionType: def.conditionType,
      pointsReward: def.pointsReward,
      honorPoints: def.honorPoints,
      privileges: def.privileges,
      isHidden: def.isHidden,
      isEarned,
      earnedAt: userAch?.earnedAt?.toISOString() || null,
      isNew: userAch?.isNew || false,
      progress,
      progressPercent,
    };
  });
}

function calculateProgress(
  def: IAchievementDefinition,
  progress: AchievementProgressSnapshot,
  userAvatar?: UserAvatarProgress | null
): number {
  const { conditionType, requirement, requirementDetail } = def;

  switch (conditionType) {
    case 'total_tasks':
      return Math.min(requirement, progress.totalTasksCompleted || 0);

    case 'total_points':
      return Math.min(requirement, progress.totalPointsEarned || 0);

    case 'category_tasks':
      if (!requirementDetail?.category) return 0;
      const categoryCount = (progress.categoryCounts as Record<string, number>)[requirementDetail.category] || 0;
      return Math.min(requirement, categoryCount);

    case 'consecutive_days':
      return Math.min(requirement, Math.max(progress.consecutiveDays || 0, progress.maxConsecutiveDays || 0));

    case 'early_completion':
      return Math.min(requirement, progress.earlyCompletionCount || 0);

    case 'resubmit_quick':
      return Math.min(requirement, progress.resubmitQuickCount || 0);

    case 'birthday_task':
      return Math.min(requirement, progress.birthdayTasks || 0);

    case 'category_streak':
      return Math.min(requirement, progress.maxConsecutiveDays || 0);

    case 'streak_any_time':
      if (!userAvatar) return 0;
      return Math.min(requirement, userAvatar.maxConsecutiveDays || 0);

    default:
      return 0;
  }
}

export async function getAchievementStats(userId: string | mongoose.Types.ObjectId) {
  const targetUserId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const definitions = await AchievementDefinition.find({ isActive: true }).sort({ order: 1 });
  const userAchievements = await UserAchievement.find({ userId: targetUserId });

  const earnedByDimension: Record<string, number> = {
    accumulation: 0,
    behavior: 0,
    surprise: 0,
  };

  const totalByDimension: Record<string, number> = {
    accumulation: 0,
    behavior: 0,
    surprise: 0,
  };

  definitions.forEach(def => {
    totalByDimension[def.dimension] = (totalByDimension[def.dimension] || 0) + 1;
  });

  userAchievements.forEach(ua => {
    const def = definitions.find(d => d._id.toString() === ua.achievementId.toString());
    if (def) {
      earnedByDimension[def.dimension] = (earnedByDimension[def.dimension] || 0) + 1;
    }
  });

  let honorPoints = 0;
  try {
    const UserModel = mongoose.models.User || mongoose.model('User');
    const user = await UserModel.findById(targetUserId).select('honorPoints');
    honorPoints = user?.honorPoints || 0;
  } catch (e) {
    console.error('获取荣誉分失败:', e);
  }

  return {
    total: definitions.length,
    earned: userAchievements.length,
    newCount: userAchievements.filter(ua => ua.isNew).length,
    honorPoints,
    earnedByDimension,
    totalByDimension,
    completionRate: definitions.length > 0 
      ? Math.round((userAchievements.length / definitions.length) * 100) 
      : 0,
  };
}

export async function markAchievementsViewed(userId: string, achievementId?: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (achievementId) {
    await UserAchievement.findOneAndUpdate(
      { userId: userObjectId, achievementId: new mongoose.Types.ObjectId(achievementId) },
      { isNew: false, viewedAt: new Date() }
    );
  } else {
    await UserAchievement.updateMany(
      { userId: userObjectId, isNew: true },
      { isNew: false, viewedAt: new Date() }
    );
  }
}
