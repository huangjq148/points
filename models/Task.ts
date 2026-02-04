import mongoose, { Schema } from 'mongoose';

const TaskSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  childId: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Number, required: true },
  type: { type: String, enum: ['daily', 'advanced', 'challenge'], default: 'daily' },
  icon: { type: String, default: '⭐' },
  requirePhoto: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'], default: 'pending' },
  photoUrl: { type: String },
  submittedAt: { type: Date },
  approvedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

const TaskModel = mongoose.models.Task || mongoose.model('Task', TaskSchema);

export default TaskModel;
