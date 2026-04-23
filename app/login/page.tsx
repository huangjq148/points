"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppContext";
import { Button, Input, PasswordInput } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { applyDocumentTheme, resolvePreferredTheme, setThemeStorage, type ThemeMode } from "@/lib/theme";
import { ListTodo } from "lucide-react";

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
        <p className="login-brand-kicker">LITTLE ACHIEVERS</p>
        <div>
          <h1 className="login-brand-title">小小奋斗者</h1>
          <p className="login-brand-subtitle">Little Achievers</p>
        </div>
      </div>

      <div className="login-brand-icon-wrap">
        <ListTodo className="login-brand-icon" />
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

      <form onSubmit={handleSubmit} className="login-form">
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
          <div className="login-error" aria-live="polite">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
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
