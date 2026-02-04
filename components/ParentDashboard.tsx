'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp, ChildProfile } from '@/context/AppContext';
import Image from 'next/image';
import { 
  Home, Users, Gift, FileText, Plus, Check, X, 
  Clock, Star, ChevronRight, Settings, LogOut, Ticket
} from 'lucide-react';



interface PlainReward {
  _id: string;
  userId: string;
  name: string;
  description: string;
  points: number;
  type: 'physical' | 'privilege';
  icon: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlainTask {
  _id: string;
  userId: string;
  childId: string;
  name: string;
  description: string;
  points: number;
  type: 'daily' | 'advanced' | 'challenge';
  icon: string;
  requirePhoto: boolean;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  photoUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlainOrder {
  _id: string;
  userId: string;
  childId: string;
  rewardId: string;
  rewardName: string;
  rewardIcon?: string;
  pointsSpent: number;
  status: 'pending' | 'verified' | 'cancelled';
  verificationCode: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface IDisplayedTask extends PlainTask {
  childName: string;
  childAvatar?: string;
}

interface IDisplayedOrder extends PlainOrder {
  rewardName: string;
  rewardIcon?: string;
  childName: string;
  childAvatar: string;
}

interface ChildStats {
  pendingTasks: number;
  submittedTasks: number;
  pendingOrders: number;
}

export default function ParentDashboard() {
  const { currentUser, childList, logout, switchToChild, addChild, switchToParent } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'rewards' | 'audit' | 'orders'>('home');
  const [tasks, setTasks] = useState<IDisplayedTask[]>([]);
  const [rewards, setRewards] = useState<PlainReward[]>([]);
  const [orders, setOrders] = useState<IDisplayedOrder[]>([]);
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all');
  const [childStats, setChildStats] = useState<Record<string, ChildStats>>({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newTask, setNewTask] = useState({ 
    name: '', 
    points: 5, 
    icon: '⭐', 
    type: 'daily',
    requirePhoto: false,
    selectedChildren: [] as string[]
  });
  const [newReward, setNewReward] = useState({ name: '', points: 50, type: 'physical', icon: '🎁', stock: 10 });

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?userId=${currentUser?.id}`);
    const data: { success: boolean; tasks: PlainTask[] } = await res.json();
    if (data.success) {
      const tasksWithNames: IDisplayedTask[] = await Promise.all(data.tasks.map(async (task: PlainTask) => {
        const childRes = await fetch(`/api/children?childId=${task.childId}`);
        const childData: { success: boolean; child: { nickname: string; avatar: string } } = await childRes.json();
        return { 
          ...task, 
          childName: childData.child?.nickname || '未知',
          childAvatar: childData.child?.avatar || '👶'
        };
      }));
      return tasksWithNames;
    }
    return [];
  }, [currentUser?.id]);

  const fetchRewards = useCallback(async () => {
    const res = await fetch(`/api/rewards?userId=${currentUser?.id}`);
    const data: { success: boolean; rewards: PlainReward[] } = await res.json();
    if (data.success) {
      return data.rewards;
    }
    return [];
  }, [currentUser?.id]);

  const fetchOrders = async () => {
    const res = await fetch(`/api/orders?userId=${currentUser?.id}`);
    const data: { success: boolean; orders: PlainOrder[] } = await res.json();
    if (data.success) {
      const ordersWithNames: IDisplayedOrder[] = await Promise.all(data.orders.map(async (order: PlainOrder) => {
        const childRes = await fetch(`/api/children?childId=${order.childId}`);
        const childData: { success: boolean; child: { nickname: string; avatar: string } } = await childRes.json();
        return {
          ...order,
          childName: childData.child?.nickname || '未知',
          childAvatar: childData.child?.avatar || '👶'
        };
      }));
      return ordersWithNames;
    }
    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        const fetchedTasks = await fetchTasks();
        setTasks(fetchedTasks);
        const fetchedRewards = await fetchRewards();
        setRewards(fetchedRewards);
        const fetchedOrders = await fetchOrders();
        setOrders(fetchedOrders);
      }
    };
    loadData();
  }, [currentUser]);

  const handleApproveTask = async (taskId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status, rejectionReason }),
    });
    fetchTasks();
  };

  const handleVerifyOrder = async (orderId: string) => {
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action: 'verify' }),
    });
    fetchOrders();
  };

  const handleCancelOrder = async (orderId: string) => {
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action: 'cancel' }),
    });
    fetchOrders();
  };

  const handleAddTask = async () => {
    if (!currentUser?.id) {
      alert('请先登录');
      return;
    }
    if (newTask.selectedChildren.length === 0) {
      alert('请选择至少一个孩子');
      return;
    }
    if (!newTask.name.trim()) {
      alert('请输入任务名称');
      return;
    }

    for (const childId of newTask.selectedChildren) {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newTask, 
          userId: currentUser.id, 
          childId 
        }),
      });
      
      if (!res.ok) {
        alert('添加失败');
        return;
      }
    }
    
    setShowAddTask(false);
    setNewTask({ name: '', points: 5, icon: '⭐', type: 'daily', requirePhoto: false, selectedChildren: [] });
    fetchTasks();
  };

  const handleAddReward = async () => {
    if (!currentUser?.id) {
      alert('请先登录');
      return;
    }

    const res = await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newReward, userId: currentUser.id }),
    });
    
    const data = await res.json();
    if (data.success) {
      setShowAddReward(false);
      setNewReward({ name: '', points: 50, type: 'physical', icon: '🎁', stock: 10 });
      fetchRewards();
    } else {
      alert('添加失败: ' + data.message);
    }
  };

  const toggleChild = (childId: string) => {
    setNewTask(prev => ({
      ...prev,
      selectedChildren: prev.selectedChildren.includes(childId)
        ? prev.selectedChildren.filter(id => id !== childId)
        : [...prev.selectedChildren, childId]
    }));
  };

  // 计算每个孩子的统计
  useEffect(() => {
    const calculateChildStats = () => {
      const stats: Record<string, ChildStats> = {};
      childList.forEach(child => {
        stats[child.id] = {
          pendingTasks: tasks.filter(t => t.childId === child.id && t.status === 'pending').length,
          submittedTasks: tasks.filter(t => t.childId === child.id && t.status === 'submitted').length,
          pendingOrders: orders.filter(o => o.childId === child.id && o.status === 'pending').length,
        };
      });
      setChildStats(stats);
    };
    calculateChildStats();
  }, [tasks, orders, childList]);

  type NavItemId = 'home' | 'audit' | 'tasks' | 'orders' | 'rewards';

  const pendingTasks = selectedChildFilter === 'all' 
    ? tasks.filter(t => t.status === 'submitted')
    : tasks.filter(t => t.status === 'submitted' && t.childId.toString() === selectedChildFilter);
  const pendingOrders = selectedChildFilter === 'all'
    ? orders.filter(o => o.status === 'pending')
    : orders.filter(o => o.status === 'pending' && o.childId.toString() === selectedChildFilter);

  const navItems: { id: NavItemId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'home', icon: Home, label: '首页' },
    { id: 'audit', icon: FileText, label: '审核', badge: pendingTasks.length },
    { id: 'tasks', icon: Star, label: '任务' },
    { id: 'orders', icon: Ticket, label: '核销', badge: pendingOrders.length },
    { id: 'rewards', icon: Gift, label: '商城' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">🌟</div>
          <div className="logo-title">小小奋斗者</div>
          <div className="logo-subtitle">家长管理后台</div>
        </div>

        <div className="user-info">
          <div className="user-avatar">👨‍👩‍👧</div>
          <div>
            <div className="user-name">家长</div>
            <div className="user-role">管理员</div>
          </div>
        </div>

        <div className="desktop-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                router.push(`/parent/${item.id}`);
              }}
              className={`desktop-nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="badge">{item.badge}</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <div
            onClick={() => {
              if (confirm('确定要退出登录吗？')) {
                logout();
              }
            }}
            className="desktop-nav-item text-red-600"
          >
            <LogOut size={22} />
            <span>退出登录</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-lg px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌟</span>
            <span className="font-bold text-blue-600">小小奋斗者</span>
          </div>
          <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-xl">
            <LogOut size={20} className="text-gray-600" />
          </button>
        </header>

        {/* Desktop Header */}
        <div className="header-desktop">
          <h1 className="text-2xl font-bold text-blue-600">
            {activeTab === 'home' && '欢迎回来'}
            {activeTab === 'audit' && '任务审核'}
            {activeTab === 'tasks' && '任务管理'}
            {activeTab === 'orders' && '兑换核销'}
            {activeTab === 'rewards' && '积分商城'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{pathname}</span>
            <span className="text-gray-600">{currentUser?.phone}</span>
          </div>
        </div>

        {activeTab === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div 
                className="card cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => {
                  setActiveTab('audit');
                  router.push('/parent/audit');
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-yellow-200/80 backdrop-blur rounded-xl flex items-center justify-center">
                    <Clock size={24} className="text-yellow-600" />
                  </div>
                  <span className="text-sm text-gray-600">待审核</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{tasks.filter(t => t.status === 'submitted').length}</p>
              </div>
              <div 
                className="card cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => {
                  setActiveTab('orders');
                  router.push('/parent/orders');
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-200/80 backdrop-blur rounded-xl flex items-center justify-center">
                    <Check size={24} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">待核销</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{orders.filter(o => o.status === 'pending').length}</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">孩子档案</h2>
              <div className="grid gap-3">
                {childList.map((child: ChildProfile) => {
                  const stats = childStats[child.id] || { pendingTasks: 0, submittedTasks: 0, pendingOrders: 0 };
                  return (
                    <div
                      key={child.id as string}
                      onClick={() => switchToChild(child)}
                      className="card flex items-center gap-4 cursor-pointer hover:bg-white/90 transition"
                    >
                      <div className="text-3xl">{child.avatar}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{child.nickname}</p>
                        <p className="text-sm text-gray-500">
                          积分: {child.availablePoints} | 
                          <span className="text-orange-500 ml-1">待完成: {stats.pendingTasks}</span> | 
                          <span className="text-blue-500 ml-1">待审核: {stats.submittedTasks}</span> | 
                          <span className="text-green-500 ml-1">待核销: {stats.pendingOrders}</span>
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  );
                })}
                {childList.length === 0 && (
                  <div className="card text-center py-8">
                    <Users size={48} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500 mb-4">还没有孩子档案</p>
                    <button
                      onClick={() => {
                        const nickname = prompt('请输入孩子昵称:');
                        if (nickname && nickname.trim()) {
                          addChild(nickname.trim());
                        }
                      }}
                      className="btn-primary"
                    >
                      添加孩子
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">任务审核</h2>
              <select
                value={selectedChildFilter}
                onChange={(e) => setSelectedChildFilter(e.target.value)}
                className="input-field w-auto px-4 py-2"
              >
                <option value="all">全部孩子</option>
                {childList.map(child => (
                  <option key={child.id as string} value={child.id as string}>{child.nickname}</option>
                ))}
              </select>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <Check size={48} className="mx-auto mb-2 opacity-50" />
                <p>暂无待审核任务</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <div key={task._id.toString()} className="card">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="text-4xl">{task.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{task.name}</span>
                          <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            {task.childAvatar} {task.childName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">+{task.points} 积分</p>
                        <p className="text-xs text-gray-400">
                          提交时间: {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '-'}
                        </p>
                        {task.photoUrl && (
                          <Image 
                            src={task.photoUrl} 
                            alt="任务照片" 
                            width={200}
                            height={200}
                            className="mt-2 rounded-lg max-h-48 object-cover"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveTask(task._id, 'rejected')}
                          className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition"
                          title="驳回"
                        >
                          <X size={20} />
                        </button>
                        <button
                          onClick={() => handleApproveTask(task._id, 'approved')}
                          className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition"
                          title="通过"
                        >
                          <Check size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">兑换核销</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedChildFilter}
                  onChange={(e) => setSelectedChildFilter(e.target.value)}
                  className="input-field w-auto px-4 py-2"
                >
                  <option value="all">全部孩子</option>
                  {childList.map(child => (
                    <option key={child.id.toString()} value={child.id.toString()}>{child.nickname}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">{pendingOrders.length} 个待核销</span>
              </div>
            </div>
            
            {orders.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <Ticket size={48} className="mx-auto mb-2 opacity-50" />
                <p>暂无兑换记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order._id.toString()} className="order-card">
                    <div className="order-header">
                      <div className="order-reward">
                        <div className="order-reward-icon">{order.rewardIcon || '🎁'}</div>
                        <div>
                          <div className="order-reward-name">{order.rewardName}</div>
                          <div className="order-reward-points">🪙 {order.pointsSpent}</div>
                        </div>
                      </div>
                      <span className={`status-badge ${
                        order.status === 'pending' ? 'status-submitted' : 
                        order.status === 'verified' ? 'status-verified' : 'status-rejected'
                      }`}>
                        {order.status === 'pending' ? '待核销' : 
                         order.status === 'verified' ? '已核销' : '已取消'}
                      </span>
                    </div>
                    <div className="order-info">
                      <div className="order-child">
                        <span>{order.childAvatar}</span>
                        <span>{order.childName}</span>
                      </div>
                      <div className="order-code">{order.verificationCode}</div>
                    </div>
                    {order.status === 'pending' && (
                      <div className="order-actions">
                        <button
                          onClick={() => handleVerifyOrder(order._id)}
                          className="order-btn order-btn-verify"
                        >
                          ✅ 确认核销
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定取消这个兑换吗？积分将退还给孩子')) {
                              handleCancelOrder(order._id);
                            }
                          }}
                          className="order-btn order-btn-cancel"
                        >
                          ❌ 取消
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">任务管理</h2>
              <button
                onClick={() => setShowAddTask(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} /> 添加任务
              </button>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task._id} className="card flex items-center gap-4">
                  <div className="text-2xl">{task.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{task.name}</p>
                    <p className="text-sm text-gray-500">+{task.points} 积分</p>
                  </div>
                  <span className={`status-badge ${
                    task.status === 'approved' ? 'status-approved' : 
                    task.status === 'submitted' ? 'status-submitted' : 
                    task.status === 'rejected' ? 'status-rejected' : 'status-pending'
                  }`}>
                    {task.status === 'approved' ? '已完成' : 
                     task.status === 'submitted' ? '待审核' : 
                     task.status === 'rejected' ? '已驳回' : '待完成'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'rewards' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">积分商城</h2>
              <button
                onClick={() => setShowAddReward(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} /> 添加奖励
              </button>
            </div>
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div key={reward._id.toString()} className="reward-card">
                  <div className="reward-icon">{reward.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{reward.name}</p>
                    <p className="text-sm text-gray-500">{reward.points} 积分</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full ${reward.stock > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      库存: {reward.stock}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {reward.type === 'physical' ? '实物' : '特权'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">添加新任务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">选择孩子</label>
                <div className="child-selector">
                  {childList.map((child: ChildProfile) => (
                    <div
                      key={child.id}
                      onClick={() => toggleChild(child.id)}
                      className={`child-chip ${newTask.selectedChildren.includes(child.id) ? 'selected' : ''}`}
                    >
                      <span className="avatar">{child.avatar}</span>
                      <span className="name">{child.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">任务名称</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="input-field"
                  placeholder="如：整理书包"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">积分</label>
                <input
                  type="number"
                  value={newTask.points}
                  onChange={(e) => setNewTask({ ...newTask, points: parseInt(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTask.requirePhoto}
                    onChange={(e) => setNewTask({ ...newTask, requirePhoto: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">要求拍照提交</span>
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {['⭐', '📚', '🧹', '🏃', '🎨', '🎵'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewTask({ ...newTask, icon })}
                      className={`w-10 h-10 rounded-lg text-xl ${newTask.icon === icon ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-100'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">任务类型</label>
                <div className="flex gap-2">
                  {['daily', 'advanced', 'challenge'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewTask({ ...newTask, type })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${newTask.type === type ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {type === 'daily' ? '日常' : type === 'advanced' ? '进阶' : '挑战'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowAddTask(false)} className="flex-1 py-3 text-gray-600">取消</button>
                <button onClick={handleAddTask} className="flex-1 py-3 btn-primary">确认添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Reward Modal */}
      {showAddReward && (
        <div className="modal-overlay" onClick={() => setShowAddReward(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">添加新奖励</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">奖励名称</label>
                <input
                  type="text"
                  value={newReward.name}
                  onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                  className="input-field"
                  placeholder="如：冰淇淋"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">所需积分</label>
                <input
                  type="number"
                  value={newReward.points}
                  onChange={(e) => setNewReward({ ...newReward, points: parseInt(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {['🎁', '🍦', '📚', '🧸', '📺', '⏰'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewReward({ ...newReward, icon })}
                      className={`w-10 h-10 rounded-lg text-xl ${newReward.icon === icon ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-gray-100'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">奖励类型</label>
                <div className="flex gap-2">
                  {['physical', 'privilege'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewReward({ ...newReward, type })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${newReward.type === type ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {type === 'physical' ? '实物' : '特权'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">库存数量</label>
                <input
                  type="number"
                  value={newReward.stock}
                  onChange={(e) => setNewReward({ ...newReward, stock: parseInt(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowAddReward(false)} className="flex-1 py-3 text-gray-600">取消</button>
                <button onClick={handleAddReward} className="flex-1 py-3 btn-primary">确认添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="nav-bar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as 'home' | 'tasks' | 'rewards' | 'audit' | 'orders');
              router.push(`/parent/${item.id}`);
            }}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon size={24} />
            <span className="text-xs">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
