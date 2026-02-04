'use client';

import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(24px)',
        borderRadius: '32px',
        padding: '48px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌟</div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a5f' }}>小小奋斗者</h1>
        <p style={{ color: '#3b82f6', marginTop: '8px' }}>加载中...</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { currentUser, currentChild, mode, isLoaded } = useApp();
  const [mounted, setMounted] = useState(false);
  const [components, setComponents] = useState<{
    Login: any;
    ParentDashboard: any;
    ChildDashboard: any;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      import('@/components/Login'),
      import('@/components/ParentDashboard'),
      import('@/components/ChildDashboard')
    ]).then(([loginMod, parentMod, childMod]) => {
      setComponents({
        Login: loginMod.default,
        ParentDashboard: parentMod.default,
        ChildDashboard: childMod.default
      });
    }).catch(console.error);
  }, []);

  if (!mounted || !components || !isLoaded) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <components.Login />;
  }

  if (mode === 'child' && currentChild) {
    return <components.ChildDashboard />;
  }

  return <components.ParentDashboard />;
}
