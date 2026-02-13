import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  points: number;
  type: 'daily' | 'advanced' | 'challenge';
  icon: string;
  requirePhoto: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTemplateSchema = new Schema<ITaskTemplate>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Number, required: true },
  type: { type: String, enum: ['daily', 'advanced', 'challenge'], default: 'daily' },
  icon: { type: String, default: '⭐' },
  requirePhoto: { type: Boolean, default: false },
}, { timestamps: true });

// Prevent OverwriteModelError in development
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.TaskTemplate;
}

const TaskTemplateModel = mongoose.models.TaskTemplate || mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);

export default TaskTemplateModel;
