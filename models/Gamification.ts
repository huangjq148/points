import mongoose, { Schema, Document } from 'mongoose';

// 勋章等级
export type MedalLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

// 勋章类型
export type MedalType = 'task_master' | 'streak_master' | 'persistence' | 'champion';

// 勋章定义接口
export interface IMedalDefinition extends Document {
  type: MedalType;
  level: MedalLevel;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  requirementType: 'total' | 'consecutive';
  xpReward: number;
  color: string;
  order: number;
}

// 用户勋章接口
export interface IUserMedal extends Document {
  userId: mongoose.Types.ObjectId;
  medalId: mongoose.Types.ObjectId;
  earnedAt: Date;
  progress: number;
  isNew: boolean;
}

// 成长阶段
export type AvatarStage = 'egg' | 'hatchling' | 'explorer' | 'adventurer' | 'hero' | 'legend';

// 用户角色成长数据
export interface IUserAvatar extends Document {
  userId: mongoose.Types.ObjectId;
  currentXP: number;
  totalXP: number;
  stage: AvatarStage;
  unlockedSkins: string[];
  currentSkin: string;
  equippedAccessories: string[];
  unlockedAccessories: string[];
  petName?: string;
  lastTaskDate?: Date;
  totalTasksCompleted: number;
}

// 外观/皮肤定义
export interface IAvatarSkin extends Document {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// 配饰定义
export interface IAvatarAccessory extends Document {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  type: 'hat' | 'glasses' | 'cape' | 'pet' | 'background';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// 勋章定义模型
const MedalDefinitionSchema = new Schema<IMedalDefinition>(
  {
    type: { type: String, enum: ['task_master', 'streak_master', 'persistence', 'champion'], required: true },
    level: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    requirement: { type: Number, required: true },
    requirementType: { type: String, enum: ['total', 'consecutive'], required: true },
    xpReward: { type: Number, required: true },
    color: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 用户勋章模型
const UserMedalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    medalId: { type: Schema.Types.ObjectId, ref: 'MedalDefinition', required: true },
    earnedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    isNew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserMedalSchema.index({ userId: 1, medalId: 1 }, { unique: true });

// 用户角色成长模型
const UserAvatarSchema = new Schema<IUserAvatar>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentXP: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
    stage: { 
      type: String, 
      enum: ['egg', 'hatchling', 'explorer', 'adventurer', 'hero', 'legend'], 
      default: 'egg' 
    },
    unlockedSkins: [{ type: String }],
    currentSkin: { type: String, default: 'default' },
    equippedAccessories: [{ type: String }],
    unlockedAccessories: [{ type: String }],
    petName: { type: String },
    lastTaskDate: { type: Date },
    totalTasksCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 外观模型
const AvatarSkinSchema = new Schema<IAvatarSkin>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    unlockLevel: { type: Number, required: true },
    icon: { type: String, required: true },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], required: true },
  },
  { timestamps: true }
);

// 配饰模型
const AvatarAccessorySchema = new Schema<IAvatarAccessory>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    unlockLevel: { type: Number, required: true },
    type: { type: String, enum: ['hat', 'glasses', 'cape', 'pet', 'background'], required: true },
    icon: { type: String, required: true },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], required: true },
  },
  { timestamps: true }
);

// 防止重复定义错误
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).MedalDefinition;
  delete (mongoose.models as Record<string, unknown>).UserMedal;
  delete (mongoose.models as Record<string, unknown>).UserAvatar;
  delete (mongoose.models as Record<string, unknown>).AvatarSkin;
  delete (mongoose.models as Record<string, unknown>).AvatarAccessory;
}

// 导出模型
export const MedalDefinition = mongoose.models.MedalDefinition || 
  mongoose.model<IMedalDefinition>('MedalDefinition', MedalDefinitionSchema);

export const UserMedal = mongoose.models.UserMedal || 
  mongoose.model<IUserMedal>('UserMedal', UserMedalSchema);

export const UserAvatar = mongoose.models.UserAvatar || 
  mongoose.model<IUserAvatar>('UserAvatar', UserAvatarSchema);

export const AvatarSkin = mongoose.models.AvatarSkin || 
  mongoose.model<IAvatarSkin>('AvatarSkin', AvatarSkinSchema);

export const AvatarAccessory = mongoose.models.AvatarAccessory || 
  mongoose.model<IAvatarAccessory>('AvatarAccessory', AvatarAccessorySchema);

const gamificationModels = {
  MedalDefinition,
  UserMedal,
  UserAvatar,
  AvatarSkin,
  AvatarAccessory,
};

export default gamificationModels;
