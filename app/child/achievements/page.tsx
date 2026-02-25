'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { ChevronRight, Trophy, User, Loader2, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui';
import MedalWall from '@/components/gamification/MedalWall';
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
  isNew: boolean;
  progress: number;
  progressPercent: number;
}

interface AchievementStats {
  total: number;
  earned: number;
  newAchievements: number;
  honorPoints: number;
  earnedByDimension: Record<string, number>;
  totalByDimension: Record<string, number>;
  completionRate: number;
}

export default function AchievementsPage() {
  const { currentUser } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const data = await request('/api/achievements');
      if (data.success) {
        setAchievements(data.data.achievements);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('获取成就失败:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAchievements();
      setLoading(false);
    };
    void loadData();
  }, [fetchAchievements]);

  const handleAchievementViewed = async (achievementId?: string) => {
    if (!currentUser?.token) return;
    try {
      await request('/api/achievements', {
        method: 'PUT',
        body: { achievementId },
      });
      await fetchAchievements();
    } catch (error) {
      console.error('标记成就失败:', error);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>加载失败</p>
          </div>
        </div>
      </>
    );
  }

  const formattedStats = {
    total: stats.total,
    earned: stats.earned,
    newAchievements: stats.newAchievements,
    honorPoints: stats.honorPoints,
    earnedByDimension: stats.earnedByDimension,
    totalByDimension: stats.totalByDimension,
  };

  return (
    <>
      <div className="pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            我的成就
          </h1>
          <p className="text-gray-500 text-sm mt-1">完成任务解锁各种成就，获取荣誉勋章！</p>
        </div>

        {stats.newAchievements > 0 && (
          <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white animate-pulse">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">你有 {stats.newAchievements} 个新成就待查看！</span>
            </div>
          </div>
        )}

        <div className="min-h-[50vh]">
          <MedalWall
            achievements={achievements}
            stats={formattedStats}
            onAchievementViewed={handleAchievementViewed}
          />
        </div>
      </div>
    </>
  );
}
