import mongoose, { Schema, Document } from 'mongoose';

export interface IChild extends Document {
  userId: mongoose.Types.ObjectId;
  nickname: string;
  avatar: string;
  totalPoints: number;
  availablePoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChildSchema = new Schema<IChild>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nickname: { type: String, required: true },
    avatar: { type: String, default: '🦊' },
    totalPoints: { type: Number, default: 0 },
    availablePoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ChildModel = mongoose.models.Child || mongoose.model<IChild>('Child', ChildSchema);

export default ChildModel;
