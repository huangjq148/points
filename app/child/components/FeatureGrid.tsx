'use client';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  gradient: string;
  badge?: string;
  variant?: "default" | "time";
  span?: "single" | "double";
  onClick?: () => void;
}

function FeatureCard({ icon, title, description, gradient, badge, variant = "default", span = "single", onClick }: FeatureCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl cursor-pointer ${span === "double" ? "sm:col-span-2" : ""}`}
      style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px) rotateX(5deg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) rotateX(0)';
      }}
    >
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
        style={{ transition: 'transform 0.5s ease' }}
      />
      <div
        className={`absolute inset-0 ${variant === "time" ? "opacity-45" : "opacity-22"}`}
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.33) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
      />
      <div className={`relative p-5 h-full flex flex-col justify-between min-h-[120px] ${span === "double" ? "sm:min-h-[256px]" : ""} ${variant === "time" ? "ring-1 ring-white/20" : ""}`}>
        <div className="flex justify-between items-start">
          <div 
            className={`w-12 h-12 rounded-[1.15rem] flex items-center justify-center text-3xl backdrop-blur-sm border ${variant === "time" ? "bg-white/25 border-white/25 shadow-lg shadow-black/10" : "bg-white/22 border-white/35"}`}
            style={{ transition: 'transform 0.3s ease' }}
          >
            {icon}
          </div>
          {badge && (
            <span className={`text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${variant === "time" ? "bg-white/20 border-white/25" : "bg-white/25 border-white/25"}`}>
              {badge}
            </span>
          )}
        </div>
        <div>
          <h3 className={`text-white font-black ${variant === "time" ? "text-lg tracking-tight" : "text-lg tracking-tight"}`}>{title}</h3>
          <p className="text-white/82 text-xs font-semibold">{description}</p>
        </div>
      </div>
      {badge === 'NEW' && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
      )}
    </div>
  );
}

interface FeatureGridProps {
  completedTasksCount: number;
  privilegedCount: number;
  urgentPrivilegeRewards?: { _id: string; expiresAt?: string | null }[];
  onNavigate?: (path: string) => void;
}

export default function FeatureGrid({ completedTasksCount, privilegedCount, urgentPrivilegeRewards = [], onNavigate }: FeatureGridProps) {
  const hasUrgentPrivileges = urgentPrivilegeRewards.length > 0;
  const earliestDeadline = urgentPrivilegeRewards
    .filter((reward) => reward.expiresAt)
    .map((reward) => reward.expiresAt as string)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  const features: Array<{
    icon: string;
    title: string;
    description: string;
    gradient: string;
    badge?: string;
    variant?: FeatureCardProps["variant"];
    span?: FeatureCardProps["span"];
    path: string;
  }> = [
    { 
      icon: '🎁', 
      title: '星际商城', 
      description: '可兑换 3 件物品', 
      gradient: 'from-pink-500 via-rose-500 to-red-600',
      badge: 'NEW',
      path: '/child/store'
    }, 
    {
      icon: '🎭',
      title: '特权中心',
      description: hasUrgentPrivileges
        ? `马上看：${urgentPrivilegeRewards.length} 个快截止${earliestDeadline ? ` · 最早 ${new Date(earliestDeadline).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}` : ""}`
        : privilegedCount > 0
          ? `有 ${privilegedCount} 个特权奖励`
          : '家长准备的特别权限',
      gradient: 'from-violet-600 via-fuchsia-600 to-amber-500',
      badge: hasUrgentPrivileges ? 'NOW' : privilegedCount > 0 ? 'HOT' : 'NEW',
      variant: 'time',
      span: 'double',
      path: '/child/store?category=privilege'
    },
    { 
      icon: '📜', 
      title: '探索日志', 
      description: `本周完成 ${completedTasksCount} 项任务`, 
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      path: '/child/task?filter=thisWeek'
    },
    { 
      icon: '💰', 
      title: '我的钱包', 
      description: '查看积分明细', 
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      path: '/child/wallet'
    },
    {
      icon: '🎁',
      title: '我的奖品',
      description: '看看已兑换的小礼物',
      gradient: 'from-amber-200 via-orange-300 to-rose-300',
      badge: '礼物',
      path: '/child/gift',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {features.map((feature) => (
        <FeatureCard
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          gradient={feature.gradient}
          badge={feature.badge}
          variant={feature.variant}
          span={feature.span}
          onClick={() => onNavigate?.(feature.path)}
        />
      ))}
    </div>
  );
}
