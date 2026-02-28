'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Lock,
  Star,
  Sparkles,
  Flame,
  Zap,
  Gift,
  Footprints,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  dimension: 'accumulation' | 'behavior' | 'surprise';
  category: string;
  level: 'bronze' | 'silver' | 'gold' | 'legendary';
  name: string;
  description: string;
  icon: string;
  requirement: number;
  conditionType: string;
  pointsReward: number;
  honorPoints: number;
  privileges?: string[];
  isHidden: boolean;
  isEarned: boolean;
  earnedAt?: string;
  isNew: boolean;
  progress: number;
  progressPercent: number;
}

interface MedalWallProps {
  achievements: Achievement[];
  stats: {
    total: number;
    earned: number;
    newAchievements: number;
    honorPoints: number;
    earnedByDimension?: Record<string, number>;
    totalByDimension?: Record<string, number>;
  };
  onAchievementViewed?: (achievementId?: string) => void;
}

const levelConfig = {
  bronze: {
    label: '青铜',
    bgColor: 'from-amber-600 to-amber-800',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-100',
    shadow: 'shadow-amber-900/50',
    glowColor: '#f59e0b',
  },
  silver: {
    label: '白银',
    bgColor: 'from-slate-400 to-slate-600',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-100',
    shadow: 'shadow-slate-800/50',
    glowColor: '#94a3b8',
  },
  gold: {
    label: '黄金',
    bgColor: 'from-yellow-500 to-yellow-700',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-100',
    shadow: 'shadow-yellow-800/50',
    glowColor: '#eab308',
  },
  legendary: {
    label: '传奇',
    bgColor: 'from-purple-600 to-pink-600',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-100',
    shadow: 'shadow-purple-900/50',
    glowColor: '#a855f7',
  },
};

const AchievementCard: React.FC<{
  achievement: Achievement;
  onView: () => void;
  index?: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ achievement, onView, index = 0, isExpanded, onToggle }) => {
  const config = levelConfig[achievement.level];
  const showDetails = isExpanded;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    if (showDetails) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDetails, onToggle]);

  const handleClick = () => {
    if (achievement.isNew) {
      onView();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: [config.glowColor, '#FFD700', '#FFF', '#FF6347'],
      });
    }
    onToggle();
  };

  const getConditionText = () => {
    switch (achievement.conditionType) {
      case 'total_tasks':
        return `累计完成 ${achievement.requirement} 个任务`;
      case 'total_points':
        return `累计获得 ${achievement.requirement} 积分`;
      case 'category_tasks':
        return `完成 ${achievement.requirement} 次任务`;
      case 'consecutive_days':
        return `连续 ${achievement.requirement} 天完成任务`;
      case 'early_completion':
        return `提前完成任务 ${achievement.requirement} 次`;
      case 'specific_time':
        return `在 ${achievement.requirement} 点前完成任务`;
      case 'resubmit_quick':
        return `${achievement.requirement} 分钟内快速重做任务`;
      case 'birthday_task':
        return `在生日当天完成任务`;
      case 'category_streak':
        return `连续 ${achievement.requirement} 天完成任务`;
      default:
        return `达成条件`;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: achievement.isEarned ? 1.02 : 1 }}
      className={`relative cursor-pointer rounded-2xl transition-all duration-300 ${
        achievement.isEarned
          ? `bg-gradient-to-br ${config.bgColor} ${config.shadow} shadow-lg`
          : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
      }`}
      style={{
        boxShadow:
          achievement.isNew && achievement.isEarned
            ? `0 0 20px ${config.glowColor}40`
            : undefined,
        zIndex: showDetails ? 50 - index : 1,
      }}
    >
      {achievement.isNew && achievement.isEarned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className='absolute -top-1 -right-1 z-20'
        >
          <span className='flex h-5 w-5'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-[10px] text-white font-bold'>
              !
            </span>
          </span>
        </motion.div>
      )}

      {!showDetails && (
        <div className='p-4' onClick={handleClick}>
          <div
            className={`text-5xl mb-3 text-center transition-all ${achievement.isEarned ? '' : 'grayscale opacity-40'}`}
          >
            {achievement.icon}
          </div>

          <h3
            className={`font-bold text-center text-sm mb-1 ${achievement.isEarned ? config.textColor : 'text-gray-500'}`}
          >
            {achievement.isHidden && !achievement.isEarned
              ? '???'
              : achievement.name}
          </h3>

          <div
            className={`text-xs text-center px-2 py-0.5 rounded-full inline-block mx-auto w-full ${
              achievement.isEarned
                ? `bg-white/20 ${config.textColor}`
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {config.label}
          </div>

          {!achievement.isEarned && (
            <div className='mt-3'>
              <div className='flex justify-between text-[10px] text-gray-400 mb-1'>
                <span>
                  {achievement.progress}/{achievement.requirement}
                </span>
                <span>{achievement.progressPercent}%</span>
              </div>
              <div className='h-1.5 bg-gray-200 rounded-full overflow-hidden'>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${achievement.progressPercent}%` }}
                  className={`h-full rounded-full ${
                    achievement.level === 'bronze'
                      ? 'bg-amber-500'
                      : achievement.level === 'silver'
                        ? 'bg-slate-400'
                        : achievement.level === 'gold'
                          ? 'bg-yellow-500'
                          : 'bg-purple-500'
                  }`}
                />
              </div>
            </div>
          )}

          {achievement.isEarned && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='absolute top-2 left-2'
            >
              <Star className='w-4 h-4 text-yellow-300 fill-yellow-300' />
            </motion.div>
          )}

          {!achievement.isEarned && (
            <div className='mt-2 text-[10px] text-center text-gray-400'>
              点击查看条件
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute inset-0 backdrop-blur-md p-2 flex flex-col justify-end pt-4 z-30 rounded-2xl ${
              achievement.isEarned ? 'bg-gray-900/95' : 'bg-gray-800/95'
            }`}
          >
            <div className='text-center'>
              <div className='text-4xl mb-2'>{achievement.icon}</div>
              <h4
                className={`font-bold text-lg mb-1 ${achievement.isEarned ? config.textColor : 'text-gray-200'}`}
              >
                {achievement.isHidden && !achievement.isEarned
                  ? '神秘成就'
                  : achievement.name}
              </h4>
              <p className='text-xs text-gray-300 mb-3'>
                {achievement.isHidden && !achievement.isEarned
                  ? '达成条件后自动解锁'
                  : achievement.description}
              </p>

              <div className='space-y-2 text-xs bg-black/20 p-3 rounded-xl text-left'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>解锁条件:</span>
                  <span
                    className={`font-medium ${achievement.isEarned ? 'text-green-400' : 'text-yellow-400'}`}
                  >
                    {getConditionText()}
                  </span>
                </div>
                {!achievement.isHidden && (
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-400'>当前进度:</span>
                    <span className='text-white font-medium'>
                      {achievement.progress}/{achievement.requirement}
                    </span>
                  </div>
                )}
                <div className='flex justify-between items-center'>
                  <span className='text-gray-400'>奖励积分:</span>
                  <span className='text-yellow-400'>
                    +{achievement.pointsReward}
                  </span>
                </div>
                {achievement.honorPoints > 0 && (
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-400'>荣誉分:</span>
                    <span className='text-purple-400'>
                      +{achievement.honorPoints}
                    </span>
                  </div>
                )}
                {achievement.isEarned && achievement.earnedAt && (
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-400'>获得时间:</span>
                    <span className='text-green-400'>
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {achievement.isEarned &&
                achievement.privileges &&
                achievement.privileges.length > 0 && (
                  <div className='mt-3 text-xs bg-purple-500/20 text-purple-200 px-3 py-2 rounded-full'>
                    已解锁特权: {achievement.privileges.join(', ')}
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const MedalWall: React.FC<MedalWallProps> = ({
  achievements,
  stats,
  onAchievementViewed,
}) => {
  const [activeDimension, setActiveDimension] = useState<
    'all' | 'accumulation' | 'behavior' | 'surprise'
  >('all');
  const [showUnearned, setShowUnearned] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredAchievements = achievements.filter((a) => {
    if (activeDimension !== 'all' && a.dimension !== activeDimension)
      return false;
    if (!showUnearned && !a.isEarned) return false;
    return true;
  });

  const handleView = (achievementId?: string) => {
    if (onAchievementViewed) {
      onAchievementViewed(achievementId);
    }
  };

  const dimensionStats = stats.earnedByDimension || {};
  const totalByDimension = stats.totalByDimension || {};

  const filteredEarnedCount = filteredAchievements.filter((a) => a.isEarned).length;
  const filteredUnearnedCount = filteredAchievements.filter((a) => !a.isEarned).length;

  const earnedCount = achievements.filter((a) => a.isEarned).length;
  const unearnedCount = achievements.filter((a) => !a.isEarned).length;

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <div className='bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <Trophy className='w-4 h-4' />
            <span className='text-xs font-medium'>已获得</span>
          </div>
          <div className='text-2xl font-black'>
            {stats.earned}
            <span className='text-sm text-yellow-200'>/{stats.total}</span>
          </div>
        </div>

        <div className='bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <Sparkles className='w-4 h-4' />
            <span className='text-xs font-medium'>荣誉分</span>
          </div>
          <div className='text-2xl font-black'>{stats.honorPoints}</div>
        </div>

        <div className='bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 text-white shadow-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <Footprints className='w-4 h-4' />
            <span className='text-xs font-medium'>成长脚印</span>
          </div>
          <div className='text-2xl font-black'>
            {dimensionStats.accumulation || 0}
            <span className='text-sm text-blue-200'>
              /{totalByDimension.accumulation || 0}
            </span>
          </div>
        </div>

        <div className='bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <Flame className='w-4 h-4' />
            <span className='text-xs font-medium'>品质勋章</span>
          </div>
          <div className='text-2xl font-black'>
            {dimensionStats.behavior || 0}
            <span className='text-sm text-orange-200'>
              /{totalByDimension.behavior || 0}
            </span>
          </div>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div className='flex p-1.5 bg-gray-100 rounded-2xl overflow-x-auto'>
          {dimensionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDimension(tab.id)}
              className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeDimension === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowUnearned(!showUnearned)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            showUnearned
              ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
              : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
          }`}
        >
          {showUnearned ? (
            <>
              <Eye className='w-4 h-4' />
              <span>显示未达成 ({filteredUnearnedCount})</span>
            </>
          ) : (
            <>
              <EyeOff className='w-4 h-4' />
              <span>隐藏未达成</span>
            </>
          )}
        </button>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6'>
        {filteredAchievements.map((achievement, idx) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            onView={() => handleView(achievement.id)}
            index={idx}
            isExpanded={expandedId === achievement.id}
            onToggle={() =>
              setExpandedId(
                expandedId === achievement.id ? null : achievement.id,
              )
            }
          />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='h-64 flex flex-col items-center justify-center text-gray-400 space-y-4'
        >
          <div className='w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center'>
            <Trophy size={40} className='opacity-30' />
          </div>
          <div className='text-center'>
            <p className='font-bold text-gray-600'>
              {showUnearned ? '暂无此类成就' : '已显示所有已获得成就'}
            </p>
            <p className='text-xs mt-1'>
              {showUnearned
                ? '快去完成任务解锁更多成就吧！'
                : '关闭筛选查看未达成的成就'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MedalWall;
  const dimensionTabs: Array<{
    id: 'all' | 'accumulation' | 'behavior' | 'surprise';
    label: string;
    icon: typeof Trophy;
  }> = [
    { id: 'all', label: '全部成就', icon: Trophy },
    { id: 'accumulation', label: '成长脚印', icon: Footprints },
    { id: 'behavior', label: '品质勋章', icon: Flame },
    { id: 'surprise', label: '彩蛋成就', icon: Gift },
  ];
