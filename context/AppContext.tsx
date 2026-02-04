'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  phone: string;
  pin: string;
}

interface ChildProfile {
  id: string;
  nickname: string;
  avatar: string;
  availablePoints: number;
  totalPoints: number;
}

interface AppContextType {
  currentUser: User | null;
  currentChild: ChildProfile | null;
  childList: ChildProfile[];
  mode: 'parent' | 'child';
  login: (phone: string, pin: string) => Promise<boolean>;
  loginWithChild: (phone: string, pin: string, childId: string) => Promise<boolean>;
  logout: () => void;
  switchToChild: (child: ChildProfile) => void;
  switchToParent: () => Promise<boolean>;
  addChild: (nickname: string) => Promise<void>;
  refreshChildren: () => Promise<void>;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentChild, setCurrentChild] = useState<ChildProfile | null>(null);
  const [childList, setChildList] = useState<ChildProfile[]>([]);
  const [mode, setMode] = useState<'parent' | 'child'>('parent');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('little_achievers_user');
      const savedChild = localStorage.getItem('little_achievers_current_child');
      const savedMode = localStorage.getItem('little_achievers_mode');

      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('little_achievers_user');
        }
      }

      if (savedChild) {
        try {
          setCurrentChild(JSON.parse(savedChild));
        } catch (e) {
          localStorage.removeItem('little_achievers_current_child');
        }
      }

      if (savedMode && (savedMode === 'parent' || savedMode === 'child')) {
        setMode(savedMode);
      }

      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      if (currentUser) {
        localStorage.setItem('little_achievers_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('little_achievers_user');
      }

      if (currentChild) {
        localStorage.setItem('little_achievers_current_child', JSON.stringify(currentChild));
      } else {
        localStorage.removeItem('little_achievers_current_child');
      }

      localStorage.setItem('little_achievers_mode', mode);
    }
  }, [currentUser, currentChild, mode, isLoaded]);

  const login = async (phone: string, pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, action: 'login' }),
      });
      const data = await res.json();
      if (data.success) {
        const user = { id: data.user.id, phone: data.user.phone, pin: data.user.pin };
        setCurrentUser(user);
        setChildList(data.children);
        setMode('parent');
        setCurrentChild(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithChild = async (phone: string, pin: string, childId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, action: 'login' }),
      });
      const data = await res.json();
      if (data.success) {
        const user = { id: data.user.id, phone: data.user.phone, pin: data.user.pin };
        const child = data.children.find((c: any) => c.id === childId);
        if (child) {
          setCurrentUser(user);
          setChildList(data.children);
          setCurrentChild(child);
          setMode('child');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentChild(null);
    setChildList([]);
    setMode('parent');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('little_achievers_user');
      localStorage.removeItem('little_achievers_current_child');
      localStorage.removeItem('little_achievers_mode');
    }
  };

  const switchToChild = (child: ChildProfile) => {
    setCurrentChild(child);
    setMode('child');
  };

  const switchToParent = async (): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, pin: currentUser.pin, action: 'verify-pin' }),
      });
      const data = await res.json();
      if (data.success) {
        setMode('parent');
        setCurrentChild(null);
        setChildList(data.children);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Switch to parent error:', error);
      return false;
    }
  };

  const addChild = async (nickname: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, pin: currentUser.pin, action: 'add-child', childId: nickname }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshChildren();
      }
    } catch (error) {
      console.error('Add child error:', error);
    }
  };

  const refreshChildren = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, pin: currentUser.pin, action: 'login' }),
      });
      const data = await res.json();
      if (data.success) {
        setChildList(data.children);
      }
    } catch (error) {
      console.error('Refresh children error:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentChild,
        childList,
        mode,
        login,
        loginWithChild,
        logout,
        switchToChild,
        switchToParent,
        addChild,
        refreshChildren,
        isLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
