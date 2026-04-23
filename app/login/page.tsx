'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Input, PasswordInput } from '@/components/ui';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { applyDocumentTheme, resolvePreferredTheme, setThemeStorage, type ThemeMode } from '@/lib/theme';

export default function Login() {
  const { login } = useApp();
  const [theme, setTheme] = useState<ThemeMode>(() => resolvePreferredTheme('parent'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setThemeStorage('parent', theme);
    applyDocumentTheme(theme);
  }, [theme]);

  const isDark = theme === 'dark';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    const result = await login(trimmedUsername, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message || '登录失败：账号不存在或密码错误');
    }
  };

  const brandPanel = (
    <div
      className="login-brand-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '40px 32px',
        background: isDark
          ? 'linear-gradient(160deg, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.88) 100%)'
          : 'linear-gradient(160deg, rgba(219, 234, 254, 0.96) 0%, rgba(239, 246, 255, 0.92) 100%)',
        borderRight: isDark ? '1px solid rgba(71, 85, 105, 0.64)' : '1px solid rgba(191, 219, 254, 0.9)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.32em',
            color: isDark ? '#93c5fd' : '#1d4ed8',
          }}
        >
          LITTLE ACHIEVERS
        </p>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '48px',
              lineHeight: 1,
              fontWeight: 800,
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            小小奋斗者
          </h1>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '16px',
              color: isDark ? '#cbd5e1' : '#334155',
            }}
          >
            Little Achievers
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <span
          style={{
            borderRadius: '999px',
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#dbeafe' : '#1e3a8a',
            background: isDark ? 'rgba(30, 64, 175, 0.3)' : 'rgba(191, 219, 254, 0.72)',
            border: isDark ? '1px solid rgba(96, 165, 250, 0.24)' : '1px solid rgba(96, 165, 250, 0.18)',
          }}
        >
          首次家长登录自动注册
        </span>
        <span
          style={{
            borderRadius: '999px',
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#ccfbf1' : '#0f766e',
            background: isDark ? 'rgba(13, 148, 136, 0.24)' : 'rgba(204, 251, 241, 0.78)',
            border: isDark ? '1px solid rgba(45, 212, 191, 0.22)' : '1px solid rgba(45, 212, 191, 0.2)',
          }}
        >
          孩子账号由家长创建
        </span>
      </div>
    </div>
  );

  const formPanel = (
    <div
      className="login-form-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '40px 32px',
        background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.88)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme(isDark ? 'light' : 'dark')}
          variant="pill"
          className="border-none shadow-none"
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.9)',
            color: isDark ? '#e2e8f0' : '#334155',
            borderColor: isDark ? 'rgba(71, 85, 105, 0.84)' : 'rgba(226, 232, 240, 0.92)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 800,
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
        >
          欢迎登录
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.6,
            color: isDark ? '#cbd5e1' : '#475569',
          }}
        >
          账号统一登录，系统会自动进入对应身份页面
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="账号"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="请输入账号"
        />

        <PasswordInput
          label="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
        />

        {error && (
          <div
            style={{
              borderRadius: '16px',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: 1.5,
              color: isDark ? '#fecaca' : '#dc2626',
              background: isDark ? 'rgba(127, 29, 29, 0.34)' : 'rgba(254, 226, 226, 0.86)',
              border: isDark ? '1px solid rgba(248, 113, 113, 0.22)' : '1px solid rgba(252, 165, 165, 0.32)',
            }}
          >
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </Button>
      </form>
    </div>
  );

  return (
    <div className={`login-container ${isDark ? 'login-theme-dark' : 'login-theme-light'}`}>
      <div
        className="login-shell"
        style={{
          position: 'relative',
          zIndex: 'var(--z-login-card)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.08fr) minmax(0, 0.92fr)',
          width: '100%',
          maxWidth: '1120px',
          overflow: 'hidden',
          borderRadius: '32px',
          border: isDark ? '1px solid rgba(71, 85, 105, 0.82)' : '1px solid rgba(191, 219, 254, 0.72)',
          background: isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.82)',
          boxShadow: isDark ? '0 28px 80px rgba(2, 6, 23, 0.44)' : '0 28px 80px rgba(37, 99, 235, 0.16)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {brandPanel}
        {formPanel}
      </div>
    </div>
  );
}
