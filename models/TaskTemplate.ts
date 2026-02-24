import mongoose, { Schema, Document } from 'mongoose';

export type TaskType = 'daily' | 'custom';
export type TaskCategory = 'personal_hygiene' | 'learning' | 'housework' | 'social' | 'other';
export type TaskDifficulty = 'easy' | 'normal' | 'hard';
export type RecurrencePattern = 'daily' | 'weekly' | 'custom_days' | 'none';

export interface ITaskTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  points: number;
  bonusPoints: number;
  type: TaskType;
  taskCategory: TaskCategory;
  difficulty: TaskDifficulty;
  icon: string;
  requirePhoto: boolean;
  approvalMode: 'auto' | 'manual';
  recurrence: RecurrencePattern;
  recurrenceDays?: number[];
  recurrenceInterval?: number;
  validFrom?: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTemplateSchema = new Schema<ITaskTemplate>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Number, required: true, default: 0 },
  bonusPoints: { type: Number, default: 0 },
  type: { type: String, enum: ['daily', 'custom'], default: 'daily' },
  taskCategory: { 
    type: String, 
    enum: ['personal_hygiene', 'learning', 'housework', 'social', 'other'], 
    default: 'other' 
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'normal', 'hard'], 
    default: 'normal' 
  },
  icon: { type: String, default: '⭐' },
  requirePhoto: { type: Boolean, default: false },
  approvalMode: { 
    type: String, 
    enum: ['auto', 'manual'], 
    default: 'manual' 
  },
  recurrence: { 
    type: String, 
    enum: ['daily', 'weekly', 'custom_days', 'none'], 
    default: 'none' 
  },
  recurrenceDays: { type: [Number] },
  recurrenceInterval: { type: Number },
  validFrom: { type: Date },
  validUntil: { type: Date },
}, { timestamps: true });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.TaskTemplate;
}

const TaskTemplateModel = mongoose.models.TaskTemplate || mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);

export default TaskTemplateModel;
