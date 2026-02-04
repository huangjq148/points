'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui';

export default function Login() {
  const { login, loginWithChild, addChild } = useApp();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginType, setLoginType] = useState<'parent' | 'child'>('parent');
  const [isRegister, setIsRegister] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [childList, setChildList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [error, setError] = useState('');

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN码必须是4位数字');
      return;
    }

    const success = await login(phone, pin);
    if (!success) {
      if (isRegister) {
        setShowAddChild(true);
      } else {
        setError('登录失败，请检查手机号和PIN码');
      }
    }
  };

  const handleChildLogin = async () => {
    if (!selectedChildId) {
      setError('请选择孩子');
      return;
    }

    if (phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN码必须是4位数字');
      return;
    }

    const success = await loginWithChild(phone, pin, selectedChildId);
    if (!success) {
      setError('登录失败，请检查手机号和PIN码');
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      setError('请输入孩子昵称');
      return;
    }
    await addChild(newChildName);
    setShowAddChild(false);
    setNewChildName('');
    setIsRegister(false);
    setError('注册成功！请用新账号登录');
  };

  const handleCheckChildLogin = async () => {
    if (phone.length !== 11 || pin.length !== 4) {
      setError('请先输入手机号和PIN码');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, action: 'login' }),
      });
      const data = await res.json();

      if (data.success && data.children.length > 0) {
        setChildList(data.children);
        setLoginType('child');
        if (data.children.length === 1) {
          setSelectedChildId(data.children[0].id);
        }
      } else if (data.success && data.children.length === 0) {
        setError('没有找到孩子档案，请先添加孩子');
      } else {
        setError('登录失败，请检查手机号和PIN码');
      }
    } catch (err) {
      setError('获取孩子列表失败');
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
            {!isRegister && (
              <div className="mb-6">
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' }}>选择登录方式</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setLoginType('parent')}
                    style={{
                      flex: 1,
                      padding: '16px',
                      borderRadius: '16px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: loginType === 'parent'
                        ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                        : 'rgba(107, 114, 128, 0.1)',
                      color: loginType === 'parent' ? 'white' : 'var(--text-secondary)',
                      boxShadow: loginType === 'parent' ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                  >
                    👨‍👩‍👧 家长登录
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckChildLogin}
                    style={{
                      flex: 1,
                      padding: '16px',
                      borderRadius: '16px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: loginType === 'child'
                        ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                        : 'rgba(107, 114, 128, 0.1)',
                      color: loginType === 'child' ? 'white' : 'var(--text-secondary)',
                      boxShadow: loginType === 'child' ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                  >
                    👶 孩子登录
                  </button>
                </div>
              </div>
            )}

            {loginType === 'child' && !isRegister && (
              <div className="mb-4">
                <label style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>选择孩子</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {childList.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => setSelectedChildId(child.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: selectedChildId === child.id
                          ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                          : 'rgba(59, 130, 246, 0.1)',
                        color: selectedChildId === child.id ? 'white' : 'var(--text-secondary)',
                        border: selectedChildId === child.id ? '2px solid var(--primary)' : '2px solid transparent'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{child.avatar}</span>
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{child.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleParentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="请输入手机号"
                  maxLength={11}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                  {loginType === 'child' ? '家长PIN码' : 'PIN码'}
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="input"
                  placeholder="请输入4位PIN码"
                  maxLength={4}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <Button
                type={loginType === 'child' ? 'button' : 'submit'}
                onClick={loginType === 'child' ? handleChildLogin : undefined}
                fullWidth
                size="lg"
                style={{ marginTop: '8px' }}
              >
                {isRegister ? '注册' : (loginType === 'child' ? '孩子登录' : '登录')}
              </Button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  if (isRegister) setLoginType('parent');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                {isRegister ? '已有账号？去登录' : '新用户？点击注册'}
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#b45309', fontSize: '14px' }}>
                💡 首次使用将自动注册账号
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>注册成功！</h2>
              <p style={{ color: 'var(--primary)', fontSize: '14px' }}>现在为孩子创建档案吧</p>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>孩子昵称</label>
              <input
                type="text"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                className="input"
                placeholder="请输入孩子昵称"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
                marginTop: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <Button
              onClick={handleAddChild}
              fullWidth
              size="lg"
              style={{ marginTop: '24px' }}
            >
              创建孩子档案
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowAddChild(false);
                setIsRegister(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: '500',
                marginTop: '16px',
                fontSize: '14px'
              }}
            >
              跳过，稍后添加
            </button>
          </>
        )}
      </div>
    </div>
  );
}
