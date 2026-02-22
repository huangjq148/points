import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  childId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  points: number;
  type: 'daily' | 'advanced' | 'challenge';
  taskCategory: 'regular' | 'special'; // 常规任务 vs 特殊任务
  icon: string;
  requirePhoto: boolean;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired';
  photoUrl?: string;
  rejectionReason?: string;
  imageUrl?: string; // Task illustration image
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceDay?: number; // 0-6 for Weekly, 1-31 for Monthly
  originalTaskId?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  approvedAt?: Date;
  completedAt?: Date;
  deadline?: Date; // Deadline for the task
  streakCount?: number; // 连续完成天数
  lastCompletedAt?: Date; // 上次完成时间
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  childId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Number, required: true },
  type: { type: String, enum: ['daily', 'advanced', 'challenge'], default: 'daily' },
  taskCategory: { type: String, enum: ['regular', 'special'], default: 'regular' },
  icon: { type: String, default: '⭐' },
  requirePhoto: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected', 'expired'], default: 'pending' },
  photoUrl: { type: String },
  rejectionReason: { type: String },
  imageUrl: { type: String },
  recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
  recurrenceDay: { type: Number },
  originalTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  submittedAt: { type: Date },
  approvedAt: { type: Date },
  completedAt: { type: Date },
  deadline: { type: Date },
  streakCount: { type: Number, default: 0 },
  lastCompletedAt: { type: Date },
}, { timestamps: true });

// Prevent OverwriteModelError in development
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Task;
}

const TaskModel = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default TaskModel;
