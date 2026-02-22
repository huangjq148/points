import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MedalDefinition, AvatarLevel, AvatarSkin, AvatarAccessory } from '@/models/Gamification';

// 初始化勋章定义数据
const defaultMedals = [
  // 任务达人系列
  {
    type: 'task_master' as const,
    level: 'bronze' as const,
    name: '初级探险者',
    description: '累计完成 3 次任务，迈出成长的第一步！',
    icon: '🥉',
    requirement: 3,
    requirementType: 'total' as const,
    xpReward: 50,
    color: '#CD7F32',
    order: 1,
  },
  {
    type: 'task_master' as const,
    level: 'silver' as const,
    name: '进阶冒险家',
    description: '累计完成 10 次任务，进步明显！',
    icon: '🥈',
    requirement: 10,
    requirementType: 'total' as const,
    xpReward: 150,
    color: '#C0C0C0',
    order: 2,
  },
  {
    type: 'task_master' as const,
    level: 'gold' as const,
    name: '坚持勇士',
    description: '连续 21 天完成任务，养成好习惯！',
    icon: '🥇',
    requirement: 21,
    requirementType: 'consecutive' as const,
    xpReward: 500,
    color: '#FFD700',
    order: 3,
  },
  {
    type: 'task_master' as const,
    level: 'diamond' as const,
    name: '传奇大师',
    description: '累计完成 100 次任务，成为领域专家！',
    icon: '💎',
    requirement: 100,
    requirementType: 'total' as const,
    xpReward: 2000,
    color: '#B9F2FF',
    order: 4,
  },
  // 毅力系列
  {
    type: 'persistence' as const,
    level: 'bronze' as const,
    name: '小火苗',
    description: '连续 3 天坚持，星星之火可以燎原！',
    icon: '🔥',
    requirement: 3,
    requirementType: 'consecutive' as const,
    xpReward: 30,
    color: '#FF6B35',
    order: 5,
  },
  {
    type: 'persistence' as const,
    level: 'silver' as const,
    name: '坚持者',
    description: '连续 7 天坚持，毅力可嘉！',
    icon: '📅',
    requirement: 7,
    requirementType: 'consecutive' as const,
    xpReward: 100,
    color: '#4ECDC4',
    order: 6,
  },
  {
    type: 'persistence' as const,
    level: 'gold' as const,
    name: '习惯养成者',
    description: '连续 30 天坚持，好习惯已养成！',
    icon: '✨',
    requirement: 30,
    requirementType: 'consecutive' as const,
    xpReward: 800,
    color: '#FFE66D',
    order: 7,
  },
  {
    type: 'persistence' as const,
    level: 'diamond' as const,
    name: '不屈意志',
    description: '连续 100 天坚持，意志力惊人！',
    icon: '👑',
    requirement: 100,
    requirementType: 'consecutive' as const,
    xpReward: 3000,
    color: '#9B59B6',
    order: 8,
  },
];

// 初始化等级数据
const defaultLevels = [
  { level: 1, name: '小小蛋', title: '待孵化的希望', xpRequired: 0, icon: '🥚', description: '一颗充满潜力的蛋，等待破壳而出' },
  { level: 2, name: '破壳儿', title: '初生的探险家', xpRequired: 100, icon: '🐣', description: '成功破壳，开始探索这个世界' },
  { level: 3, name: '见习探险家', title: '勇敢的初学者', xpRequired: 300, icon: '🐥', description: '迈开探索的步伐，充满好奇心' },
  { level: 4, name: '初级探险家', title: '成长中的勇者', xpRequired: 600, icon: '🦆', description: '逐渐掌握探索的技巧' },
  { level: 5, name: '中级探险家', title: '经验丰富的旅者', xpRequired: 1000, icon: '🐤', description: '已经历过许多冒险' },
  { level: 6, name: '高级探险家', title: '技艺精湛的冒险者', xpRequired: 1500, icon: '🦅', description: '能够应对各种挑战' },
  { level: 7, name: '探险队长', title: '团队的领袖', xpRequired: 2200, icon: '🦉', description: '带领伙伴们一起冒险' },
  { level: 8, name: '冒险大师', title: '传奇的冒险者', xpRequired: 3000, icon: '🦚', description: '冒险界的传奇人物' },
  { level: 9, name: '英雄', title: '万人敬仰的英雄', xpRequired: 4000, icon: '🦄', description: '用勇气和智慧创造奇迹' },
  { level: 10, name: '传奇', title: '永恒的传说', xpRequired: 5500, icon: '🐉', description: '你的名字将被永远传颂' },
];

// 初始化皮肤数据
const defaultSkins = [
  { id: 'default', name: '默认外观', description: '最经典的探险家造型', unlockLevel: 1, icon: '🧒', rarity: 'common' as const },
  { id: 'explorer_camo', name: '迷彩探险家', description: '融入自然的探险装扮', unlockLevel: 3, icon: '🧑‍🌾', rarity: 'common' as const },
  { id: 'scholar', name: '小学者', description: '充满智慧的书香气息', unlockLevel: 5, icon: '🧑‍🎓', rarity: 'rare' as const },
  { id: 'superhero', name: '小英雄', description: '守护正义的英雄装扮', unlockLevel: 7, icon: '🦸', rarity: 'epic' as const },
  { id: 'legend', name: '传说形态', description: '散发传奇光芒的神圣形态', unlockLevel: 10, icon: '🧙', rarity: 'legendary' as const },
];

// 初始化配饰数据
const defaultAccessories = [
  { id: 'baseball_cap', name: '探险帽', description: '遮阳又帅气的帽子', unlockLevel: 2, type: 'hat' as const, icon: '🧢', rarity: 'common' as const },
  { id: 'glasses', name: '学者眼镜', description: '让你看起来更聪明', unlockLevel: 3, type: 'glasses' as const, icon: '👓', rarity: 'common' as const },
  { id: 'sunglasses', name: '酷炫墨镜', description: '耍帅必备', unlockLevel: 5, type: 'glasses' as const, icon: '🕶️', rarity: 'rare' as const },
  { id: 'backpack', name: '探险背包', description: '装满冒险的必需品', unlockLevel: 4, type: 'cape' as const, icon: '🎒', rarity: 'common' as const },
  { id: 'cape', name: '英雄披风', description: '随风飘扬的英雄象征', unlockLevel: 7, type: 'cape' as const, icon: '🦸‍♂️', rarity: 'epic' as const },
  { id: 'dog', name: '小狗伙伴', description: '忠诚的冒险伙伴', unlockLevel: 6, type: 'pet' as const, icon: '🐕', rarity: 'rare' as const },
  { id: 'cat', name: '猫咪伙伴', description: '优雅神秘的伙伴', unlockLevel: 6, type: 'pet' as const, icon: '🐈', rarity: 'rare' as const },
  { id: 'forest_bg', name: '森林背景', description: '生机勃勃的森林', unlockLevel: 8, type: 'background' as const, icon: '🌲', rarity: 'epic' as const },
];

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // 初始化勋章
    const medalCount = await MedalDefinition.countDocuments();
    if (medalCount === 0) {
      await MedalDefinition.insertMany(defaultMedals);
      console.log('✅ 勋章定义初始化完成');
    }

    // 初始化等级
    const levelCount = await AvatarLevel.countDocuments();
    if (levelCount === 0) {
      await AvatarLevel.insertMany(defaultLevels);
      console.log('✅ 等级定义初始化完成');
    }

    // 初始化皮肤
    const skinCount = await AvatarSkin.countDocuments();
    if (skinCount === 0) {
      await AvatarSkin.insertMany(defaultSkins);
      console.log('✅ 皮肤定义初始化完成');
    }

    // 初始化配饰
    const accessoryCount = await AvatarAccessory.countDocuments();
    if (accessoryCount === 0) {
      await AvatarAccessory.insertMany(defaultAccessories);
      console.log('✅ 配饰定义初始化完成');
    }

    return NextResponse.json({
      success: true,
      message: '游戏化数据初始化成功',
      data: {
        medals: medalCount === 0 ? defaultMedals.length : '已存在',
        levels: levelCount === 0 ? defaultLevels.length : '已存在',
        skins: skinCount === 0 ? defaultSkins.length : '已存在',
        accessories: accessoryCount === 0 ? defaultAccessories.length : '已存在',
      },
    });
  } catch (error) {
    console.error('初始化游戏化数据失败:', error);
    return NextResponse.json(
      { success: false, message: '初始化失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 获取所有游戏化配置
export async function GET() {
  try {
    await connectDB();

    const medals = await MedalDefinition.find().sort({ order: 1 });
    const levels = await AvatarLevel.find().sort({ level: 1 });
    const skins = await AvatarSkin.find().sort({ unlockLevel: 1 });
    const accessories = await AvatarAccessory.find().sort({ unlockLevel: 1 });

    return NextResponse.json({
      success: true,
      data: {
        medals,
        levels,
        skins,
        accessories,
      },
    });
  } catch (error) {
    console.error('获取游戏化配置失败:', error);
    return NextResponse.json(
      { success: false, message: '获取失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}