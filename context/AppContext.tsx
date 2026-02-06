"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: string;
  username: string;
  password: string;
  role?: string;
  inviteCode?: string;
  familyId?: string;
  pin?: string;
  children?: ChildProfile[];
  token?: string;
}

export interface ChildProfile {
  id: string;
  nickname: string;
  username?: string;
  avatar: string;
  availablePoints: number;
  totalPoints: number;
}

export interface AppContextType {
  currentUser: User | null;
  currentChild: ChildProfile | null;
  childList: ChildProfile[];
  mode: "parent" | "child";
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithChild: (username: string, password: string, childId: string) => Promise<boolean>;
  logout: () => void;
  switchToChild: (child: ChildProfile) => void;
  switchToParent: (password?: string) => Promise<boolean>;
  addChild: (nickname: string) => Promise<void>;
  refreshChildren: () => Promise<void>;
  updateChildPoints: (childId: string, newPoints: number) => void;
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
  const [currentChild, setCurrentChild] = useState<ChildProfile | null>(() => {
    if (typeof window !== "undefined") {
      const savedChild = localStorage.getItem("little_achievers_current_child");
      if (savedChild) {
        try {
          return JSON.parse(savedChild);
        } catch (error: unknown) {
          localStorage.removeItem("little_achievers_current_child");
        }
      }
    }
    return null;
  });
  const [childList, setChildList] = useState<ChildProfile[]>([]);
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
    setCurrentChild(null);
    setChildList([]);
    setMode("parent");
    if (typeof window !== "undefined") {
      localStorage.removeItem("little_achievers_user");
      localStorage.removeItem("little_achievers_current_child");
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

      if (currentChild) {
        localStorage.setItem("little_achievers_current_child", JSON.stringify(currentChild));
      } else {
        localStorage.removeItem("little_achievers_current_child");
      }

      localStorage.setItem("little_achievers_mode", mode);
    }
  }, [currentUser, currentChild, mode]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, action: "login" }),
      });
      const data = await res.json();
      if (data.success) {
        // First set basic user info from login response
        let user: User = {
          id: data.user.id,
          username: data.user.username,
          password: password,
          role: data.user.role,
          inviteCode: data.user.inviteCode,
          familyId: data.user.familyId,
          children: data.children || [],
          token: data.token,
        };

        // Then fetch detailed info from /api/auth/current
        try {
          const headers: Record<string, string> = {};
          if (data.token) {
            headers["Authorization"] = `Bearer ${data.token}`;
          }

          const currentRes = await fetch(`/api/auth/current`, {
            headers,
          });
          const currentData = await currentRes.json();
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
        setChildList(user.children || []);

        if (typeof window !== "undefined") {
          localStorage.setItem("little_achievers_user", JSON.stringify(user));
        }

        if (user.role === "child") {
          setMode("child");
          if (typeof window !== "undefined") {
            localStorage.setItem("little_achievers_mode", "child");
          }
          if (user.id) {
            const childProfile: ChildProfile = {
              id: user.id,
              nickname: user.username,
              avatar: "🦊",
              availablePoints: 0,
              totalPoints: 0,
            };
            setCurrentChild(childProfile);
            if (typeof window !== "undefined") {
              localStorage.setItem("little_achievers_current_child", JSON.stringify(childProfile));
              window.location.href = `/child/${user.id}`;
            }
          }
        } else {
          setMode("parent");
          setCurrentChild(null);
          if (typeof window !== "undefined") {
            localStorage.setItem("little_achievers_mode", "parent");
            localStorage.removeItem("little_achievers_current_child");
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

  const loginWithChild = async (username: string, password: string, childId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, action: "login" }),
      });
      const data = await res.json();
      if (data.success) {
        const user = {
          id: data.user.id,
          username: data.user.username,
          password: password,
          role: data.user.role,
          inviteCode: data.user.inviteCode,
          familyId: data.user.familyId,
          token: data.token,
        };
        const child = data.children.find((c: ChildProfile) => c.id === childId);
        if (child) {
          setCurrentUser(user);
          setChildList(data.children);
          setCurrentChild(child);
          setMode("child");
          if (typeof window !== "undefined") {
            localStorage.setItem("little_achievers_user", JSON.stringify(user));
            localStorage.setItem("little_achievers_current_child", JSON.stringify(child));
            localStorage.setItem("little_achievers_mode", "child");
            window.location.href = `/child/${child.id}`;
          }
          return true;
        }
      }
      return false;
    } catch (_error: unknown) {
      console.error("Login error:", _error);
      return false;
    }
  };

  const switchToChild = (child: ChildProfile) => {
    setCurrentChild(child);
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
        setCurrentChild(null);
        setChildList(data.children);
        return true;
      }
      return false;
    } catch (_error: unknown) {
      console.error("Switch to parent error:", _error);
      return false;
    }
  };

  const addChild = async (nickname: string) => {
    if (!currentUser || !currentUser.token) return;
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          nickname,
          avatar: "🦊", // Default avatar
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshChildren();
      }
    } catch (_error) {
      console.error("Add child error:", _error);
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
        setChildList(data.user.children || []);
      }
    } catch (_error) {
      console.error("Refresh children error:", _error);
    }
  };

  useEffect(() => {
    // Removed redundant refreshChildren call
  }, []);

  const updateChildPoints = (childId: string, newPoints: number) => {
    setChildList((prevChildList) =>
      prevChildList.map((child) => (child.id === childId ? { ...child, availablePoints: newPoints } : child)),
    );
    if (currentChild && currentChild.id === childId) {
      setCurrentChild((prevCurrentChild) => {
        if (prevCurrentChild) {
          return { ...prevCurrentChild, availablePoints: newPoints };
        }
        return null;
      });
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
        updateChildPoints,
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
