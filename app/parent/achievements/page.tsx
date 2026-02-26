'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import Select from '@/components/ui/Select';
import { Trophy, Medal, Star, Target, Flame, Footprints, Gift, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import request from '@/utils/request';

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
  progress: number;
  progressPercent: number;
}

interface AchievementStats {
  total: number;
  earned: number;
  newCount: number;
  honorPoints: number;
  earnedByDimension: Record<string, number>;
  totalByDimension: Record<string, number>;
  completionRate: number;
}

interface ChildAchievementData {
  achievements: Achievement[];
  stats: AchievementStats;
}

const LEVEL_COLORS = {
  bronze: 'from-orange-400 to-amber-600',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-yellow-400 to-amber-500',
  legendary: 'from-purple-400 to-pink-500',
};

const LEVEL_LABELS = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  legendary: '传奇',
};

const DIMENSION_LABELS = {
  accumulation: '成长脚印',
  behavior: '品质勋章',
  surprise: '彩蛋成就',
};

export default function ParentAchievementsPage() {
  const { childList, currentUser } = useApp();
  const [selectedChild, setSelectedChild] = useState<string>(childList[0]?.id || 'all');
  const [loading, setLoading] = useState(true);
  const [showUnearned, setShowUnearned] = useState(true);
  const [childData, setChildData] = useState<Record<string, ChildAchievementData>>({});

  const fetchChildAchievements = useCallback(async (childId: string) => {
    if (!currentUser?.token) return;

    try {
      const data = await request(`/api/achievements?childId=${childId}`);

      if (data.success) {
        setChildData(prev => ({
          ...prev,
          [childId]: {
            achievements: data.data.achievements,
            stats: data.data.stats,
          }
        }));
      }
    } catch (error) {
      console.error('获取成就数据失败:', error);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (selectedChild === 'all') {
        for (const child of childList) {
          await fetchChildAchievements(child.id);
        }
      } else {
        await fetchChildAchievements(selectedChild);
      }
      setLoading(false);
    };
    
    if (childList.length > 0) {
      loadData();
    }
  }, [childList, selectedChild, fetchChildAchievements]);

  const childOptions = [
    { value: 'all', label: '全部孩子' },
    ...childList.map(child => ({
      value: child.id,
      label: child.username,
    }))
  ];

  const currentData = selectedChild === 'all' 
    ? null 
    : childData[selectedChild];

  const renderDimensionProgress = (dimension: string, earned: number, total: number) => {
    const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{earned}/{total}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-500" />
              孩子成就
            </h2>
            <p className="text-gray-500 text-sm mt-1">查看孩子的勋章和进步情况</p>
          </div>
          
          <div className="w-full sm:w-48">
            <Select
              value={selectedChild}
              onChange={(value) => setSelectedChild(value as string)}
              options={childOptions}
            />
          </div>
        </div>

        {currentData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 border border-yellow-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-600">已获得成就</span>
                </div>
                <p className="text-2xl font-black text-yellow-600">
                  {currentData.stats.earned}/{currentData.stats.total}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  完成率 {currentData.stats.completionRate}%
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-600">荣誉分</span>
                </div>
                <p className="text-2xl font-black text-purple-600">
                  {currentData.stats.honorPoints}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">成长脚印</span>
                </div>
                <p className="text-2xl font-black text-blue-600">
                  {currentData.stats.earnedByDimension.accumulation || 0}
                </p>
                {renderDimensionProgress(
                  'accumulation',
                  currentData.stats.earnedByDimension.accumulation || 0,
                  currentData.stats.totalByDimension.accumulation || 0
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-600">品质勋章</span>
                </div>
                <p className="text-2xl font-black text-orange-600">
                  {currentData.stats.earnedByDimension.behavior || 0}
                </p>
                {renderDimensionProgress(
                  'behavior',
                  currentData.stats.earnedByDimension.behavior || 0,
                  currentData.stats.totalByDimension.behavior || 0
                )}
              </motion.div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  成就墙
                </h3>
                
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
                      <Eye className="w-4 h-4" />
                      <span>显示未达成</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>隐藏未达成</span>
                    </>
                  )}
                </button>
              </div>
               
              {currentData.achievements.filter(a => showUnearned || a.isEarned).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {currentData.achievements.filter(a => showUnearned || a.isEarned).map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={`relative p-4 rounded-2xl border-2 transition-all ${
                        achievement.isEarned
                          ? 'bg-gradient-to-br ' + LEVEL_COLORS[achievement.level] + ' border-transparent text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-4xl mb-2 ${!achievement.isEarned && 'grayscale opacity-40'}`}>
                          {achievement.icon}
                        </div>
                        <h4 className={`font-bold text-sm ${achievement.isEarned ? 'text-white' : 'text-gray-600'}`}>
                          {achievement.isHidden && !achievement.isEarned ? '???' : achievement.name}
                        </h4>
                        <p className={`text-[10px] mt-1 ${achievement.isEarned ? 'text-white/80' : 'text-gray-400'}`}>
                          {LEVEL_LABELS[achievement.level]}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${achievement.isEarned ? 'text-white/60' : 'text-gray-300'}`}>
                          {DIMENSION_LABELS[achievement.dimension as keyof typeof DIMENSION_LABELS]}
                        </p>
                        
                        {!achievement.isEarned && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all"
                                style={{ width: `${achievement.progressPercent}%` }}
                              />
                            </div>
                            <p className="text-[10px] mt-1 text-gray-400">
                              {achievement.progress}/{achievement.requirement}
                            </p>
                          </div>
                        )}
                        
                        {achievement.isEarned && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                              <Star className="w-3 h-3 text-white" fill="white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{showUnearned ? '还没有获得成就' : '已显示所有已获得成就'}</p>
                  <p className="text-sm mt-1">
                    {showUnearned ? '鼓励孩子完成任务获得成就吧！' : '开启筛选显示未达成的成就'}
                  </p>
                </div>
              )}
            </div>

            {currentData.stats.earnedByDimension.surprise > 0 && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  彩蛋成就
                </h3>
                <p className="text-sm text-gray-600">
                  孩子已经发现了 <span className="font-bold text-purple-600">{currentData.stats.earnedByDimension.surprise}</span> 个隐藏成就！
                  保持神秘感，让孩子继续探索更多惊喜吧 ~
                </p>
              </div>
            )}
          </>
        )}

        {selectedChild === 'all' ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
            <Trophy className="w-20 h-20 mx-auto mb-4 text-gray-200" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">选择孩子查看成就</h3>
            <p className="text-gray-500">从上方下拉菜单选择一个孩子查看详细的勋章和成就</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}
      </div>
  );
}
