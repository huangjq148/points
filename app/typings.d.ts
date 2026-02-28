export interface PlainReward {
  _id: string;
  userId: string;
  name: string;
  description: string;
  points: number;
  type: "physical" | "privilege";
  icon: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 审核记录
export interface AuditRecord {
  _id?: string;
  submittedAt: string;
  photoUrl?: string;
  submitNote?: string;
  auditedAt?: string;
  status?: "approved" | "rejected";
  auditNote?: string;
  auditedBy?: string;
}

export interface PlainTask {
  _id: string;
  userId: string;
  childId: string;
  name: string;
  description: string;
  points: number;
  type: "daily" | "advanced" | "challenge";
  icon: string;
  requirePhoto: boolean;
  status: "pending" | "submitted" | "approved" | "rejected";
  photoUrl?: string;
  imageUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  // 审核历史记录
  auditHistory?: AuditRecord[];
}

export interface PlainOrder {
  _id: string;
  userId: string;
  childId: string;
  rewardId: string;
  rewardName: string;
  rewardIcon?: string;
  pointsSpent: number;
  status: "pending" | "verified" | "cancelled";
  verificationCode: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  username: string;
  nickname?: string;
  gender?: 'boy' | 'girl' | 'none';
  role: string;
  type: string;
  isMe: boolean;
  phone?: string;
  identity?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDisplayedTask extends PlainTask {
  childName: string;
  childAvatar?: string;
  isRecurring?: boolean;
}

export interface IDisplayedOrder extends PlainOrder {
  rewardName: string;
  rewardIcon?: string;
  childName: string;
  childAvatar: string;
}

export interface ChildStats {
  pendingTasks: number;
  submittedTasks: number;
  pendingOrders: number;
}
