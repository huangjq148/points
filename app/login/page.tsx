'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Input, PasswordInput } from '@/components/ui';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { applyDocumentTheme, resolvePreferredTheme, setThemeStorage, type ThemeMode } from '@/lib/theme';

type LoginMode = 'parent' | 'child';

export default function Login() {
  const { login } = useApp();
  const [mode, setMode] = useState<LoginMode>('parent');
  const [theme, setTheme] = useState<ThemeMode>(() => resolvePreferredTheme('parent'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setThemeStorage(mode, theme);
    applyDocumentTheme(theme);
  }, [mode, theme]);

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
  const isDark = theme === 'dark';
  const switchMode = (nextMode: LoginMode) => {
    const nextTheme = resolvePreferredTheme(nextMode);
    setMode(nextMode);
    setTheme(nextTheme);
    applyDocumentTheme(nextTheme);
    setError('');
  };

  const inactiveToggleStyle = isDark
    ? {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        color: '#e2e8f0',
        borderColor: 'rgba(71, 85, 105, 0.84)',
        boxShadow: '0 8px 18px rgba(2, 6, 23, 0.34)',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: '#334155',
        borderColor: 'rgba(148, 163, 184, 0.32)',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
      };

  const parentButtonStyle =
    mode === 'parent'
      ? {
          backgroundColor: '#1d4ed8',
          color: '#ffffff',
          borderColor: '#1d4ed8',
          boxShadow: isDark ? '0 12px 26px rgba(37, 99, 235, 0.4)' : '0 12px 26px rgba(29, 78, 216, 0.26)',
        }
      : inactiveToggleStyle;

  const childButtonStyle =
    mode === 'child'
      ? {
          backgroundColor: '#047857',
          color: '#ffffff',
          borderColor: '#047857',
          boxShadow: isDark ? '0 12px 26px rgba(4, 120, 87, 0.34)' : '0 12px 26px rgba(4, 120, 87, 0.24)',
        }
      : inactiveToggleStyle;

  const switcherStyle = isDark
    ? {
        background: 'rgba(15, 23, 42, 0.78)',
        border: '1px solid rgba(71, 85, 105, 0.8)',
      }
    : {
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(191, 219, 254, 0.18)',
      };

  const infoBoxStyle = isDark
    ? {
        background: mode === 'child' ? 'rgba(6, 95, 70, 0.28)' : 'rgba(30, 64, 175, 0.22)',
        color: mode === 'child' ? '#a7f3d0' : '#bfdbfe',
        border: '1px solid rgba(71, 85, 105, 0.8)',
      }
    : {
        background: mode === 'child' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        color: mode === 'child' ? '#047857' : '#1d4ed8',
        border: '1px solid rgba(191, 219, 254, 0.2)',
      };

  const cardHeaderColor = isDark ? '#f8fafc' : 'var(--text-primary)';
  const cardSubheaderColor = isDark ? '#93c5fd' : 'var(--primary)';
  const titleHintColor = isDark ? '#e2e8f0' : 'var(--text-primary)';
  const titleHintBodyColor = isDark ? '#93c5fd' : (mode === 'child' ? '#047857' : '#1d4ed8');
  const registerPanelStyle = isDark
    ? {
        background: 'rgba(146, 64, 14, 0.18)',
        border: '1px solid rgba(251, 191, 36, 0.22)',
      }
    : {
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(253, 230, 138, 0.3)',
      };
  const registerTextColor = isDark ? '#fcd34d' : '#b45309';
  const registerLabelColor = isDark ? '#f8fafc' : 'var(--primary)';
  const childHintPanelStyle = isDark
    ? {
        background: 'rgba(6, 95, 70, 0.18)',
        border: '1px solid rgba(52, 211, 153, 0.18)',
      }
    : {
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(167, 243, 208, 0.2)',
      };
  const childHintTextColor = isDark ? '#a7f3d0' : '#047857';

  return (
    <div className={`login-container ${isDark ? 'login-theme-dark' : 'login-theme-light'}`}>
      <div className="card-child w-full max-w-md" style={{ position: 'relative', zIndex: 'var(--z-login-card)' }}>
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
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

        <div className="text-center mb-6">
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌟</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: cardHeaderColor, marginBottom: '8px' }}>小小奋斗者</h1>
          <p style={{ color: cardSubheaderColor, fontSize: '14px' }}>Little Achievers</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px', padding: '6px', borderRadius: '18px', ...switcherStyle }}>
          <Button
            type="button"
            onClick={() => switchMode('parent')}
            variant={mode === 'parent' ? 'primary' : 'secondary'}
            fullWidth
            style={parentButtonStyle}
          >
            家长登录
          </Button>
          <Button
            type="button"
            onClick={() => switchMode('child')}
            variant={mode === 'child' ? 'primary' : 'secondary'}
            fullWidth
            style={childButtonStyle}
          >
            孩子登录
          </Button>
        </div>

        <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.5, ...infoBoxStyle }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: titleHintColor }}>{title}</div>
          <div style={{ color: titleHintBodyColor }}>{subtitle}</div>
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
            <div
              style={{
                background: isDark ? 'rgba(127, 29, 29, 0.34)' : 'rgba(239, 68, 68, 0.1)',
                color: isDark ? '#fecaca' : '#dc2626',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
                fontSize: '14px',
                border: isDark ? '1px solid rgba(248, 113, 113, 0.22)' : '1px solid rgba(252, 165, 165, 0.2)',
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            style={{
              marginTop: '8px',
              background: isDark ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: '#ffffff',
              borderColor: isDark ? '#60a5fa' : '#1d4ed8',
              boxShadow: isDark ? '0 16px 32px rgba(37, 99, 235, 0.34)' : '0 16px 32px rgba(29, 78, 216, 0.28)',
            }}
            disabled={loading}
          >
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
                style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: '500', fontSize: '14px' }}
                className="border-none bg-transparent shadow-none"
              >
                {isRegister ? '已有账号？去登录' : '新用户？点击注册'}
              </Button>
            </div>

            {isRegister && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: registerPanelStyle.background,
                  borderRadius: '16px',
                  textAlign: 'center',
                  border: registerPanelStyle.border,
                }}
              >
                <p style={{ color: registerTextColor, fontSize: '14px' }}>
                  💡 首次登录将自动注册
                </p>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', color: registerLabelColor, fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>孩子昵称</label>
                  <input type="text" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} className="input" placeholder="请输入孩子昵称" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: '24px', padding: '16px', background: childHintPanelStyle.background, borderRadius: '16px', textAlign: 'center', border: childHintPanelStyle.border }}>
            <p style={{ color: childHintTextColor, fontSize: '14px' }}>
              💡 孩子账号不支持注册，请使用家长创建好的孩子账号登录
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
