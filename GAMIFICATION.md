# 🎮 游戏化荣誉体系 (Gamification System)

## 概述

为"小小奋斗者"家庭激励系统添加了完整的游戏化荣誉体系，包括勋章墙和角色成长系统。

## ✨ 功能特性

### 1. 勋章墙 (Medal Wall)

**四级进化路径：**
- 🥉 **青铜 (Bronze)**: 初级成就，达成 3 次
- 🥈 **白银 (Silver)**: 进阶成就，累计 10 次  
- 🥇 **黄金 (Gold)**: 高级成就，连续 21 次（习惯养成）
- 💎 **钻石 (Diamond)**: 传奇成就，累计 100 次（领域专家）

**勋章类型：**
- **任务达人系列**: 基于累计完成任务数
- **毅力系列**: 基于连续完成任务天数

**特性：**
- 进度追踪：实时显示每个勋章的完成进度
- 新勋章标记：新获得的勋章会有闪烁提示
- 经验值奖励：每个勋章都有对应的 XP 奖励
- 详情展示：点击勋章查看详细说明

### 2. 角色成长 (Avatar Evolution)

**成长阶段：**
1. 🥚 **待孵化的蛋** (Lv.1) - 充满潜力的开始
2. 🐣 **小小破壳儿** (Lv.2) - 初生的探险家
3. 🐥 **见习探险家** (Lv.3) - 勇敢的初学者
4. 🦆 **初级探险家** (Lv.4) - 成长中的勇者
5. 🦅 **探险队长** (Lv.5) - 团队的领袖
6. 🦉 **冒险大师** (Lv.6) - 经验丰富的冒险者
7. 🦚 **英雄** (Lv.7) - 万人敬仰的英雄
8. 🦄 **传奇** (Lv.10) - 永恒的传说

**经验值系统：**
- 完成任务获得基础 XP（等于任务积分）
- 连续天数加成：
  - 连续 7 天：+5 XP
  - 连续 21 天：+10 XP
- 勋章奖励：每个勋章都有额外的 XP 奖励

**外观系统：**
- 🎨 **皮肤**: 随等级解锁不同外观
- 🎩 **配饰**: 帽子、眼镜、披风、宠物、背景等
- ✏️ **自定义名字**: 可以给角色起名字

## 🚀 快速开始

### 1. 初始化数据

首次使用时需要初始化游戏化数据：

```bash
curl -X POST http://localhost:3000/api/gamification/init
```

或者在浏览器中访问并发送 POST 请求。

### 2. 访问成就页面

孩子端导航栏点击 **"成就"** 图标即可查看：
- 勋章墙
- 角色成长
- 外观装扮

### 3. 自动集成

游戏化系统已自动集成到任务流程中：
- 家长审核通过任务时，自动更新经验值
- 自动检查并授予符合条件的勋章
- 自动计算连续天数
- 自动升级并解锁新外观

## 📁 文件结构

```
models/
  Gamification.ts          # 数据模型定义

app/api/gamification/
  init/route.ts            # 初始化游戏化数据
  medals/route.ts          # 勋章墙 API
  avatar/route.ts          # 角色成长 API
  progress/route.ts        # 进度更新 API

app/child/achievements/
  page.tsx                 # 成就展示页面

components/gamification/
  MedalWall.tsx            # 勋章墙组件
  AvatarGrowth.tsx         # 角色成长组件
  GamificationNotifier.tsx # 成就通知组件

lib/gamification/
  progress.ts              # 游戏化进度工具函数
```

## 🔌 API 端点

### 初始化
- `POST /api/gamification/init` - 初始化勋章、等级、皮肤等默认数据

### 勋章墙
- `GET /api/gamification/medals` - 获取用户勋章墙数据
- `PUT /api/gamification/medals` - 标记勋章为已查看

### 角色成长
- `GET /api/gamification/avatar` - 获取用户角色成长数据
- `PUT /api/gamification/avatar` - 更新角色配置（皮肤、配饰、名字）

### 进度更新
- `POST /api/gamification/progress` - 手动触发进度更新（通常不需要直接调用）
- `GET /api/gamification/progress` - 获取用户游戏化统计数据

### 任务集成
任务审核通过时自动调用，返回数据中包含 `gamification` 字段：
```json
{
  "success": true,
  "task": { ... },
  "gamification": {
    "success": true,
    "xpGained": 15,
    "levelUp": true,
    "newLevel": 3,
    "newMedals": [...],
    "unlockedRewards": [...]
  }
}
```

## 🎨 自定义配置

### 修改勋章定义
编辑 `app/api/gamification/init/route.ts` 中的 `defaultMedals` 数组：

```typescript
const defaultMedals = [
  {
    type: 'task_master',
    level: 'bronze',
    name: '自定义勋章名',
    description: '自定义描述',
    icon: '🏆',
    requirement: 5,        // 要求次数
    requirementType: 'total', // 'total' 或 'consecutive'
    xpReward: 100,         // 经验值奖励
    color: '#FFD700',      // 颜色主题
    order: 1,              // 排序
  },
  // ...
];
```

### 修改等级定义
编辑 `defaultLevels` 数组：

```typescript
const defaultLevels = [
  {
    level: 1,
    name: '等级名称',
    title: '等级称号',
    xpRequired: 0,         // 升到该等级需要的经验值
    icon: '🥚',
    description: '等级描述',
  },
  // ...
];
```

### 修改皮肤/配饰
编辑 `defaultSkins` 或 `defaultAccessories` 数组。

## 📝 数据模型

### UserAvatar (用户角色数据)
```typescript
{
  userId: ObjectId,           // 用户ID
  level: number,              // 当前等级
  currentXP: number,          // 当前等级已获得的经验值
  totalXP: number,            // 总经验值
  stage: string,              // 当前阶段
  unlockedSkins: string[],    // 已解锁的皮肤
  currentSkin: string,        // 当前使用的皮肤
  equippedAccessories: string[], // 已装备的配饰
  unlockedAccessories: string[], // 已解锁的配饰
  petName?: string,           // 角色名字
  consecutiveDays: number,    // 当前连续天数
  maxConsecutiveDays: number, // 最大连续天数
  totalTasksCompleted: number, // 累计完成任务数
}
```

### UserMedal (用户勋章)
```typescript
{
  userId: ObjectId,           // 用户ID
  medalId: ObjectId,          // 勋章定义ID
  earnedAt: Date,             // 获得时间
  progress: number,           // 当前进度
  isNew: boolean,             // 是否新获得
}
```

## 🎯 使用建议

1. **首次部署**: 运行初始化 API 创建默认数据
2. **勋章设计**: 根据孩子年龄调整勋章难度，确保既有挑战又可达成
3. **经验值平衡**: 调整任务积分和勋章奖励，保持升级节奏适中
4. **连续激励**: 连续天数机制鼓励孩子养成每日习惯
5. **视觉反馈**: 升级和获得勋章时的动画效果增强成就感

## 🔧 故障排除

### 勋章没有显示
- 确认已调用初始化 API
- 检查数据库中是否有 MedalDefinition 数据

### 经验值没有增加
- 确认任务已被家长审核通过
- 检查 API 响应中的 gamification 字段

### 连续天数计算错误
- 连续天数基于任务审核日期计算
- 同一天完成多个任务只算一天

## 📄 License

MIT