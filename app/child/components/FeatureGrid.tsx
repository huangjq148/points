'use client';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  gradient: string;
  badge?: string;
  onClick?: () => void;
}

function FeatureCard({ icon, title, description, gradient, badge, onClick }: FeatureCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl cursor-pointer"
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
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
      <div className="relative p-5 h-full flex flex-col justify-between min-h-[120px]">
        <div className="flex justify-between items-start">
          <div 
            className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm border border-white/30"
            style={{ transition: 'transform 0.3s ease' }}
          >
            {icon}
          </div>
          {badge && (
            <span className="bg-white/30 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm border border-white/20">
              {badge}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-white font-black text-lg">{title}</h3>
          <p className="text-white/80 text-xs font-semibold">{description}</p>
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
  earnedMedalsCount: number;
  onNavigate?: (path: string) => void;
}

export default function FeatureGrid({ completedTasksCount, earnedMedalsCount, onNavigate }: FeatureGridProps) {
  const features = [
    { 
      icon: '🎁', 
      title: '星际商城', 
      description: '可兑换 3 件物品', 
      gradient: 'from-pink-500 via-rose-500 to-red-600',
      badge: 'NEW',
      path: '/child/store'
    },
    { 
      icon: '📜', 
      title: '探索日志', 
      description: `本周完成 ${completedTasksCount} 项任务`, 
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      path: '/child/task?filter=thisWeek'
    },
    { 
      icon: '🏅', 
      title: '成就墙', 
      description: `${earnedMedalsCount}/24 徽章`, 
      gradient: 'from-yellow-400 via-orange-500 to-amber-600',
      path: '/child/achievements'
    },
    { 
      icon: '💰', 
      title: '我的钱包', 
      description: '查看积分明细', 
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      path: '/child/wallet'
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
          onClick={() => onNavigate?.(feature.path)}
        />
      ))}
    </div>
  );
}
