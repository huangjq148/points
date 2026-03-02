# 游戏化说明

当前版本已移除“等级系统”和“连击/连续天数”机制。

## 保留能力
- 勋章墙（按累计任务数发放）
- 成就通知（新勋章）
- 角色外观配置（皮肤/配饰）
- 任务完成后的 XP 统计（仅累计展示，不触发升级）

## API
- `POST /api/gamification/init`：初始化勋章、皮肤、配饰
- `GET /api/gamification/medals`：获取勋章墙
- `PUT /api/gamification/medals`：标记勋章已查看
- `GET /api/gamification/avatar`：获取角色与外观数据
- `PUT /api/gamification/avatar`：更新角色外观配置
- `POST /api/gamification/progress`：更新游戏化进度（累计任务与 XP）
- `GET /api/gamification/progress`：获取游戏化统计

## 行为规则
- 任务审核通过后累计任务数
- 只根据 `total` 类型勋章规则授予勋章
- 不再计算连续天数，不再升级，不再解锁等级奖励
