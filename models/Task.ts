import mongoose, { Schema, Document } from "mongoose";

export type TaskType = "daily" | "custom";
export type TaskCategory = "personal_hygiene" | "learning" | "housework" | "social" | "other";
export type TaskDifficulty = "easy" | "normal" | "hard";
export type RecurrencePattern = "minutely" | "daily" | "weekly" | "custom_days" | "none";
export type TaskStatus = "pending" | "submitted" | "approved" | "rejected" | "expired" | "failed";

// 审核记录
export interface IAuditRecord {
  _id?: mongoose.Types.ObjectId;
  // 提交信息
  submittedAt: Date;
  photoUrl?: string;
  submitNote?: string;
  // 审核信息
  auditedAt?: Date;
  status?: "approved" | "rejected";
  auditNote?: string;
  auditedBy?: mongoose.Types.ObjectId;
}

export type ExpiryPolicy = "auto_close" | "keep" | "rollover";

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  childId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  points: number;
  bonusPoints: number;
  type: TaskType;
  taskCategory: TaskCategory;
  difficulty: TaskDifficulty;
  icon: string;
  requirePhoto: boolean;
  approvalMode: "auto" | "manual";
  status: TaskStatus;
  photoUrl?: string;
  rejectionReason?: string;
  imageUrl?: string;
  recurrence: RecurrencePattern;
  recurrenceDays?: number[];
  recurrenceInterval?: number;
  recurrenceDay?: number; // 用于每周/每月的特定日期
  // 周期任务新字段
  isRecurring: boolean; // 是否周期任务
  recurrenceRule?: string; // RFC5545 格式的规则，如 FREQ=DAILY;INTERVAL=1
  autoPublishTime?: string; // 自动发布时间，如 "08:00"
  expiryPolicy: ExpiryPolicy; // 过期处理策略
  validFrom?: Date; // 周期任务生效开始日期
  validUntil?: Date; // 周期任务生效结束日期
  isRecurringTemplate?: boolean; // 是否是周期任务模板（不直接显示给孩子）
  originalTaskId?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  approvedAt?: Date;
  completedAt?: Date;
  streakCount?: number;
  lastCompletedAt?: Date;
  isCompensated?: boolean;
  compensatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deadline: Date;
  // 审核历史记录
  auditHistory: IAuditRecord[];
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    childId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    points: { type: Number, required: true, default: 0 },
    bonusPoints: { type: Number, default: 0 },
    type: { type: String, enum: ["daily", "custom"], default: "daily" },
    taskCategory: {
      type: String,
      enum: ["personal_hygiene", "learning", "housework", "social", "other"],
      default: "other",
    },
    difficulty: {
      type: String,
      enum: ["easy", "normal", "hard"],
      default: "normal",
    },
    icon: { type: String, default: "⭐" },
    requirePhoto: { type: Boolean, default: false },
    approvalMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["pending", "submitted", "approved", "rejected", "expired", "failed"],
      default: "pending",
    },
    photoUrl: { type: String },
    rejectionReason: { type: String },
    imageUrl: { type: String },
    recurrence: {
      type: String,
      enum: ["minutely", "daily", "weekly", "custom_days", "none"],
      default: "none",
    },
    recurrenceDays: { type: [Number] },
    recurrenceInterval: { type: Number },
    recurrenceDay: { type: Number }, // 0-6 for weekly, 1-31 for monthly
    // 周期任务新字段
    isRecurring: { type: Boolean, default: false },
    recurrenceRule: { type: String }, // RFC5545 format
    autoPublishTime: { type: String, default: "00:00" }, // HH:mm format
    expiryPolicy: {
      type: String,
      enum: ["auto_close", "keep", "rollover"],
      default: "auto_close",
    },
    validFrom: { type: Date },
    validUntil: { type: Date },
    isRecurringTemplate: { type: Boolean, default: false },
    originalTaskId: { type: Schema.Types.ObjectId, ref: "Task" },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    completedAt: { type: Date },
    streakCount: { type: Number, default: 0 },
    lastCompletedAt: { type: Date },
    isCompensated: { type: Boolean, default: false },
    compensatedAt: { type: Date },
    deadline: { type: Date },
    // 审核历史记录
    auditHistory: [
      {
        submittedAt: { type: Date, required: true },
        photoUrl: { type: String },
        submitNote: { type: String },
        auditedAt: { type: Date },
        status: { type: String, enum: ["approved", "rejected"] },
        auditNote: { type: String },
        auditedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true },
);

TaskSchema.index({ childId: 1, status: 1, createdAt: -1 });
TaskSchema.index({ childId: 1, type: 1, startTime: 1 });

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Task;
}

const TaskModel = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default TaskModel;
