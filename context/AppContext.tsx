"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import request from "@/utils/request";

export interface User {
  id: string;
  username: string;
  nickname?: string;
  gender?: 'boy' | 'girl' | 'none';
  password?: string;
  role: "parent" | "child" | "admin";
  inviteCode?: string;
  familyId?: string;
  avatar?: string;
  availablePoints?: number;
  totalPoints?: number;
  pendingCount?: number;
  submittedCount?: number;
  orderCount?: number;
  token?: string;
}

interface ChildAPIResponse {
  id?: string;
  _id?: string;
  username: string;
  nickname?: string;
  gender?: 'boy' | 'girl' | 'none';
  avatar?: string;
  availablePoints?: number;
  totalPoints?: number;
  pendingCount?: number;
  submittedCount?: number;
  orderCount?: number;
}

export interface AppContextType {
  currentUser: User | null;
  childList: User[];
  mode: "parent" | "child";
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchToChild: (child: User) => void;
  switchToParent: (password?: string) => Promise<boolean>;
  refreshChildren: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("little_achievers_user");
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (error: unknown) {
          localStorage.removeItem("little_achievers_user");
        }
      }
    }
    return null;
  });
  const [childList, setChildList] = useState<User[]>([]);
  const [mode, setMode] = useState<"parent" | "child">(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("little_achievers_mode");
      if (savedMode && (savedMode === "parent" || savedMode === "child")) {
        return savedMode;
      }
    }
    return "parent";
  });

  const logout = () => {
    setCurrentUser(null);
    setChildList([]);
    setMode("parent");
    if (typeof window !== "undefined") {
      localStorage.removeItem("little_achievers_user");
      localStorage.removeItem("little_achievers_mode");
    }
    window.location.href = "/";
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (typeof window === "undefined") return;

      const publicPaths = ["/", "/login"];
      const isPublicPath = publicPaths.includes(window.location.pathname);

      if (!currentUser?.token) {
        if (!isPublicPath) {
          window.location.href = "/login";
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/current", {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });

        if (res.status === 401) {
          logout();
          return;
        }

        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              ...data.user,
              token: prev.token, // Keep token
            };
          });
          setChildList(data.user.children || []);
        }
      } catch (error) {
        console.error("Token verification failed:", error);
      }
    };

    verifyToken();
  }, []); // Run once on mount

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (currentUser) {
        localStorage.setItem("little_achievers_user", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("little_achievers_user");
      }

      localStorage.setItem("little_achievers_mode", mode);
    }
  }, [currentUser, mode]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const data = await request("api/auth", {
        method: "POST",
        body: { username, password, action: "login" },
      })
      if (data.success) {
        // First set basic user info from login response
        let user: User = {
          id: data.user.id,
          username: data.user.username,
          password: password,
          role: data.user.role,
          inviteCode: data.user.inviteCode,
          familyId: data.user.familyId,
        };

        // Then fetch detailed info from /api/auth/current
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", data.token || "");
          }

          const currentData = await request("api/auth/current");
          if (currentData.success && currentData.user) {
            user = {
              ...user,
              ...currentData.user,
              password: password, // Keep password as it might not be returned
              token: data.token, // Ensure token is preserved
            };
          }
        } catch (e) {
          console.error("Fetch current user info failed", e);
        }

        setCurrentUser(user);

        // Map children to User objects
        const childrenAsUsers: User[] = (data.children || []).map((c: ChildAPIResponse) => ({
          id: c.id || c._id || "",
          username: c.username || "",
          nickname: c.nickname,
          gender: c.gender || 'none',
          role: "child",
          avatar: c.avatar,
          availablePoints: c.availablePoints,
          totalPoints: c.totalPoints,
          pendingCount: c.pendingCount,
          submittedCount: c.submittedCount,
          orderCount: c.orderCount,
        }));
        setChildList(childrenAsUsers);

        if (typeof window !== "undefined") {
          localStorage.setItem("little_achievers_user", JSON.stringify(user));
        }

        if (user.role === "child") {
          setMode("child");
          if (typeof window !== "undefined") {
            localStorage.setItem("little_achievers_mode", "child");
          }
          if (user.id) {
            if (typeof window !== "undefined") {
              window.location.href = `/child/task`;
            }
          }
        } else {
          setMode("parent");
          if (typeof window !== "undefined") {
            localStorage.setItem("little_achievers_mode", "parent");
            window.location.href = "/parent/home";
          }
        }
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (_error: unknown) {
      console.error("Login error:", _error);
      return { success: false, message: "System error" };
    }
  };


  const switchToChild = (child: User) => {
    setMode("child");
  };

  const switchToParent = async (password?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const verifyPassword = password || currentUser.password;
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, password: verifyPassword, action: "verify-password" }),
      });
      const data = await res.json();
      if (data.success) {
        setMode("parent");
        setChildList(data.children || []);
        return true;
      }
      return false;
    } catch (_error: unknown) {
      console.error("Switch to parent error:", _error);
      return false;
    }
  };

  const refreshChildren = async () => {
    if (!currentUser || !currentUser.token) return;
    try {
      const res = await fetch("/api/auth/current", {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setChildList(
          (data.user.children || []).map((c: ChildAPIResponse) => ({
            id: c.id || c._id || "",
            username: c.username || "",
            nickname: c.nickname,
            gender: c.gender || 'none',
            role: "child",
            avatar: c.avatar,
            availablePoints: c.availablePoints,
            totalPoints: c.totalPoints,
            pendingCount: c.pendingCount,
            submittedCount: c.submittedCount,
            orderCount: c.orderCount,
          })),
        );
      }
    } catch (_error) {
      console.error("Refresh children error:", _error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        childList,
        mode,
        login,
        logout,
        switchToChild,
        switchToParent,
        refreshChildren,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
