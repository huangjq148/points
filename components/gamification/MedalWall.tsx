'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Medal {
  id: string;
  type: string;
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  name: string;
  description: string;
  icon: string;
  requirement: number;
  requirementType: 'total' | 'consecutive';
  xpReward: number;
  color: string;
  isEarned: boolean;
  earnedAt?: string;
  isNew: boolean;
  progress: number;
  progressPercent: number;
}

interface MedalWallProps {
  medals: Medal[];
  stats: {
    total: number;
    earned: number;
    newMedals: number;
    totalXPEarned: number;
  };
  onMedalViewed?: (medalId?: string) => void;
}

const levelConfig = {
  bronze: { 
    label: '青铜', 
    bgColor: 'from-amber-700 to-amber-900',
    borderColor: 'border-amber-600',
    textColor: 'text-amber-200',
    shadow: 'shadow-amber-900/50',
  },
  silver: { 
    label: '白银', 
    bgColor: 'from-slate-400 to-slate-600',
    borderColor: 'border-slate-400',
    textColor: 'text-slate-200',
    shadow: 'shadow-slate-600/50',
  },
  gold: { 
    label: '黄金', 
    bgColor: 'from-yellow-500 to-yellow-700',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-200',
    shadow: 'shadow-yellow-700/50',
  },
  diamond: { 
    label: '钻石', 
    bgColor: 'from-cyan-400 to-blue-600',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-200',
    shadow: 'shadow-cyan-600/50',
  },
};

const MedalCard: React.FC<{ medal: Medal; onView: () => void }> = ({ medal, onView }) => {
  const config = levelConfig[medal.level];
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (medal.isNew) {
      onView();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: [medal.color, '#FFD700', '#FFF'],
      });
    }
    setShowDetails(!showDetails);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${
        medal.isEarned 
          ? `bg-gradient-to-br ${config.bgColor} ${config.shadow} shadow-lg` 
          : 'bg-gray-100 border-2 border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleClick}
    >
      {/* 新勋章标记 */}
      {medal.isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 z-10"
        >
          <span className="flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-[10px] text-white font-bold">
              !
            </span>
          </span>
        </motion.div>
      )}

      <div className="p-4">
        {/* 图标 */}
        <div className={`text-5xl mb-3 text-center transition-all ${medal.isEarned ? '' : 'grayscale opacity-40'}`}>
          {medal.icon}
        </div>

        {/* 名称 */}
        <h3 className={`font-bold text-center text-sm mb-1 ${medal.isEarned ? config.textColor : 'text-gray-400'}`}>
          {medal.name}
        </h3>

        {/* 等级标签 */}
        <div className={`text-xs text-center px-2 py-0.5 rounded-full inline-block mx-auto w-full ${
          medal.isEarned 
            ? `bg-white/20 ${config.textColor}` 
            : 'bg-gray-200 text-gray-500'
        }`}>
          {config.label}
        </div>

        {/* 进度条（未获得时显示） */}
        {!medal.isEarned && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>{medal.progress}/{medal.requirement}</span>
              <span>{medal.progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${medal.progressPercent}%` }}
                className={`h-full rounded-full ${
                  medal.level === 'bronze' ? 'bg-amber-500' :
                  medal.level === 'silver' ? 'bg-slate-400' :
                  medal.level === 'gold' ? 'bg-yellow-500' : 'bg-cyan-400'
                }`}
              />
            </div>
          </div>
        )}

        {/* 已获得标记 */}
        {medal.isEarned && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 left-2"
          >
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          </motion.div>
        )}

        {/* 未获得提示 */}
        {!medal.isEarned && (
          <div className="mt-2 text-[10px] text-center text-gray-400">
            点击查看条件
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute inset-0 backdrop-blur-md p-4 flex flex-col justify-center z-20 ${
              medal.isEarned 
                ? 'bg-gray-900/90' 
                : 'bg-gray-800/95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{medal.icon}</div>
              <h4 className={`font-bold text-lg mb-1 ${medal.isEarned ? config.textColor : 'text-gray-200'}`}>{medal.name}</h4>
              <p className="text-xs text-gray-300 mb-3">{medal.description}</p>
              
              <div className="space-y-2 text-xs bg-black/20 p-3 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">解锁条件:</span>
                  <span className={`font-medium ${medal.isEarned ? 'text-green-400' : 'text-yellow-400'}`}>
                    {medal.requirementType === 'total' ? '累计' : '连续'} {medal.requirement} 次
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">当前进度:</span>
                  <span className="text-white font-medium">{medal.progress}/{medal.requirement}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">奖励经验:</span>
                  <span className="text-yellow-400">+{medal.xpReward} XP</span>
                </div>
                {medal.isEarned && medal.earnedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">获得时间:</span>
                    <span className="text-green-400">{new Date(medal.earnedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 justify-center">
                {!medal.isEarned && (
                  <div className="text-xs text-gray-500 bg-gray-800 px-3 py-1.5 rounded-full">
                    继续加油，快要达成了！
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="mt-3 text-xs text-gray-500 hover:text-white transition-colors underline"
              >
                点击关闭
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const MedalWall: React.FC<MedalWallProps> = ({ medals, stats, onMedalViewed }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'task_master' | 'persistence'>('all');

  const filteredMedals = medals.filter(medal => {
    if (activeCategory === 'all') return true;
    return medal.type === activeCategory;
  });

  const handleMedalView = (medalId?: string) => {
    if (onMedalViewed) {
      onMedalViewed(medalId);
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-medium">已获得</span>
          </div>
          <div className="text-2xl font-black">
            {stats.earned}<span className="text-sm text-purple-200">/{stats.total}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">获得经验</span>
          </div>
          <div className="text-2xl font-black">
            {stats.totalXPEarned}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">待解锁</span>
          </div>
          <div className="text-2xl font-black">
            {stats.total - stats.earned}
          </div>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="flex p-1.5 bg-gray-100 rounded-2xl">
        {[
          { id: 'all', label: '全部勋章' },
          { id: 'task_master', label: '任务达人' },
          { id: 'persistence', label: '毅力系列' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeCategory === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 勋章网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredMedals.map((medal) => (
          <MedalCard
            key={medal.id}
            medal={medal}
            onView={() => handleMedalView(medal.id)}
          />
        ))}
      </div>

      {filteredMedals.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-4"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <Trophy size={40} className="opacity-30" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-600">暂无此类勋章</p>
            <p className="text-xs mt-1">快去完成任务解锁更多勋章吧！</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MedalWall;