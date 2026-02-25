import mongoose, { Schema, Document, Types } from 'mongoose';

export type AchievementDimension = 'accumulation' | 'behavior' | 'surprise';

export type AchievementLevel = 'bronze' | 'silver' | 'gold' | 'legendary';

export type AchievementCategory = 
  | 'task_count'
  | 'points_count'
  | 'category_count'
  | 'streak_behavior'
  | 'time_behavior'
  | 'quality_behavior'
  | 'multi_category'
  | 'hidden_surprise';

export type AchievementConditionType = 
  | 'total_tasks'
  | 'total_points'
  | 'category_tasks'
  | 'consecutive_days'
  | 'specific_time'
  | 'multi_category'
  | 'resubmit_quick'
  | 'birthday_task'
  | 'combo_tasks'
  | 'early_completion'
  | 'streak_any_time'
  | 'category_streak';

export interface IAchievementDefinition {
  dimension: AchievementDimension;
  category: AchievementCategory;
  level: AchievementLevel;
  name: string;
  description: string;
  hiddenDescription?: string;
  icon: string;
  conditionType: AchievementConditionType;
  requirement: number;
  requirementDetail?: {
    category?: string;
    timeStart?: string;
    timeEnd?: string;
    timeWindow?: number;
    taskTypes?: string[];
    difficulty?: string;
    categories?: string[];
    hour?: number;
  };
  pointsReward: number;
  honorPoints: number;
  privileges?: string[];
  isHidden: boolean;
  isActive: boolean;
  order: number;
}

export interface IAchievementProgress {
  userId: Types.ObjectId;
  totalTasksCompleted: number;
  totalPointsEarned: number;
  categoryCounts: Record<string, number>;
  consecutiveDays: number;
  maxConsecutiveDays: number;
  lastTaskDate?: Date;
  earlyCompletionCount: number;
  multiCategoryActive: number;
  lastResubmitAt?: Date;
  hiddenTriggers: Record<string, any>;
  birthdayTasks: number;
  resubmitQuickCount: number;
  updatedAt: Date;
}

const RequirementDetailSchema = new Schema({
  category: { type: String },
  timeStart: { type: String },
  timeEnd: { type: String },
  timeWindow: { type: Number },
  taskTypes: { type: [String] },
  difficulty: { type: String },
  categories: { type: [String] },
  hour: { type: Number },
}, { _id: false });

const AchievementDefinitionSchema = new Schema<IAchievementDefinition>(
  {
    dimension: { 
      type: String, 
      enum: ['accumulation', 'behavior', 'surprise'], 
      required: true 
    },
    category: { 
      type: String, 
      enum: [
        'task_count', 'points_count', 'category_count',
        'streak_behavior', 'time_behavior', 'quality_behavior', 
        'multi_category', 'hidden_surprise'
      ], 
      required: true 
    },
    level: { 
      type: String, 
      enum: ['bronze', 'silver', 'gold', 'legendary'], 
      required: true 
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    hiddenDescription: { type: String },
    icon: { type: String, required: true },
    conditionType: { 
      type: String, 
      enum: [
        'total_tasks', 'total_points', 'category_tasks', 'consecutive_days',
        'specific_time', 'multi_category', 'resubmit_quick', 'birthday_task', 
        'combo_tasks', 'early_completion', 'streak_any_time', 'category_streak'
      ],
      required: true 
    },
    requirement: { type: Number, required: true },
    requirementDetail: { type: RequirementDetailSchema, default: {} },
    pointsReward: { type: Number, default: 0 },
    honorPoints: { type: Number, default: 0 },
    privileges: { type: [String], default: [] },
    isHidden: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AchievementDefinitionSchema.index({ isActive: 1, order: 1 });

export const AchievementDefinition = mongoose.models.AchievementDefinition ||
  mongoose.model<IAchievementDefinition>('AchievementDefinition', AchievementDefinitionSchema);

export const UserAchievement = mongoose.models.UserAchievement || 
  mongoose.model<{ userId: Types.ObjectId; achievementId: Types.ObjectId; earnedAt: Date; progress: number; isNew: boolean; viewedAt?: Date }>(
    'UserAchievement', 
    new Schema(
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        achievementId: { type: Schema.Types.ObjectId, ref: 'AchievementDefinition', required: true },
        earnedAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 100 },
        isNew: { type: Boolean, default: true },
        viewedAt: { type: Date },
      },
      { timestamps: true }
    )
  );

UserAchievement.schema.index({ userId: 1, achievementId: 1 }, { unique: true });
UserAchievement.schema.index({ userId: 1, isNew: 1 });

export const UserAchievementProgress = mongoose.models.UserAchievementProgress ||
  mongoose.model<IAchievementProgress>(
    'UserAchievementProgress',
    new Schema(
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        totalTasksCompleted: { type: Number, default: 0 },
        totalPointsEarned: { type: Number, default: 0 },
        categoryCounts: { type: Schema.Types.Mixed, default: {} },
        consecutiveDays: { type: Number, default: 0 },
        maxConsecutiveDays: { type: Number, default: 0 },
        lastTaskDate: { type: Date },
        earlyCompletionCount: { type: Number, default: 0 },
        multiCategoryActive: { type: Number, default: 0 },
        lastResubmitAt: { type: Date },
        hiddenTriggers: { type: Schema.Types.Mixed, default: {} },
        birthdayTasks: { type: Number, default: 0 },
        resubmitQuickCount: { type: Number, default: 0 },
      },
      { timestamps: true }
    )
  );

UserAchievementProgress.schema.index({ userId: 1 });

export default {
  AchievementDefinition,
  UserAchievement,
  UserAchievementProgress,
};
