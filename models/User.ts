import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'parent' | 'child';
  identity?: string;
  // children field is deprecated, use familyId and role instead
  children: mongoose.Types.ObjectId[];
  familyId?: mongoose.Types.ObjectId;
  inviteCode?: string;
  createdAt: Date;
  // Added fields for child role
  avatar: string;
  totalPoints: number;
  availablePoints: number;
}

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'parent', 'child'], default: 'parent' },
    identity: { type: String },
    children: [{ type: Schema.Types.ObjectId, ref: 'Child' }], // Deprecated
    familyId: { type: Schema.Types.ObjectId },
    inviteCode: { type: String },
    createdAt: { type: Date, default: Date.now },
    // Added fields for child role
    avatar: { type: String, default: '🦊' },
    totalPoints: { type: Number, default: 0 },
    availablePoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
