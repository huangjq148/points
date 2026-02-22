import mongoose, { Schema, Document } from 'mongoose';

// 双币种账户系统
export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  coins: number;           // 金币 - 可消费的通用货币
  stars: number;           // 荣誉分 - 无法消费，仅用于等级和勋章
  creditScore: number;     // 信用分 (0-100)
  creditLimit: number;     // 信用额度
  creditUsed: number;      // 已使用的信用额度
  interestRate: number;    // 日利率 (默认 0.001 = 0.1%)
  lastInterestCalcAt: Date;
  totalInterestEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

// 交易记录
export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'income' | 'expense' | 'interest' | 'credit' | 'reward';
  currency: 'coins' | 'stars';
  amount: number;
  balance: number;
  description: string;
  relatedTaskId?: mongoose.Types.ObjectId;
  relatedRewardId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

// 勋章系统
export interface IMedal extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  name: string;
  description: string;
  icon: string;
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  requirement: number;
  requirementType: 'total_tasks' | 'consecutive_days' | 'total_coins' | 'special_milestone';
  isEarned: boolean;
  earnedAt?: Date;
  isNewBadge: boolean;
  viewedAt?: Date;
  createdAt: Date;
}

// 账户 Schema
const AccountSchema = new Schema<IAccount>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  coins: { type: Number, default: 0 },
  stars: { type: Number, default: 0 },
  creditScore: { type: Number, default: 80, min: 0, max: 100 },
  creditLimit: { type: Number, default: 100 },
  creditUsed: { type: Number, default: 0 },
  interestRate: { type: Number, default: 0.001 },
  lastInterestCalcAt: { type: Date, default: Date.now },
  totalInterestEarned: { type: Number, default: 0 },
}, { timestamps: true });

// 交易记录 Schema
const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense', 'interest', 'credit', 'reward'], required: true },
  currency: { type: String, enum: ['coins', 'stars'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  description: { type: String, required: true },
  relatedTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  relatedRewardId: { type: Schema.Types.ObjectId, ref: 'Reward' },
}, { timestamps: true });

// 勋章 Schema
const MedalSchema = new Schema<IMedal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: '🏅' },
  level: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], required: true },
  requirement: { type: Number, required: true },
  requirementType: { type: String, enum: ['total_tasks', 'consecutive_days', 'total_coins', 'special_milestone'], required: true },
  isEarned: { type: Boolean, default: false },
  earnedAt: { type: Date },
  isNewBadge: { type: Boolean, default: false },
  viewedAt: { type: Date },
}, { timestamps: true });

// 防止重复模型错误
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Account;
  delete mongoose.models.Transaction;
  delete mongoose.models.Medal;
}

export const AccountModel = mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const MedalModel = mongoose.models.Medal || mongoose.model<IMedal>('Medal', MedalSchema);

export default { AccountModel, TransactionModel, MedalModel };
