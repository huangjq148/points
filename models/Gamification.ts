import mongoose, { Schema, Document } from 'mongoose';

export type AvatarStage = 'egg' | 'hatchling' | 'explorer' | 'adventurer' | 'hero' | 'legend';

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

export interface IAvatarSkin extends Document {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface IAvatarAccessory extends Document {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  type: 'hat' | 'glasses' | 'cape' | 'pet' | 'background';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const UserAvatarSchema = new Schema<IUserAvatar>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentXP: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ['egg', 'hatchling', 'explorer', 'adventurer', 'hero', 'legend'],
      default: 'egg',
    },
    unlockedSkins: [{ type: String }],
    currentSkin: { type: String, default: 'default' },
    equippedAccessories: [{ type: String }],
    unlockedAccessories: [{ type: String }],
    petName: { type: String },
    lastTaskDate: { type: Date },
    totalTasksCompleted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const AvatarSkinSchema = new Schema<IAvatarSkin>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    unlockLevel: { type: Number, required: true },
    icon: { type: String, required: true },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], required: true },
  },
  { timestamps: true },
);

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
  { timestamps: true },
);

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).UserAvatar;
  delete (mongoose.models as Record<string, unknown>).AvatarSkin;
  delete (mongoose.models as Record<string, unknown>).AvatarAccessory;
}

export const UserAvatar = mongoose.models.UserAvatar ||
  mongoose.model<IUserAvatar>('UserAvatar', UserAvatarSchema);

export const AvatarSkin = mongoose.models.AvatarSkin ||
  mongoose.model<IAvatarSkin>('AvatarSkin', AvatarSkinSchema);

export const AvatarAccessory = mongoose.models.AvatarAccessory ||
  mongoose.model<IAvatarAccessory>('AvatarAccessory', AvatarAccessorySchema);

const gamificationModels = {
  UserAvatar,
  AvatarSkin,
  AvatarAccessory,
};

export default gamificationModels;
