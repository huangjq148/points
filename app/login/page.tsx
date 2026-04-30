"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppContext";
import { Button, Input, PasswordInput } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { applyDocumentTheme, resolvePreferredTheme, setThemeStorage, type ThemeMode } from "@/lib/theme";
import { ShieldCheck } from "lucide-react";

export default function Login() {
  const { login } = useApp();
  const [theme, setTheme] = useState<ThemeMode>(() => resolvePreferredTheme("parent"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setThemeStorage("parent", theme);
    applyDocumentTheme(theme);
  }, [theme]);

  const isDark = theme === "dark";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }

    setLoading(true);
    const result = await login(trimmedUsername, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "登录失败：账号不存在或密码错误");
    }
  };

  const brandPanel = (
    <div className="login-brand-panel">
      <div className="login-brand-copy">
        <p className="login-brand-kicker">家庭积分成长入口</p>
        <div>
          <h1 className="login-brand-title">小小奋斗者</h1>
          <p className="login-brand-subtitle">把日常任务、积分奖励和家庭约定放进一个清晰的成长系统。</p>
        </div>
      </div>

      <div className="login-hero-stage" aria-hidden="true">
        <svg
          className="login-growth-art"
          viewBox="0 0 560 300"
          width="100%"
          height="300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="loginRingGradient" x1="110" y1="52" x2="280" y2="230" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563eb" />
              <stop offset="0.62" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#14b8a6" />
            </linearGradient>
            <filter id="loginSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0f172a" floodOpacity="0.14" />
            </filter>
          </defs>

          <rect x="1" y="1" width="558" height="298" rx="28" fill="rgba(255,255,255,0.42)" stroke="rgba(148,163,184,0.22)" />
          <circle cx="184" cy="148" r="82" fill="none" stroke="rgba(219,234,254,0.92)" strokeWidth="28" />
          <path d="M184 66a82 82 0 1 1-68.7 126.7" fill="none" stroke="url(#loginRingGradient)" strokeWidth="28" strokeLinecap="round" />
          <circle cx="184" cy="148" r="52" fill="rgba(255,255,255,0.88)" />
          <text x="184" y="145" textAnchor="middle" fontSize="38" fontWeight="800" fill="#0f172a">82%</text>
          <text x="184" y="169" textAnchor="middle" fontSize="14" fontWeight="700" fill="#64748b">本周完成度</text>

          <g filter="url(#loginSoftShadow)">
            <rect x="28" y="34" width="124" height="44" rx="22" fill="white" />
            <circle cx="52" cy="56" r="14" fill="#dbeafe" />
            <path d="M46 56l4 4 8-9" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <text x="76" y="61" fontSize="15" fontWeight="700" fill="#334155">任务达成</text>
          </g>

          <g filter="url(#loginSoftShadow)">
            <rect x="250" y="136" width="118" height="42" rx="21" fill="white" />
            <circle cx="274" cy="157" r="14" fill="#fef3c7" />
            <text x="274" y="162" textAnchor="middle" fontSize="15" fontWeight="800" fill="#b45309">¢</text>
            <text x="298" y="162" fontSize="15" fontWeight="700" fill="#334155">积分累积</text>
          </g>

          <g filter="url(#loginSoftShadow)">
            <rect x="44" y="226" width="124" height="44" rx="22" fill="white" />
            <circle cx="68" cy="248" r="14" fill="#d1fae5" />
            <path d="M62 247h12v9H62zM61 243h14v5H61zM68 243v13M64 243c-5-6 4-9 4 0M72 243c5-6-4-9-4 0" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="92" y="253" fontSize="15" fontWeight="700" fill="#334155">奖励兑换</text>
          </g>

          <g filter="url(#loginSoftShadow)">
            <rect x="366" y="76" width="150" height="70" rx="18" fill="white" />
            <circle cx="392" cy="111" r="17" fill="#dbeafe" />
            <path d="M386 116h12M388 108h8M390 104h4M392 101v18" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" />
            <text x="424" y="104" fontSize="14" fontWeight="700" fill="#64748b">今日成长</text>
            <text x="424" y="127" fontSize="18" fontWeight="800" fill="#0f172a">+24 积分</text>
          </g>

          <g filter="url(#loginSoftShadow)">
            <rect x="366" y="168" width="150" height="70" rx="18" fill="white" />
            <circle cx="392" cy="203" r="17" fill="#ffe4e6" />
            <path d="M392 193l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="none" stroke="#be123c" strokeWidth="2.2" strokeLinejoin="round" />
            <text x="424" y="196" fontSize="14" fontWeight="700" fill="#64748b">奖励状态</text>
            <text x="424" y="219" fontSize="18" fontWeight="800" fill="#0f172a">2 个待确认</text>
          </g>
        </svg>
      </div>

      <div className="login-rule-chips">
        <span className="login-rule-chip login-rule-chip-primary">首次家长登录自动注册</span>
        <span className="login-rule-chip login-rule-chip-accent">孩子账号由家长创建</span>
      </div>
    </div>
  );

  const formPanel = (
    <div className="login-form-panel">
      <div className="login-form-topbar">
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme(isDark ? "light" : "dark")}
          variant="pill"
          className="login-theme-toggle"
        />
      </div>

      <div className="login-form-header">
        <h2 className="login-form-title">欢迎登录</h2>
        <p className="login-form-subtitle">账号统一登录，系统会自动进入对应身份页面</p>
      </div>

      <div className="login-form-assurance">
        <ShieldCheck size={18} />
        <span>首次家长登录会自动创建家庭账号，孩子账号由家长创建后登录。</span>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <Input
          label="账号"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="请输入账号"
          autoComplete="username"
        />

        <PasswordInput
          label="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          autoComplete="current-password"
        />

        {error && (
          <div className="login-error" aria-live="polite">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>
    </div>
  );

  return (
    <div className={`login-container ${isDark ? "login-theme-dark" : "login-theme-light"}`}>
      <div className="login-shell">
        {brandPanel}
        {formPanel}
      </div>
    </div>
  );
}
