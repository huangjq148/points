'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Home, Gift, Wallet, Lock, Star, CheckCircle, 
  Circle, Trophy, Sparkles, ChevronRight, Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Task {
  _id: string;
  name: string;
  icon: string;
  points: number;
  type: string;
  status: string;
  requirePhoto: boolean;
  photoUrl?: string;
  rejectionReason?: string;
}

interface Reward {
  _id: string;
  name: string;
  icon: string;
  points: number;
  type: string;
  stock: number;
}

export default function ChildDashboard() {
  const { currentUser, currentChild, switchToParent } = useApp();
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'store' | 'wallet'>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentChild) {
      fetchTasks();
      fetchRewards();
    }
  }, [currentChild]);

  const fetchTasks = async () => {
    const res = await fetch(`/api/tasks?childId=${currentChild?.id}`);
    const data = await res.json();
    if (data.success) {
      setTasks(data.tasks);
    }
  };

  const fetchRewards = async () => {
    const res = await fetch(`/api/rewards?isActive=true`);
    const data = await res.json();
    if (data.success) {
      setRewards(data.rewards);
    }
  };

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
      fetchTasks();
      fetchRewards();
    } else {
      setMessage(data.message);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div className="min-h-screen child-theme pb-24 md:pb-8">
      {showPinModal && (
        <PinVerification
          onVerified={() => setShowPinModal(false)}
          onCancel={() => setShowPinModal(false)}
        />
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
              <button
                onClick={() => { setShowSubmitModal(false); setPhotoPreview(''); }}
                className="flex-1 py-3 text-gray-600"
              >
                取消
              </button>
              <button onClick={handleSubmitTask} className="flex-1 btn-child">
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowPinModal(true)}
            className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm"
          >
            <Lock size={20} className="text-blue-600" />
          </button>
          <div>
            <p className="text-sm text-blue-700 hidden md:block">切换到家长</p>
          </div>
        </div>
        <div className="points-display-child">
          🪙 {currentChild?.availablePoints || 0}
        </div>
      </header>

      <main className="px-6 pt-2 md:max-w-4xl md:mx-auto">
        {activeTab === 'home' && (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl md:text-8xl mb-2">{currentChild?.avatar}</div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">{currentChild?.nickname}</h1>
              <p className="text-blue-600">小小奋斗者 🌟</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                onClick={() => setActiveTab('tasks')}
                className="card-child cursor-pointer hover:scale-105 transition"
              >
                <div className="text-4xl md:text-5xl mb-2">📋</div>
                <p className="font-bold text-blue-700">任务大厅</p>
                <p className="text-sm text-blue-600">{pendingTasks.length} 个待完成</p>
              </div>
              <div
                onClick={() => setActiveTab('store')}
                className="card-child cursor-pointer hover:scale-105 transition"
              >
                <div className="text-4xl md:text-5xl mb-2">🎁</div>
                <p className="font-bold text-blue-700">积分商城</p>
                <p className="text-sm text-blue-600">{rewards.length} 个奖励</p>
              </div>
            </div>

            <div className="card-child mb-4">
              <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                <Trophy size={20} /> 我的成就
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl">⭐</div>
                  <p className="text-sm text-blue-600">总任务</p>
                  <p className="font-bold text-blue-700">{tasks.length}</p>
                </div>
                <div>
                  <div className="text-2xl">✅</div>
                  <p className="text-sm text-blue-600">已完成</p>
                  <p className="font-bold text-blue-700">{tasks.filter(t => t.status === 'approved').length}</p>
                </div>
                <div>
                  <div className="text-2xl">🪙</div>
                  <p className="text-sm text-blue-600">总积分</p>
                  <p className="font-bold text-blue-700">{currentChild?.totalPoints || 0}</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('wallet')}
              className="card-child cursor-pointer hover:scale-105 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💰</div>
                  <div>
                    <p className="font-bold text-blue-700">积分账本</p>
                    <p className="text-sm text-blue-600">查看收支记录</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-blue-500" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4">任务大厅</h2>

            <div className="space-y-3">
              {tasks.filter(t => t.status === 'pending').map((task) => (
                <div key={task._id} className="task-card">
                  <div className="task-icon">{task.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{task.name}</p>
                    <p className="text-sm text-yellow-600">+{task.points} 积分</p>
                  </div>
                  <button
                    onClick={() => { setSelectedTask(task); setShowSubmitModal(true); }}
                    className="btn-child py-2 px-4 text-sm"
                  >
                    完成
                  </button>
                </div>
              ))}
              
              {tasks.filter(t => t.status === 'pending').length === 0 && (
                <div className="text-center py-12 text-blue-600">
                  <Sparkles size={48} className="mx-auto mb-2 opacity-50" />
                  <p>暂时没有任务啦！</p>
                  <p className="text-sm">可以让家长添加新任务~</p>
                </div>
              )}
            </div>

            {tasks.filter(t => ['submitted', 'approved', 'rejected'].includes(t.status)).length > 0 && (
              <>
                <h3 className="font-bold text-blue-700 mt-6 mb-3">我的记录</h3>
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'submitted').map((task) => (
                    <div key={task._id} className="task-card opacity-75">
                      <div className="task-icon">{task.icon}</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{task.name}</p>
                        <p className="text-sm text-yellow-600">+{task.points} 积分</p>
                      </div>
                      <span className="status-badge status-submitted">
                        审核中
                      </span>
                    </div>
                  ))}

                  {tasks.filter(t => t.status === 'approved').map((task) => (
                    <div key={task._id} className="task-card">
                      <div className="task-icon bg-blue-100">✅</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{task.name}</p>
                        <p className="text-sm text-blue-600">+{task.points} 积分</p>
                      </div>
                      <span className="status-badge status-approved">
                        已通过
                      </span>
                    </div>
                  ))}

                  {tasks.filter(t => t.status === 'rejected').map((task) => (
                    <div key={task._id} className="task-card">
                      <div className="task-icon bg-red-100">❌</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{task.name}</p>
                        <p className="text-sm text-yellow-600">+{task.points} 积分</p>
                        <p className="text-xs text-red-500">驳回原因: {task.rejectionReason || '需要改进'}</p>
                      </div>
                      <button
                        onClick={() => handleRedoTask(task)}
                        className="btn-primary py-2 px-4 text-sm"
                      >
                        重新提交
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'store' && (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4">积分商城</h2>
            <div className="grid grid-cols-2 gap-4">
              {rewards.map((reward) => (
                <div key={reward._id} className="reward-card flex-col text-center">
                  <div className="reward-icon mx-auto mb-3">{reward.icon}</div>
                  <p className="font-bold text-gray-800">{reward.name}</p>
                  <p className="text-lg text-yellow-600 font-bold my-2">🪙 {reward.points}</p>
                  <p className="text-xs text-gray-500 mb-3">{reward.type === 'physical' ? '实物奖励' : '特权奖励'}</p>
                  <button
                    onClick={() => handleRedeemReward(reward)}
                    className="btn-child py-2 px-4 text-sm w-full"
                  >
                    兑换
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'wallet' && (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-blue-700 mb-4">积分账本</h2>
            <div className="card-child mb-4">
              <div className="text-center">
                <p className="text-blue-600 mb-2">当前余额</p>
                <div className="text-4xl font-bold text-blue-700">🪙 {currentChild?.availablePoints || 0}</div>
              </div>
            </div>
            <div className="space-y-3">
              {tasks.filter(t => t.status === 'approved').map((task) => (
                <div key={task._id} className="card-parent flex items-center gap-3">
                  <div className="text-2xl">💰</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{task.name}</p>
                    <p className="text-xs text-gray-500">获得积分</p>
                  </div>
                  <span className="text-blue-600 font-bold">+{task.points}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <nav className="nav-bar">
        <button onClick={() => setActiveTab('home')} className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}>
          <Home size={24} />
          <span className="text-xs">首页</span>
        </button>
        <button onClick={() => setActiveTab('tasks')} className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}>
          <Star size={24} />
          <span className="text-xs">任务</span>
        </button>
        <button onClick={() => setActiveTab('store')} className={`nav-item ${activeTab === 'store' ? 'active' : ''}`}>
          <Gift size={24} />
          <span className="text-xs">商城</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`}>
          <Wallet size={24} />
          <span className="text-xs">钱包</span>
        </button>
      </nav>
    </div>
  );
}

function PinVerification({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  const { switchToParent } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    const success = await switchToParent();
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
            <button
              key={num}
              onClick={() => pin.length < 4 && setPin(pin + num.toString())}
              className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            删除
          </button>
          <button
            onClick={() => pin.length < 4 && setPin(pin + '0')}
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200"
          >
            0
          </button>
          <button
            onClick={() => setPin('')}
            className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            清空
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-center mb-4">{error}</div>}

        <button onClick={handleSubmit} className="btn-child w-full mb-3">确认</button>
        <button onClick={onCancel} className="w-full py-3 text-gray-500">取消</button>
      </div>
    </div>
  );
}
