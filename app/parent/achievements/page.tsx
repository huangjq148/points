'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import Layout from '@/components/Layouts';
import Select from '@/components/ui/Select';
import { Trophy, Medal, Star, Target, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import request from '@/utils/request';

interface Medal {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  isEarned: boolean;
  earnedAt?: string;
  progress: number;
  progressPercent: number;
}

interface MedalStats {
  total: number;
  earned: number;
  newMedals: number;
  totalXPEarned: number;
}

interface ChildMedalData {
  medals: Medal[];
  stats: MedalStats;
  level: number;
  totalCoins: number;
  totalStars: number;
}

const LEVEL_COLORS = {
  bronze: 'from-orange-400 to-amber-600',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-yellow-400 to-amber-500',
  diamond: 'from-blue-400 to-purple-500',
};

const LEVEL_LABELS = {
  bronze: '铜牌',
  silver: '银牌',
  gold: '金牌',
  diamond: '钻石',
};

export default function ParentAchievementsPage() {
  const { childList, currentUser } = useApp();
  const [selectedChild, setSelectedChild] = useState<string>(childList[0]?.id || 'all');
  const [loading, setLoading] = useState(true);
  const [childData, setChildData] = useState<Record<string, ChildMedalData>>({});

  const fetchChildMedals = useCallback(async (childId: string) => {
    if (!currentUser?.token) return;

    try {
      // 调用API获取孩子的勋章数据
      const data = await request(`/api/gamification/medals?childId=${childId}`);

      if (data.success) {
        setChildData(prev => ({
          ...prev,
          [childId]: {
            medals: data.data.medals,
            stats: data.data.stats,
            level: data.data.level || 1,
            totalCoins: data.data.totalCoins || 0,
            totalStars: data.data.totalStars || 0,
          }
        }));
      }
    } catch (error) {
      console.error('获取勋章数据失败:', error);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (selectedChild === 'all') {
        // 加载所有孩子的数据
        for (const child of childList) {
          await fetchChildMedals(child.id);
        }
      } else {
        await fetchChildMedals(selectedChild);
      }
      setLoading(false);
    };
    
    if (childList.length > 0) {
      loadData();
    }
  }, [childList, selectedChild, fetchChildMedals]);

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

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题和筛选 */}
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

        {/* 统计卡片 */}
        {currentData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">已获得勋章</span>
              </div>
              <p className="text-2xl font-black text-blue-600">
                {currentData.stats.earned}/{currentData.stats.total}
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
                {currentData.totalStars}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border border-yellow-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <Medal className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">金币</span>
              </div>
              <p className="text-2xl font-black text-yellow-600">
                {currentData.totalCoins}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">等级</span>
              </div>
              <p className="text-2xl font-black text-green-600">
                Lv.{currentData.level}
              </p>
            </motion.div>
          </div>
        )}

        {/* 勋章墙 */}
        {currentData ? (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              勋章墙
            </h3>
            
            {currentData.medals.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {currentData.medals.map((medal, index) => (
                  <motion.div
                    key={medal.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative p-4 rounded-2xl border-2 transition-all ${
                      medal.isEarned
                        ? 'bg-gradient-to-br ' + LEVEL_COLORS[medal.level] + ' border-transparent text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{medal.icon}</div>
                      <h4 className={`font-bold text-sm ${medal.isEarned ? 'text-white' : 'text-gray-600'}`}>
                        {medal.name}
                      </h4>
                      <p className={`text-xs mt-1 ${medal.isEarned ? 'text-white/80' : 'text-gray-400'}`}>
                        {LEVEL_LABELS[medal.level]}
                      </p>
                      
                      {/* 进度条 */}
                      {!medal.isEarned && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all"
                              style={{ width: `${medal.progressPercent}%` }}
                            />
                          </div>
                          <p className="text-[10px] mt-1 text-gray-400">
                            {medal.progress}/{medal.progressPercent === 100 ? '完成' : '进行中'}
                          </p>
                        </div>
                      )}
                      
                      {/* 已获得标记 */}
                      {medal.isEarned && (
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
                <p>还没有获得勋章</p>
                <p className="text-sm mt-1">鼓励孩子完成任务获得勋章吧！</p>
              </div>
            )}
          </div>
        ) : selectedChild === 'all' ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
            <Trophy className="w-20 h-20 mx-auto mb-4 text-gray-200" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">选择孩子查看成就</h3>
            <p className="text-gray-500">从上方下拉菜单选择一个孩子查看详细的勋章和成就</p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </Layout>
  );
}
