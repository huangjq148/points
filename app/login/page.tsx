'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Input, PasswordInput } from '@/components/ui';

type LoginMode = 'parent' | 'child';

export default function Login() {
  const { login } = useApp();
  const [mode, setMode] = useState<LoginMode>('parent');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.message || '登录失败：账号不存在或密码错误');
      return;
    }

    if (mode === 'parent' && isRegister) {
      // 保留原有家长注册流程的视觉引导，实际创建逻辑仍沿用登录后进入创建孩子页面。
      setNewChildName('');
    }
  };

  const title = mode === 'child' ? '孩子登录' : '家长登录';
  const subtitle = mode === 'child' ? '输入孩子账号后即可直接进入孩子空间' : '家长账号可管理家庭与孩子';

  return (
    <div className="login-container">
      <div className="card-child w-full max-w-md" style={{ position: 'relative', zIndex: 'var(--z-login-card)' }}>
        <div className="text-center mb-6">
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌟</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>小小奋斗者</h1>
          <p style={{ color: 'var(--primary)', fontSize: '14px' }}>Little Achievers</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px', background: 'rgba(59, 130, 246, 0.08)', padding: '6px', borderRadius: '18px' }}>
          <Button
            type="button"
            onClick={() => {
              setMode('parent');
              setError('');
            }}
            variant={mode === 'parent' ? 'primary' : 'secondary'}
            fullWidth
          >
            家长登录
          </Button>
          <Button
            type="button"
            onClick={() => {
              setMode('child');
              setError('');
            }}
            variant={mode === 'child' ? 'primary' : 'secondary'}
            fullWidth
          >
            孩子登录
          </Button>
        </div>

        <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '16px', background: mode === 'child' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: mode === 'child' ? '#047857' : '#1d4ed8', fontSize: '14px', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{title}</div>
          <div>{subtitle}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Input
              label="账号"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'child' ? '请输入孩子账号' : '请输入家长账号'}
            />
          </div>

          <div>
            <PasswordInput
              label="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'child' ? '请输入孩子密码' : '请输入家长密码'}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '8px 16px', borderRadius: '12px', textAlign: 'center', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? '登录中...' : mode === 'child' ? '孩子登录' : isRegister ? '注册并登录' : '登录'}
          </Button>
        </form>

        {mode === 'parent' ? (
          <>
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                variant="secondary"
                style={{ color: 'var(--primary)', fontWeight: '500', fontSize: '14px' }}
                className="border-none bg-transparent shadow-none"
              >
                {isRegister ? '已有账号？去登录' : '新用户？点击注册'}
              </Button>
            </div>

            {isRegister && (
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#b45309', fontSize: '14px' }}>
                  💡 首次登录将自动注册
                </p>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>孩子昵称</label>
                  <input type="text" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} className="input" placeholder="请输入孩子昵称" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '16px', textAlign: 'center' }}>
            <p style={{ color: '#047857', fontSize: '14px' }}>
              💡 孩子账号不支持注册，请使用家长创建好的孩子账号登录
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
