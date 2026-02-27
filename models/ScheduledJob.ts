import mongoose, { Schema, Document } from "mongoose";

export type JobType = "recurring_task" | "daily_reset" | "cleanup" | "custom";
export type JobStatus = "running" | "stopped" | "error";
export type JobFrequency = "minutely" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

export interface IScheduledJob extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: JobType;
  status: JobStatus;
  frequency: JobFrequency;
  cronExpression?: string; // 自定义 cron 表达式
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastError?: string;
  runCount: number;
  successCount: number;
  errorCount: number;
  config: {
    // 周期任务专用配置
    taskTemplateId?: mongoose.Types.ObjectId;
    autoCreateEnabled: boolean;
    // 其他配置项
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledJobSchema = new Schema<IScheduledJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["recurring_task", "daily_reset", "cleanup", "custom"],
      default: "custom",
    },
    status: {
      type: String,
      enum: ["running", "stopped", "error"],
      default: "stopped",
    },
    frequency: {
      type: String,
      enum: ["minutely", "hourly", "daily", "weekly", "monthly", "custom"],
      default: "daily",
    },
    cronExpression: { type: String },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    lastError: { type: String },
    runCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    config: {
      type: Schema.Types.Mixed,
      default: { autoCreateEnabled: true },
    },
  },
  { timestamps: true }
);

ScheduledJobSchema.index({ userId: 1, status: 1 });
ScheduledJobSchema.index({ userId: 1, type: 1 });

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.ScheduledJob;
}

const ScheduledJobModel =
  mongoose.models.ScheduledJob ||
  mongoose.model<IScheduledJob>("ScheduledJob", ScheduledJobSchema);

export default ScheduledJobModel;
