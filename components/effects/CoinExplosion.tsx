'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinParticle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface CoinExplosionProps {
  isActive: boolean;
  onComplete?: () => void;
  coinCount?: number;
  originX?: number;
  originY?: number;
}

export default function CoinExplosion({
  isActive,
  onComplete,
  coinCount = 15,
  originX = 50,
  originY = 50,
}: CoinExplosionProps) {
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (isActive) {
      // 生成粒子
      const newParticles: CoinParticle[] = Array.from({ length: coinCount }, (_, i) => ({
        id: i,
        x: originX + (Math.random() - 0.5) * 20,
        y: originY + (Math.random() - 0.5) * 20,
        targetX: originX + (Math.random() - 0.5) * 60,
        targetY: originY + Math.random() * 40 + 20,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
      }));
      const startTimer = setTimeout(() => {
        setParticles(newParticles);
        setShowText(true);
      }, 0);

      // 动画结束后清理
      const timer = setTimeout(() => {
        setParticles([]);
        setShowText(false);
        onComplete?.();
      }, 2000);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(timer);
      };
    }
  }, [isActive, coinCount, originX, originY, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: `${particle.x}%`,
              y: `${particle.y}%`,
              scale: 0,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: `${particle.targetX}%`,
              y: `${particle.targetY}%`,
              scale: particle.scale,
              rotate: particle.rotation + 720,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              delay: particle.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute"
            style={{
              left: 0,
              top: 0,
            }}
          >
            <div className="text-4xl filter drop-shadow-lg">🪙</div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 金币数量显示 */}
      <AnimatePresence>
        {showText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1.2, y: -50 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="text-5xl font-black text-yellow-500 drop-shadow-lg">
              +{coinCount}
            </div>
            <div className="text-xl font-bold text-yellow-600 text-center mt-2">
              🪙 金币
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 勋章获得特效
interface MedalEarnedEffectProps {
  isActive: boolean;
  medalName?: string;
  medalIcon?: string;
  onComplete?: () => void;
}

export function MedalEarnedEffect({
  isActive,
  medalName = '新勋章',
  medalIcon = '🏅',
  onComplete,
}: MedalEarnedEffectProps) {
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          duration: 0.8,
        }}
        className="text-center"
      >
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-8xl mb-4 filter drop-shadow-2xl"
        >
          {medalIcon}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl px-8 py-4 shadow-2xl"
        >
          <h3 className="text-2xl font-black text-gray-800 mb-1">获得新勋章！</h3>
          <p className="text-lg font-bold text-yellow-600">{medalName}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// 任务完成组合特效
interface TaskCompleteEffectProps {
  isActive: boolean;
  coins?: number;
  stars?: number;
  newMedal?: { name: string; icon: string } | null;
  onComplete?: () => void;
}

export function TaskCompleteEffect({
  isActive,
  coins = 0,
  stars = 0,
  newMedal = null,
  onComplete,
}: TaskCompleteEffectProps) {
  const [showCoins, setShowCoins] = useState(false);
  const [showMedal, setShowMedal] = useState(false);

  useEffect(() => {
    if (isActive) {
      const startTimer = setTimeout(() => {
        setShowCoins(true);
      }, 0);
      
      const coinTimer = setTimeout(() => {
        setShowCoins(false);
        if (newMedal) {
          setShowMedal(true);
        }
      }, 2000);

      const completeTimer = setTimeout(() => {
        setShowMedal(false);
        onComplete?.();
      }, newMedal ? 5000 : 2000);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(coinTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, newMedal, onComplete]);

  return (
    <>
      <CoinExplosion
        isActive={showCoins}
        coinCount={Math.min(coins, 20)}
        onComplete={() => {}}
      />
      {newMedal && (
        <MedalEarnedEffect
          isActive={showMedal}
          medalName={newMedal.name}
          medalIcon={newMedal.icon}
          onComplete={() => {}}
        />
      )}
    </>
  );
}
