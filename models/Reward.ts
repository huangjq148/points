import mongoose, { Schema, Document } from 'mongoose';

export type RewardType = 'physical' | 'privilege';

export interface IReward extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  points: number;
  type: RewardType;
  icon: string;
  stock: number;
  isActive: boolean;
  expiresAt?: Date | null;
  validDurationValue?: number | null;
  validDurationUnit?: 'day' | 'hour' | null;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    points: { type: Number, required: true },
    type: { type: String, enum: ['physical', 'privilege'], default: 'physical' },
    icon: { type: String, default: '🎁' },
    stock: { type: Number, default: -1 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    validDurationValue: { type: Number, default: null },
    validDurationUnit: { type: String, enum: ['day', 'hour'], default: null },
  },
  { timestamps: true }
);

const RewardModel = mongoose.models.Reward || mongoose.model<IReward>('Reward', RewardSchema);

export default RewardModel;
