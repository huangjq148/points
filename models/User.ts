import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'parent' | 'student';
  identity?: string;
  children: mongoose.Types.ObjectId[];
  familyId?: mongoose.Types.ObjectId;
  inviteCode?: string;
  createdAt: Date;
}

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'parent', 'student'], default: 'parent' },
    identity: { type: String },
    children: [{ type: Schema.Types.ObjectId, ref: 'Child' }],
    familyId: { type: Schema.Types.ObjectId },
    inviteCode: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
