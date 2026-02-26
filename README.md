# 小小奋斗者 (Little Achievers) 家庭激励系统

## 项目简介

一个基于"任务-积分-奖励"闭环的家庭教育辅助工具，通过角色差异化体验，培养孩子的习惯与成就感。系统支持家长管理任务和奖励，孩子通过完成任务获得积分并兑换奖励，同时包含游戏化成长系统和成就勋章体系。

## 功能特性

### 家长端 (Parent Mode)
- **任务管理**：创建日常任务、进阶任务、巅峰挑战
  - 支持任务模板管理
  - 支持周期性任务（每日、每周）
  - 支持任务分类（个人卫生、学习、家务、社交、其他）
  - 支持难度设置（简单、普通、困难）
  - 支持照片凭证要求
  - 支持截止日期设置
- **审核功能**：审核孩子提交的任务完成情况
  - 查看任务提交照片
  - 通过或驳回任务
  - 审核历史记录
- **积分商城**：管理实物奖励和特权奖励
  - 添加/编辑/删除奖励
  - 设置奖励库存
  - 上架/下架奖励
- **订单管理**：查看和处理孩子的兑换订单
  - 核销订单
  - 取消订单并退还积分
- **账本查看**：查看所有积分交易记录
  - 收入（任务完成）
  - 支出（奖励兑换）
- **家庭成员管理**：添加和管理孩子账号
- **数据统计**：查看任务完成统计和成就数据

### 孩子端 (Child Mode)
- **任务大厅**：查看并完成任务获取积分
  - 查看待完成任务
  - 提交任务完成凭证（照片）
  - 查看任务审核状态
- **积分商城**：使用积分兑换奖励
  - 浏览可用奖励
  - 兑换奖励生成核销码
- **积分钱包**：查看余额和收支记录
  - 金币（可消费货币）
  - 荣誉分（等级和勋章用）
  - 交易历史
- **成就展示**：展示任务完成统计和获得的勋章
- **角色成长**：游戏化角色养成系统
  - 完成任务获得经验值
  - 升级解锁新外观
  - 连续任务奖励加成

### 角色切换
- **一键切换**：家长可无缝切换到孩子视角
- **安全验证**：孩子切换家长需 PIN 码验证

### 游戏化系统
- **双币种经济系统**：
  - 金币：可消费的通用货币，用于兑换奖励
  - 荣誉分：无法消费，用于等级和勋章系统
  - 信用额度：支持透支消费
  - 利息系统：金币可产生利息收益
- **角色成长系统**：
  - 6个成长阶段（蛋→破壳→探险家→队长→英雄→传奇）
  - 经验值升级机制
  - 连续完成任务加成
- **勋章系统**：
  - 任务大师勋章
  - 连续打卡勋章
  - 坚持勋章
  - 冠军勋章
  - 4个等级（青铜、白银、黄金、钻石）
- **成就系统**：
  - 累积型成就（任务数量、积分数量）
  - 行为型成就（连续打卡、特定时间完成）
  - 惊喜型成就（隐藏成就）

## 技术栈

- **前端**: Next.js 16 + React 19 + TailwindCSS 4
- **后端**: Next.js API Routes
- **数据库**: MongoDB + Mongoose
- **图标**: Lucide React
- **动画**: Framer Motion + Canvas Confetti
- **表格**: TanStack React Table
- **日期处理**: date-fns + Day.js
- **表单验证**: Zod

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改:

```env
MONGODB_URI=mongodb://localhost:27017/little-achievers
JWT_SECRET=your-secret-key
```

### 3. 启动 MongoDB

确保本地 MongoDB 服务已启动，或使用云端 MongoDB。

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 使用指南

### 首次使用

1. 输入手机号和 4 位 PIN 码
2. 首次使用将自动注册为家长账号
3. 注册后添加孩子档案
4. 开始创建任务和奖励

### 家长功能

- **首页**：查看待审核任务数量和孩子档案
- **审核**：审核孩子提交的任务
- **任务**：管理任务列表和模板
- **商城**：添加和管理奖励
- **订单**：处理孩子的兑换请求
- **账本**：查看积分收支明细
- **家庭**：管理家庭成员

### 孩子功能

- **首页**：查看任务和成就概览
- **任务**：完成并提交任务
- **商城**：兑换喜欢的奖励
- **钱包**：查看金币和荣誉分
- **成就**：查看勋章和成长进度

## 数据模型

### 1. User（用户表）

存储所有用户信息，包括家长和孩子。

| 字段 | 类型 | 说明 |
|------|------|------|
| username | String | 用户名（手机号） |
| password | String | 密码（加密存储） |
| role | Enum | 角色：admin/parent/child |
| identity | String | 身份标识（昵称） |
| nickname | String | 昵称 |
| gender | Enum | 性别：boy/girl/none |
| familyId | ObjectId | 家庭ID |
| inviteCode | String | 邀请码 |
| avatar | String | 头像emoji |
| totalPoints | Number | 总积分 |
| availablePoints | Number | 可用积分 |
| createdAt | Date | 创建时间 |

### 2. Task（任务表）

存储任务信息，包括任务模板和具体任务实例。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 创建者ID（家长） |
| childId | ObjectId | 指派给孩子ID |
| name | String | 任务名称 |
| description | String | 任务描述 |
| points | Number | 基础积分 |
| bonusPoints | Number | 奖励积分 |
| type | Enum | 类型：daily/custom |
| taskCategory | Enum | 分类：personal_hygiene/learning/housework/social/other |
| difficulty | Enum | 难度：easy/normal/hard |
| icon | String | 图标emoji |
| requirePhoto | Boolean | 是否需要照片凭证 |
| approvalMode | Enum | 审核模式：auto/manual |
| status | Enum | 状态：pending/submitted/approved/rejected/expired/failed |
| photoUrl | String | 提交的照片URL |
| rejectionReason | String | 驳回原因 |
| recurrence | Enum | 周期：daily/weekly/custom_days/none |
| recurrenceDays | Array | 周期天数 |
| recurrenceInterval | Number | 周期间隔 |
| validFrom | Date | 有效期开始 |
| validUntil | Date | 有效期结束 |
| deadline | Date | 截止日期 |
| originalTaskId | ObjectId | 原任务ID（周期性任务） |
| submittedAt | Date | 提交时间 |
| approvedAt | Date | 审核时间 |
| completedAt | Date | 完成时间 |
| streakCount | Number | 连续完成次数 |
| auditHistory | Array | 审核历史记录 |

### 3. TaskTemplate（任务模板表）

存储可复用的任务模板。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 创建者ID |
| name | String | 模板名称 |
| description | String | 描述 |
| points | Number | 基础积分 |
| bonusPoints | Number | 奖励积分 |
| type | Enum | 类型：daily/custom |
| taskCategory | Enum | 任务分类 |
| difficulty | Enum | 难度 |
| icon | String | 图标 |
| requirePhoto | Boolean | 需要照片 |
| approvalMode | Enum | 审核模式 |
| recurrence | Enum | 周期类型 |
| recurrenceDays | Array | 周期天数 |
| recurrenceInterval | Number | 周期间隔 |
| validFrom | Date | 有效期开始 |
| validUntil | Date | 有效期结束 |

### 4. Reward（奖励表）

存储奖励商品信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 创建者ID |
| name | String | 奖励名称 |
| description | String | 描述 |
| points | Number | 所需积分 |
| type | Enum | 类型：physical/privilege |
| icon | String | 图标emoji |
| stock | Number | 库存（-1为无限） |
| isActive | Boolean | 是否上架 |

### 5. Order（订单表）

存储奖励兑换订单。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 家长ID |
| childId | ObjectId | 孩子ID |
| rewardId | ObjectId | 奖励ID |
| rewardName | String | 奖励名称（快照） |
| rewardIcon | String | 奖励图标 |
| pointsSpent | Number | 花费积分 |
| status | Enum | 状态：pending/verified/cancelled |
| verificationCode | String | 核销码 |
| verifiedAt | Date | 核销时间 |

### 6. Account（账户表）

双币种账户系统。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 用户ID |
| coins | Number | 金币数量（可消费） |
| stars | Number | 荣誉分（等级用） |
| creditScore | Number | 信用分（0-100） |
| creditLimit | Number | 信用额度 |
| creditUsed | Number | 已用信用额度 |
| interestRate | Number | 日利率（默认0.001） |
| lastInterestCalcAt | Date | 上次计息时间 |
| totalInterestEarned | Number | 累计利息收益 |

### 7. Transaction（交易记录表）

存储所有交易记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 用户ID |
| type | Enum | 类型：income/expense/interest/credit/reward |
| currency | Enum | 币种：coins/stars |
| amount | Number | 金额 |
| balance | Number | 交易后余额 |
| description | String | 描述 |
| relatedTaskId | ObjectId | 关联任务ID |
| relatedRewardId | ObjectId | 关联奖励ID |

### 8. UserAvatar（用户角色成长表）

游戏化角色成长数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 用户ID |
| level | Number | 当前等级 |
| currentXP | Number | 当前经验值 |
| totalXP | Number | 总经验值 |
| stage | Enum | 阶段：egg/hatchling/explorer/adventurer/hero/legend |
| unlockedSkins | Array | 已解锁皮肤ID列表 |
| currentSkin | String | 当前使用皮肤 |
| equippedAccessories | Array | 已装备配饰ID列表 |
| unlockedAccessories | Array | 已解锁配饰ID列表 |
| petName | String | 宠物名字 |
| consecutiveDays | Number | 当前连续天数 |
| maxConsecutiveDays | Number | 最大连续天数 |
| totalTasksCompleted | Number | 完成任务总数 |
| lastTaskDate | Date | 最后任务日期 |

### 9. MedalDefinition（勋章定义表）

勋章类型定义。

| 字段 | 类型 | 说明 |
|------|------|------|
| type | Enum | 类型：task_master/streak_master/persistence/champion |
| level | Enum | 等级：bronze/silver/gold/diamond |
| name | String | 勋章名称 |
| description | String | 描述 |
| icon | String | 图标 |
| requirement | Number | 达成条件数值 |
| requirementType | Enum | 条件类型：total/consecutive |
| xpReward | Number | 奖励经验值 |
| color | String | 颜色 |
| order | Number | 排序 |

### 10. UserMedal（用户勋章表）

用户获得的勋章。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 用户ID |
| medalId | ObjectId | 勋章定义ID |
| earnedAt | Date | 获得时间 |
| progress | Number | 进度 |
| isNew | Boolean | 是否新获得 |

### 11. AchievementDefinition（成就定义表）

成就系统定义。

| 字段 | 类型 | 说明 |
|------|------|------|
| dimension | Enum | 维度：accumulation/behavior/surprise |
| category | Enum | 分类：task_count/points_count/category_count等 |
| level | Enum | 等级：bronze/silver/gold/legendary |
| name | String | 成就名称 |
| description | String | 描述 |
| hiddenDescription | String | 隐藏描述 |
| icon | String | 图标 |
| conditionType | Enum | 条件类型 |
| requirement | Number | 达成数值 |
| requirementDetail | Object | 详细条件 |
| pointsReward | Number | 积分奖励 |
| honorPoints | Number | 荣誉分奖励 |
| isHidden | Boolean | 是否隐藏成就 |
| isActive | Boolean | 是否激活 |

### 12. UserAchievement（用户成就表）

用户获得的成就。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId | 用户ID |
| achievementId | ObjectId | 成就定义ID |
| earnedAt | Date | 获得时间 |
| progress | Number | 进度 |
| isNew | Boolean | 是否新获得 |
| viewedAt | Date | 查看时间 |

## API 接口

### 认证相关
- `POST /api/auth` - 登录/注册/加入家庭
- `GET /api/auth/current` - 获取当前用户信息

### 孩子管理
- `GET /api/children` - 获取孩子信息
- `POST /api/children` - 添加孩子
- `PUT /api/children` - 更新孩子信息

### 任务管理
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks` - 更新任务（提交/审核）
- `DELETE /api/tasks` - 删除任务
- `GET /api/tasks/stats` - 获取任务统计

### 任务模板
- `GET /api/task-templates` - 获取模板列表
- `POST /api/task-templates` - 创建模板
- `PUT /api/task-templates/:id` - 更新模板
- `DELETE /api/task-templates/:id` - 删除模板

### 奖励管理
- `GET /api/rewards` - 获取奖励列表
- `POST /api/rewards` - 创建奖励
- `PUT /api/rewards` - 更新奖励
- `DELETE /api/rewards` - 删除奖励

### 订单管理
- `GET /api/orders` - 获取订单列表
- `POST /api/orders` - 创建订单（兑换奖励）
- `PUT /api/orders` - 更新订单（核销/取消）

### 账本
- `GET /api/ledger` - 获取收支记录

### 经济系统
- `GET /api/economy` - 获取账户信息
- `PUT /api/economy` - 更新账户（利息计算/存取/消费）

### 游戏化
- `GET /api/gamification/progress` - 获取成长进度
- `POST /api/gamification/progress` - 更新进度（完成任务时调用）
- `GET /api/gamification/avatar` - 获取角色数据
- `PUT /api/gamification/avatar` - 更新角色配置
- `GET /api/gamification/medals` - 获取勋章列表

### 成就系统
- `GET /api/achievements` - 获取成就列表
- `POST /api/achievements/init` - 初始化成就数据

### 统计
- `GET /api/stats` - 获取统计数据

### 家庭
- `GET /api/family` - 获取家庭成员
- `GET /api/family/members` - 获取成员列表

### 上传
- `POST /api/upload` - 上传图片

### 定时任务
- `GET /api/cron/daily-reset` - 每日重置任务

## 项目结构

```
points/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── auth/            # 认证
│   │   ├── children/        # 孩子管理
│   │   ├── tasks/           # 任务管理
│   │   ├── task-templates/  # 任务模板
│   │   ├── rewards/         # 奖励管理
│   │   ├── orders/          # 订单管理
│   │   ├── ledger/          # 账本
│   │   ├── economy/         # 经济系统
│   │   ├── gamification/    # 游戏化
│   │   ├── achievements/    # 成就系统
│   │   ├── stats/           # 统计
│   │   ├── family/          # 家庭
│   │   ├── upload/          # 文件上传
│   │   └── cron/            # 定时任务
│   ├── parent/              # 家长端页面
│   │   ├── page.tsx         # 家长首页
│   │   ├── home/            # 首页
│   │   ├── tasks/           # 任务管理
│   │   ├── audit/           # 审核任务
│   │   ├── rewards/         # 奖励管理
│   │   ├── orders/          # 订单管理
│   │   ├── overview/        # 总览
│   │   ├── family/          # 家庭管理
│   │   ├── users/           # 用户管理
│   │   └── achievements/    # 成就查看
│   ├── child/               # 孩子端页面
│   │   ├── page.tsx         # 孩子首页
│   │   ├── task/            # 任务大厅
│   │   ├── store/           # 积分商城
│   │   ├── wallet/          # 积分钱包
│   │   ├── achievements/    # 成就展示
│   │   └── gift/            # 礼物兑换
│   ├── login/               # 登录页
│   ├── page.tsx             # 入口页
│   ├── layout.tsx           # 根布局
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── ui/                  # UI 组件
│   ├── gamification/        # 游戏化组件
│   ├── effects/             # 特效组件
│   └── Layouts/             # 布局组件
├── context/                 # 状态管理
│   └── AppContext.tsx       # 全局上下文
├── lib/                     # 工具库
│   ├── mongodb.ts           # MongoDB 连接
│   ├── auth.ts              # 认证工具
│   ├── cron/                # 定时任务
│   └── gamification/        # 游戏化逻辑
├── models/                  # 数据模型
│   ├── User.ts
│   ├── Task.ts
│   ├── TaskTemplate.ts
│   ├── Reward.ts
│   ├── Order.ts
│   ├── Economy.ts
│   ├── Gamification.ts
│   └── Achievement.ts
├── utils/                   # 工具函数
│   ├── date.ts
│   ├── image.ts
│   └── request.ts
└── public/                  # 静态资源
    └── uploads/             # 上传文件
```

## 配色方案

采用浅绿色护眼主题：

- **主色调**: `#22c55e` (绿色)
- **背景色**: `#f0fdf4` (浅绿)
- **辅助色**: `#fde047` (黄色)
- **卡片背景**: `#ffffff` (白色)

## 激励文案

系统内置激励文案库：
- 成功激励："你离梦想又近了一步！"
- 驳回引导："哎呀，审核官发现了一点小瑕疵..."
- 兑换提示："恭喜兑换成功！快去找爸妈领取！"

## 安全机制

1. **防止刷分**：任务提交有冷却时间
2. **家长锁**：敏感操作需验证身份
3. **防误触**：高价值兑换需二次确认
4. **JWT 认证**：API 接口使用 Token 认证
5. **密码加密**：使用 bcrypt 加密存储

## 游戏化机制

### 经验值计算
- 基础经验 = 任务积分
- 连续7天加成：+5 XP
- 连续21天加成：+10 XP

### 成长阶段
1. **蛋** (Lv.1) - 待孵化的蛋
2. **破壳** (Lv.2) - 小小破壳儿
3. **探险家** (Lv.3-4) - 见习探险家
4. **队长** (Lv.5-6) - 探险队长
5. **英雄** (Lv.7-9) - 英雄
6. **传奇** (Lv.10+) - 传奇

### 勋章类型
- **任务大师**：完成任务数量
- **连续打卡**：连续完成任务天数
- **坚持勋章**：最大连续天数
- **冠军勋章**：特殊里程碑

## 许可证

MIT