'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Input, PasswordInput } from '@/components/ui';

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }

    const result = await login(username, password);
    if (result.success) {
      if (isRegister) {
        setShowAddChild(true);
      }
    } else {
      setError(result.message || '登录失败：账号不存在或密码错误');
    }
  };


  return (
    <div className="login-container">
      <div className="card-child w-full max-w-md" style={{ position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-8">
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌟</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>小小奋斗者</h1>
          <p style={{ color: 'var(--primary)', fontSize: '14px' }}>Little Achievers</p>
        </div>

        {!showAddChild ? (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Input
                  label="账号"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                />
              </div>

              <div>
                <PasswordInput
                  label="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '8px 16px', borderRadius: '12px', textAlign: 'center', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" style={{ marginTop: '8px' }}>
                {isRegister ? '注册并登录' : '登录'}
              </Button>
            </form>

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
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>欢迎加入！</h2>
              <p style={{ color: 'var(--primary)', fontSize: '14px' }}>为孩子创建档案吧</p>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>孩子昵称</label>
              <input type="text" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} className="input" placeholder="请输入孩子昵称" />
            </div>

            <Button
              type="button"
              onClick={() => window.location.href = '/parent/home'}
              variant="secondary"
              fullWidth
              style={{ color: 'var(--primary)', fontWeight: '500', marginTop: '16px', fontSize: '14px' }}
              className="border-none bg-transparent shadow-none"
            >
              跳过
            </Button>
          </>
        )}
      </div>
    </div>
  );
}