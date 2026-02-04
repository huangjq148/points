import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  pin: string;
  children: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    pin: { type: String, required: true },
    children: [{ type: Schema.Types.ObjectId, ref: 'Child' }],
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
