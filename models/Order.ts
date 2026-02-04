import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'pending' | 'verified' | 'cancelled';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  childId: mongoose.Types.ObjectId;
  rewardId: mongoose.Types.ObjectId;
  rewardName: string;
  rewardIcon?: string;
  pointsSpent: number;
  status: OrderStatus;
  verificationCode: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    childId: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
    rewardName: { type: String, required: true },
    rewardIcon: { type: String, default: '🎁' },
    pointsSpent: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'verified', 'cancelled'], default: 'pending' },
    verificationCode: { type: String, required: true },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default OrderModel;
