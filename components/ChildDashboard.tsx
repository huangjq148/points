'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Gift, Wallet, Lock, Star,
  Sparkles, ChevronRight, Camera, User, LogOut, Calendar as CalendarIcon, Search, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import { zhCN } from 'date-fns/locale';
import ConfirmModal from './ConfirmModal';
import Button from '@/components/ui/Button';

registerLocale('zh-CN', zhCN);

interface Task {
  _id: string;
  name: string;
  description?: string; // Add description
  icon: string;
  points: number;
  type: string;
  status: string;
  requirePhoto: boolean;
  photoUrl?: string;
  rejectionReason?: string;
  createdAt?: string;
  imageUrl?: string;
}

interface Reward {
  _id: string;
  name: string;
  icon: string;
  points: number;
  type: string;
  stock: number;
}

interface ChildProfile {
  id: string;
  nickname: string;
  avatar: string;
  availablePoints: number;
  totalPoints: number;
}

interface LedgerItem {
  _id: string;
  type: 'income' | 'expense';
  name: string;
  points: number;
  date: string;
  icon: string;
}

export default function ChildDashboard() {
  const { currentUser, currentChild, childList, switchToChild, updateChildPoints, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = (() => {
    const pathSegments = pathname.split('/');
    const currentTab = pathSegments[pathSegments.length - 1];
    if (['tasks', 'store', 'wallet'].includes(currentTab)) {
      return currentTab as 'tasks' | 'store' | 'wallet';
    }
    return 'tasks'; // Default to tasks (Task Hall)
  })();
  const [activeTab, setActiveTab] = useState<'tasks' | 'store' | 'wallet'>(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分页加载状态
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const taskListRef = useRef<HTMLDivElement>(null);

  // 搜索状态
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [rewardSearchQuery, setRewardSearchQuery] = useState('');
  const [taskDate, setTaskDate] = useState<Date | null>(null);
  const [activeTaskTab, setActiveTaskTab] = useState<'all' | 'completed' | 'uncompleted'>('all');
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);

  // Ledger State
  const [ledgerData, setLedgerData] = useState<LedgerItem[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLimit] = useState(10);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerStartDate, setLedgerStartDate] = useState<Date | null>(null);
  const [ledgerEndDate, setLedgerEndDate] = useState<Date | null>(null);
  const [ledgerKeyword, setLedgerKeyword] = useState('');

  const fetchTasks = async (page: number = 1, append: boolean = false) => {
    if (!currentChild) return;
    const limit = 10;
    const res = await fetch(`/api/tasks?childId=${currentChild.id}&page=${page}&limit=${limit}`);
    const data = await res.json();
    if (data.success) {
      if (append) {
        setTasks(prev => [...prev, ...data.tasks]);
      } else {
        setTasks(data.tasks);
      }
      setHasMoreTasks(data.tasks.length === limit);
    }
  };

  const fetchLedger = async (page = 1) => {
    if (!currentChild) return;
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams({
        childId: currentChild.id,
        page: page.toString(),
        limit: ledgerLimit.toString(),
      });
      if (ledgerStartDate) params.append('startDate', ledgerStartDate.toISOString());
      if (ledgerEndDate) params.append('endDate', ledgerEndDate.toISOString());
      if (ledgerKeyword) params.append('keyword', ledgerKeyword);

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data.data);
        setLedgerTotal(data.pagination.total);
        setLedgerPage(page);
      }
    } catch (error) {
      console.error('Fetch ledger error:', error);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wallet') {
      fetchLedger(1);
    }
  }, [activeTab, ledgerStartDate, ledgerEndDate, ledgerKeyword]); // Debounce keyword ideally, but effect is okay for now

  const fetchRewards = async () => {
    const res = await fetch(`/api/rewards?isActive=true`);
    const data = await res.json();
    if (data.success) {
      setRewards(data.rewards);
      setFilteredRewards(data.rewards);
    }
  };

  // 加载更多任务
  const loadMoreTasks = async () => {
    if (isLoadingMore || !hasMoreTasks) return;
    setIsLoadingMore(true);
    const nextPage = taskPage + 1;
    await fetchTasks(nextPage, true);
    setTaskPage(nextPage);
    setIsLoadingMore(false);
  };

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      if (activeTab !== 'tasks' || !taskListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = taskListRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        loadMoreTasks();
      }
    };

    const listElement = taskListRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [activeTab, taskPage, hasMoreTasks, isLoadingMore]);

  // 任务搜索过滤
  useEffect(() => {
    let filtered = tasks;
    if (taskSearchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(taskSearchQuery.toLowerCase())
      );
    }
    if (taskDate) {
      const filterDate = taskDate.toDateString();
      filtered = filtered.filter(t => {
        if (!t.createdAt) return false;
        return new Date(t.createdAt).toDateString() === filterDate;
      });
    }

    if (activeTaskTab === 'completed') {
      filtered = filtered.filter(t => t.status === 'approved');
    } else if (activeTaskTab === 'uncompleted') {
      filtered = filtered.filter(t => ['pending', 'rejected', 'submitted'].includes(t.status));
    }

    setFilteredTasks(filtered);
  }, [tasks, taskSearchQuery, taskDate, activeTaskTab]);

  // 奖励搜索过滤
  useEffect(() => {
    if (rewardSearchQuery) {
      const filtered = rewards.filter(r =>
        r.name.toLowerCase().includes(rewardSearchQuery.toLowerCase())
      );
      setFilteredRewards(filtered);
    } else {
      setFilteredRewards(rewards);
    }
  }, [rewards, rewardSearchQuery]);

  useEffect(() => {
    if (currentChild) {
      setTaskPage(1);
      setTasks([]);
      fetchTasks(1, false);
      fetchRewards();
      setTaskSearchQuery('');
      setTaskDate(null);
      setRewardSearchQuery('');
    }
  }, [currentChild]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;

    let photoUrl = '';
    if (selectedTask.requirePhoto && photoFile) {
      const formData = new FormData();
      formData.append('file', photoFile);
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          photoUrl = uploadData.url;
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: selectedTask._id, status: 'submitted', photoUrl }),
    });
    
    setShowSubmitModal(false);
    setPhotoFile(null);
    setPhotoPreview('');
    setSelectedTask(null);
    
    fetchTasks();
    setMessage("提交成功！等待家长审核~");
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const handleRedoTask = async (task: Task) => {
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task._id, status: 'pending' }),
    });
    fetchTasks();
    setMessage("任务已重置，继续加油！💪");
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const handleSwitchChild = (child: ChildProfile) => {
    switchToChild(child);
    setShowChildSwitcher(false);
  };

  const handleRedeemReward = async (reward: Reward) => {
    if ((currentChild?.availablePoints || 0) < reward.points) {
      setMessage("积分不足，继续加油！💪");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
      return;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser?.id,
        childId: currentChild?.id,
        rewardId: reward._id,
      }),
    });
    const data = await res.json();
    if (data.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#fde047', '#fbbf24'],
      });
      setMessage(`兑换成功！找爸妈领取吧~\n核销码: ${data.verificationCode}`);
      setShowMessage(true);
      if (currentChild) {
        updateChildPoints(currentChild.id, currentChild.availablePoints - reward.points);
      }
      fetchTasks();
      fetchRewards();
    } else {
      setMessage(data.message);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  };

  const handleLogout = () => {
    setShowConfirmLogout(true);
  };

  const confirmLogout = () => {
    logout();
    setShowConfirmLogout(false);
  };

  return (
    <div className="min-h-screen child-theme pb-24 md:pb-8">
      {showPinModal && (
        <PinVerification
          onVerified={() => setShowPinModal(false)}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {showChildSwitcher && (
        <div className="modal-overlay" onClick={() => setShowChildSwitcher(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔄</div>
              <h3 className="text-xl font-bold text-gray-800">切换孩子</h3>
              <p className="text-gray-600">选择要切换的孩子</p>
            </div>
            <div className="space-y-3 mb-4">
              {childList.map((child) => (
                <div
                  key={child.id}
                  onClick={() => handleSwitchChild(child)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition ${
                    child.id === currentChild?.id
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="text-3xl">{child.avatar}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{child.nickname}</p>
                    <p className="text-sm text-gray-500">🪙 {child.availablePoints} 积分</p>
                  </div>
                  {child.id === currentChild?.id && (
                    <span className="text-blue-500 font-bold">当前</span>
                  )}
                </div>
              ))}
            </div>
            <Button
              onClick={() => setShowChildSwitcher(false)}
              variant="secondary"
              fullWidth
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {showMessage && (
        <div className="modal-overlay" onClick={() => setShowMessage(false)}>
          <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-4">💬</div>
            <p className="text-lg text-gray-800 whitespace-pre-line">{message}</p>
          </div>
        </div>
      )}

      {showSubmitModal && selectedTask && (
        <div className="modal-overlay" onClick={() => { setShowSubmitModal(false); setPhotoPreview(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl">{selectedTask.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mt-2">{selectedTask.name}</h3>
              <p className="text-blue-600">+{selectedTask.points} 积分</p>
            </div>

            {selectedTask.requirePhoto && (
              <div className="mb-4">
                <label className="file-upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                  />
                  <Camera className="mx-auto mb-2 text-blue-500" size={32} />
                  <p className="text-gray-600">点击拍照或选择照片</p>
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="预览" className="image-preview" />
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => { setShowSubmitModal(false); setPhotoPreview(''); }}
                className="flex-1 py-3 text-gray-600"
              >
                取消
              </Button>
              <Button onClick={handleSubmitTask} className="flex-1 btn-child">
                确认提交
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={confirmLogout}
        title="退出登录"
        message="确定要退出当前账号吗？"
        confirmText="退出"
        cancelText="取消"
        type="danger"
      />

      {showTaskDetail && (
        <div className="modal-overlay" onClick={() => setShowTaskDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 shadow-lg rounded-2xl p-4 bg-white inline-block">{showTaskDetail.icon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">{showTaskDetail.name}</h3>
              <div className="flex justify-center gap-2 mb-4">
                <span className="badge badge-primary">+{showTaskDetail.points} 积分</span>
                <span className={`badge ${
                  showTaskDetail.status === 'approved' ? 'badge-success' :
                  showTaskDetail.status === 'rejected' ? 'badge-error' :
                  showTaskDetail.status === 'submitted' ? 'badge-info' : 'badge-warning'
                }`}>
                  {showTaskDetail.status === 'approved' ? '已完成' :
                   showTaskDetail.status === 'rejected' ? '需修改' :
                   showTaskDetail.status === 'submitted' ? '审核中' : '待完成'}
                </span>
              </div>
              {showTaskDetail.imageUrl && (
                <img 
                  src={showTaskDetail.imageUrl} 
                  alt="任务配图" 
                  className="w-full max-h-48 object-cover rounded-xl mb-4 shadow-sm"
                />
              )}
              {showTaskDetail.description && (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-left mb-4">
                  {showTaskDetail.description}
                </p>
              )}
              {showTaskDetail.rejectionReason && showTaskDetail.status === 'rejected' && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-left mb-4 border border-red-100">
                  <p className="font-bold text-sm mb-1">💪 加油，还需要一点点改进：</p>
                  <p>{showTaskDetail.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowTaskDetail(null)}
                variant="ghost"
                className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                关闭
              </Button>
              {['pending', 'rejected'].includes(showTaskDetail.status) && (
                <Button
                  onClick={() => {
                    setSelectedTask(showTaskDetail);
                    setShowTaskDetail(null);
                    setShowSubmitModal(true);
                  }}
                  className="flex-1"
                >
                  {showTaskDetail.status === 'rejected' ? '重新提交' : '去完成'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Button
              onClick={() => setShowChildSwitcher(true)}
              variant="ghost"
              className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 p-0"
            >
              <User size={20} className="text-blue-600" />
            </Button>
            {childList.length > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">
                {childList.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowPinModal(true)}
            variant="ghost"
            className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 p-0"
          >
            <Lock size={20} className="text-blue-600" />
          </Button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 p-0"
          >
            <LogOut size={20} className="text-gray-600" />
          </Button>
          <div className="points-display-child transform scale-90 origin-right">
            🪙 {currentChild?.availablePoints || 0}
          </div>
        </div>
      </header>

      <main className="px-6 pt-2 md:max-w-4xl md:mx-auto">
        {activeTab === 'tasks' && (
          <>
            <div className="text-center mb-6">
               <div className="text-6xl md:text-8xl mb-2">{currentChild?.avatar}</div>
               <h1 className="text-2xl md:text-3xl font-bold text-blue-700">{currentChild?.nickname}</h1>
               <p className="text-blue-600">小小奋斗者 🌟</p>
            </div>

            {/* Points Mall Banner */}
            <div 
              onClick={() => setActiveTab('store')}
              className="mb-6 bg-gradient-to-r from-yellow-100 to-orange-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">🎁</div>
                <div>
                  <h3 className="font-bold text-orange-800">积分商城</h3>
                  <p className="text-sm text-orange-600">去兑换喜欢的礼物吧！</p>
                </div>
              </div>
              <ChevronRight className="text-orange-400" />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-blue-700">任务大厅</h2>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-white/50 backdrop-blur rounded-xl mb-4 border border-blue-100">
              {(['all', 'uncompleted', 'completed'] as const).map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTaskTab(tab)}
                  variant="ghost"
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                    activeTaskTab === tab
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-blue-500'
                  }`}
                >
                  {tab === 'all' ? '全部' : tab === 'uncompleted' ? '未完成' : '已完成'}
                </Button>
              ))}
            </div>

            {/* Search Area */}
            <div className="mb-4 flex flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="搜索任务..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
                />
              </div>
              <div className="relative w-32 md:w-40">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
                <DatePicker
                  selected={taskDate}
                  onChange={(date: Date | null) => setTaskDate(date)}
                  locale="zh-CN"
                  dateFormat="yyyy-MM-dd"
                  placeholderText="日期"
                  className="w-full pl-10 pr-2 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none"
                  isClearable
                />
              </div>
            </div>

            <div ref={taskListRef} className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredTasks.map((task) => (
                <div 
                  key={task._id} 
                  className={`task-card cursor-pointer ${['approved', 'submitted'].includes(task.status) ? 'opacity-75' : ''}`}
                  onClick={() => setShowTaskDetail(task)}
                >
                  <div className={`task-icon ${task.status === 'approved' ? 'bg-blue-100' : task.status === 'rejected' ? 'bg-red-100' : ''}`}>
                    {task.status === 'approved' ? '✅' : task.status === 'rejected' ? '❌' : task.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">{task.name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === 'approved' ? 'bg-green-100 text-green-700' :
                        task.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {task.status === 'approved' ? '已完成' :
                         task.status === 'submitted' ? '审核中' :
                         task.status === 'rejected' ? '需修改' : '待完成'}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">+{task.points} 积分</p>
                  </div>
                </div>
              ))}
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-blue-600">
                  <Sparkles size={48} className="mx-auto mb-2 opacity-50" />
                  <p>暂时没有任务啦！</p>
                </div>
              )}

              {isLoadingMore && (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'store' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={() => setActiveTab('tasks')}
                variant="ghost"
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 transition p-0"
              >
                <ChevronRight size={24} className="text-blue-600 rotate-180" />
              </Button>
              <h2 className="text-xl md:text-2xl font-bold text-blue-700">积分商城</h2>
            </div>

            {/* 搜索栏 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="搜索礼物..."
                value={rewardSearchQuery}
                onChange={(e) => setRewardSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredRewards.map((reward) => (
                <div key={reward._id} className={`reward-card flex-col text-center ${reward.stock <= 0 ? 'opacity-50' : ''}`}>
                  <div className="reward-icon mx-auto mb-3">{reward.icon}</div>
                  <p className="font-bold text-gray-800">{reward.name}</p>
                  <p className="text-lg text-yellow-600 font-bold my-2">🪙 {reward.points}</p>
                  <p className={`text-xs mb-3 ${reward.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    库存: {reward.stock}
                  </p>
                  <Button
                    onClick={() => handleRedeemReward(reward)}
                    disabled={reward.stock <= 0}
                    variant={reward.stock > 0 ? 'primary' : 'ghost'}
                    size="sm"
                    fullWidth
                  >
                    {reward.stock > 0 ? '兑换' : '已售罄'}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'wallet' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={() => setActiveTab('tasks')}
                variant="ghost"
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 transition p-0"
              >
                <ChevronRight size={24} className="text-blue-600 rotate-180" />
              </Button>
              <h2 className="text-xl md:text-2xl font-bold text-blue-700">积分账本</h2>
            </div>
            <div className="card-child mb-4">
              <div className="text-center">
                <p className="text-blue-600 mb-2">当前余额</p>
                <div className="text-4xl font-bold text-blue-700">🪙 {currentChild?.availablePoints || 0}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 space-y-2">
               <div className="flex gap-2">
                 <div className="relative flex-1">
                   <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
                   <DatePicker
                      selected={ledgerStartDate}
                      onChange={(date: Date | null) => setLedgerStartDate(date)}
                      locale="zh-CN"
                      dateFormat="yyyy-MM-dd"
                      placeholderText="开始日期"
                      className="w-full pl-8 pr-2 py-2 text-sm rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none"
                      isClearable
                    />
                  </div>
                  <div className="relative flex-1">
                     <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
                     <DatePicker
                       selected={ledgerEndDate}
                       onChange={(date: Date | null) => setLedgerEndDate(date)}
                       locale="zh-CN"
                       dateFormat="yyyy-MM-dd"
                       placeholderText="结束日期"
                       className="w-full pl-8 pr-2 py-2 text-sm rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none"
                       isClearable
                     />
                 </div>
               </div>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <input
                   type="text"
                   placeholder="搜索记录..."
                   value={ledgerKeyword}
                   onChange={(e) => setLedgerKeyword(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
                 />
               </div>
            </div>

            <div className="space-y-3">
              {ledgerLoading ? (
                 <div className="text-center py-8">
                   <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                 </div>
              ) : (
                <>
                  {ledgerData.length > 0 ? (
                    ledgerData.map((item) => (
                      <div key={item._id} className="card-parent flex items-center gap-3">
                        <div className={`text-2xl p-2 rounded-full ${item.type === 'income' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <span className={`font-bold ${item.type === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                          {item.type === 'income' ? '+' : '-'}{item.points}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">暂无记录</div>
                  )}

                  {/* Pagination */}
                  {Math.ceil(ledgerTotal / ledgerLimit) > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button 
                        onClick={() => fetchLedger(ledgerPage - 1)}
                        disabled={ledgerPage === 1}
                        variant="secondary"
                        size="sm"
                        className="h-8 px-3 py-1 rounded-lg"
                      >
                        上一页
                      </Button>
                      <span className="px-3 py-1 text-gray-600">{ledgerPage} / {Math.ceil(ledgerTotal / ledgerLimit)}</span>
                      <Button 
                        onClick={() => fetchLedger(ledgerPage + 1)}
                        disabled={ledgerPage === Math.ceil(ledgerTotal / ledgerLimit)}
                        variant="secondary"
                        size="sm"
                        className="h-8 px-3 py-1 rounded-lg"
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      <nav className="nav-bar">
        <Button
          onClick={() => {
            setActiveTab('tasks');
            router.push(`/child/${currentChild?.id}/tasks`);
          }}
          variant="ghost"
          className={`nav-item ${activeTab === 'tasks' ? 'active' : ''} flex-col h-auto p-2`}
        >
          <Star size={24} />
          <span className="text-xs">任务</span>
        </Button>
        <Button
          onClick={() => {
            setActiveTab('store');
            router.push(`/child/${currentChild?.id}/store`);
          }}
          variant="ghost"
          className={`nav-item ${activeTab === 'store' ? 'active' : ''} flex-col h-auto p-2`}
        >
          <Gift size={24} />
          <span className="text-xs">商城</span>
        </Button>
        <Button
          onClick={() => {
            setActiveTab('wallet');
            router.push(`/child/${currentChild?.id}/wallet`);
          }}
          variant="ghost"
          className={`nav-item ${activeTab === 'wallet' ? 'active' : ''} flex-col h-auto p-2`}
        >
          <Wallet size={24} />
          <span className="text-xs">钱包</span>
        </Button>
      </nav>
    </div>
  );
}

function PinVerification({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  const { switchToParent } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('请输入4位PIN码');
      return;
    }
    const success = await switchToParent(pin);
    if (success) {
      onVerified();
    } else {
      setError('PIN码错误');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-6 md:p-8 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔐</div>
          <h2 className="text-xl font-bold text-gray-800">家长验证</h2>
          <p className="text-gray-600">请输入4位PIN码</p>
        </div>

        <div className="flex gap-2 justify-center mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold border-2 border-gray-200">
              {pin[i] || ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              onClick={() => pin.length < 4 && setPin(pin + num.toString())}
              variant="ghost"
              className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200 p-0 shadow-none"
            >
              {num}
            </Button>
          ))}
          <Button
            onClick={() => setPin(pin.slice(0, -1))}
            variant="ghost"
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 p-0 shadow-none"
          >
            删除
          </Button>
          <Button
            onClick={() => pin.length < 4 && setPin(pin + '0')}
            variant="ghost"
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200 p-0 shadow-none"
          >
            0
          </Button>
          <Button
            onClick={() => setPin('')}
            variant="ghost"
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 p-0 shadow-none"
          >
            清空
          </Button>
        </div>

        {error && <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-center mb-4">{error}</div>}

        <Button onClick={handleSubmit} variant="primary" fullWidth className="mb-3">确认</Button>
        <Button onClick={onCancel} variant="ghost" fullWidth className="text-gray-500">取消</Button>
      </div>
    </div>
  );
}
