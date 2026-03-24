import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'pending' | 'verified' | 'cancelled';
export type OrderType = 'reward' | 'deduction';

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
  validUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  type?: OrderType; // 订单类型：reward-兑换奖励, deduction-积分扣除
  deductedBy?: mongoose.Types.ObjectId; // 扣除操作人（仅用于扣除类型）
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    childId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
    rewardName: { type: String, required: true },
    rewardIcon: { type: String, default: '🎁' },
    pointsSpent: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'verified', 'cancelled'], default: 'pending' },
    verificationCode: { type: String, required: true },
    verifiedAt: { type: Date },
    validUntil: { type: Date, default: null },
    type: { type: String, enum: ['reward', 'deduction'], default: 'reward' },
    deductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default OrderModel;
