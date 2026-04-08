'use client';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  variant?: 'default' | 'time';
  span?: 'single' | 'double';
  onClick?: () => void;
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
  variant = 'default',
  span = 'single',
  onClick,
}: FeatureCardProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`child-card group min-h-[128px] text-left transition hover:-translate-y-0.5 ${span === 'double' ? 'md:col-span-2' : ''}`}
    >
      <div className='flex h-full flex-col justify-between gap-4'>
        <div className='flex items-start justify-between gap-3'>
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-3xl shadow-sm ring-1 ring-white ${variant === 'time' ? 'text-amber-500' : ''}`}
          >
            {icon}
          </div>
          {badge && (
            <span className='rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100'>
              {badge}
            </span>
          )}
        </div>
        <div>
          <h3 className='text-lg font-black tracking-tight text-[var(--child-text)]'>{title}</h3>
          <p className='mt-1 text-xs font-semibold leading-5 text-[var(--child-text-muted)]'>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

interface FeatureGridProps {
  completedTasksCount: number;
  privilegedCount: number;
  urgentPrivilegeRewards?: { _id: string; expiresAt?: string | null }[];
  onNavigate?: (path: string) => void;
}

export default function FeatureGrid({
  completedTasksCount,
  privilegedCount,
  urgentPrivilegeRewards = [],
  onNavigate,
}: FeatureGridProps) {
  const hasUrgentPrivileges = urgentPrivilegeRewards.length > 0;
  const features: Array<{
    icon: string;
    title: string;
    description: string;
    badge?: string;
    variant?: FeatureCardProps['variant'];
    span?: FeatureCardProps['span'];
    path: string;
  }> = [
    {
      icon: '🛒',
      title: '奖励商店',
      description: '看看能兑换什么',
      badge: '商店',
      path: '/child/store',
    },
    {
      icon: '🎈',
      title: '特权专区',
      description: hasUrgentPrivileges
        ? `${urgentPrivilegeRewards.length} 个快截止`
        : `有 ${privilegedCount} 个特权`,
      badge: hasUrgentPrivileges ? '提醒' : '特权',
      variant: 'time',
      span: 'double',
      path: '/child/store?category=privilege',
    },
    {
      icon: '📘',
      title: '任务记录',
      description: `完成 ${completedTasksCount} 项任务`,
      path: '/child/task?filter=thisWeek',
    },
    {
      icon: '🪙',
      title: '积分钱包',
      description: '查看积分变化',
      path: '/child/wallet',
    },
    {
      icon: '🎁',
      title: '我的奖品',
      description: '查看已兑换礼物',
      badge: '礼物',
      path: '/child/gift',
    },
  ];

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {features.map((feature) => (
        <FeatureCard
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          badge={feature.badge}
          variant={feature.variant}
          span={feature.span}
          onClick={() => onNavigate?.(feature.path)}
        />
      ))}
    </div>
  );
}
