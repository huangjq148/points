"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import request from "@/utils/request";

export interface User {
  id: string;
  username: string;
  nickname?: string;
  identity?: string;
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

interface StoredSession {
  user: User;
  token: string;
  lastUsedAt: string;
}

export interface SavedChildSession extends User {
  lastUsedAt?: string;
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
  savedChildSessions: SavedChildSession[];
  favoriteChildIds: string[];
  childOrderIds: string[];
  mode: "parent" | "child";
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchToChild: (child: User) => void;
  openChildLogin?: () => void;
  toggleFavoriteChild: (childId: string) => void;
  reorderChildSessions: (fromId: string, toId: string) => void;
  resetChildOrder: () => void;
  switchToParent: () => Promise<boolean>;
  refreshChildren: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [childList, setChildList] = useState<User[]>([]);
  const [savedChildSessions, setSavedChildSessions] = useState<SavedChildSession[]>([]);
  const [favoriteChildIds, setFavoriteChildIds] = useState<string[]>([]);
  const [childOrderIds, setChildOrderIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"parent" | "child">("parent");
  const [isHydrated, setIsHydrated] = useState(false);

  const sessionStorageKey = "little_achievers_sessions";
  const activeSessionKey = "little_achievers_active_session";
  const favoritesKey = "little_achievers_favorite_children";
  const childOrderKey = "little_achievers_child_order";

  const readSessions = (): StoredSession[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(sessionStorageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredSession[];
      return Array.isArray(parsed) ? parsed.filter((item) => item?.user?.id && item?.token) : [];
    } catch {
      localStorage.removeItem(sessionStorageKey);
      return [];
    }
  };

  const writeSessions = (sessions: StoredSession[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(sessionStorageKey, JSON.stringify(sessions));
  };

  const readFavoriteChildIds = (): string[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(favoritesKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      localStorage.removeItem(favoritesKey);
      return [];
    }
  };

  const writeFavoriteChildIds = (ids: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(favoritesKey, JSON.stringify(ids));
  };

  const readChildOrderIds = (): string[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(childOrderKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      localStorage.removeItem(childOrderKey);
      return [];
    }
  };

  const writeChildOrderIds = (ids: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(childOrderKey, JSON.stringify(ids));
  };

  const syncSavedChildSessions = () => {
    const favorites = readFavoriteChildIds();
    const order = readChildOrderIds();
    setSavedChildSessions(
      readSessions()
        .filter((session) => session.user.role === "child")
        .sort((a, b) => {
          const aOrder = order.indexOf(a.user.id);
          const bOrder = order.indexOf(b.user.id);
          if (aOrder !== -1 || bOrder !== -1) {
            if (aOrder === -1) return 1;
            if (bOrder === -1) return -1;
            if (aOrder !== bOrder) return aOrder - bOrder;
          }
          const aFav = favorites.includes(a.user.id) ? 1 : 0;
          const bFav = favorites.includes(b.user.id) ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        })
        .map((session) => ({
          ...session.user,
          lastUsedAt: session.lastUsedAt,
        })),
    );
  };

  const syncFavoriteChildIds = () => {
    setFavoriteChildIds(readFavoriteChildIds());
  };

  const syncChildOrderIds = () => {
    setChildOrderIds(readChildOrderIds());
  };

  const upsertSession = (session: StoredSession) => {
    const sessions = readSessions().filter((item) => item.user.id !== session.user.id);
    sessions.push({
      ...session,
      lastUsedAt: new Date().toISOString(),
    });
    writeSessions(sessions);
    localStorage.setItem(activeSessionKey, session.user.id);
    localStorage.setItem("access_token", session.token);
    syncSavedChildSessions();
  };

  const toggleFavoriteChild = (childId: string) => {
    const current = readFavoriteChildIds();
    const next = current.includes(childId) ? current.filter((id) => id !== childId) : [childId, ...current];
    writeFavoriteChildIds(next);
    setFavoriteChildIds(next);
    syncSavedChildSessions();
  };

  const reorderChildSessions = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const current = readChildOrderIds();
    const allChildIds = readSessions()
      .filter((session) => session.user.role === "child")
      .map((session) => session.user.id);
    const ordered = Array.from(new Set([...current, ...allChildIds]));
    const fromIndex = ordered.indexOf(fromId);
    const toIndex = ordered.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;
    ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, fromId);
    writeChildOrderIds(ordered);
    setChildOrderIds(ordered);
    syncSavedChildSessions();
  };

  const resetChildOrder = () => {
    localStorage.removeItem(childOrderKey);
    setChildOrderIds([]);
    syncSavedChildSessions();
  };

  const activateSession = (session: StoredSession | null) => {
    if (!session) return;
    setCurrentUser(session.user);
    setMode(session.user.role === "child" ? "child" : "parent");
    localStorage.setItem("little_achievers_user", JSON.stringify(session.user));
    localStorage.setItem("little_achievers_mode", session.user.role === "child" ? "child" : "parent");
    localStorage.setItem(activeSessionKey, session.user.id);
    localStorage.setItem("access_token", session.token);
    upsertSession({ ...session, lastUsedAt: new Date().toISOString() });
    syncSavedChildSessions();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUser = localStorage.getItem("little_achievers_user");
    let nextUser: User | null = null;
    if (savedUser) {
      try {
        nextUser = JSON.parse(savedUser);
      } catch {
        localStorage.removeItem("little_achievers_user");
      }
    }

    const savedMode = localStorage.getItem("little_achievers_mode");
    const savedSessionId = localStorage.getItem(activeSessionKey);
    const sessions = readSessions();
    queueMicrotask(() => {
      syncSavedChildSessions();
      syncFavoriteChildIds();
      syncChildOrderIds();
      if (savedSessionId) {
        const active = sessions.find((session) => session.user.id === savedSessionId);
        if (active) {
          activateSession(active);
        } else if (nextUser) {
          setCurrentUser(nextUser);
          if (savedMode === "parent" || savedMode === "child") {
            setMode(savedMode);
          }
        }
      } else if (nextUser) {
        setCurrentUser(nextUser);
        if (savedMode === "parent" || savedMode === "child") {
          setMode(savedMode);
        }
      }
      setIsHydrated(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    setCurrentUser(null);
    setChildList([]);
    setMode("parent");
    if (typeof window !== "undefined") {
      localStorage.removeItem("little_achievers_user");
      localStorage.removeItem("little_achievers_mode");
      localStorage.removeItem("little_achievers_active_session");
      localStorage.removeItem("access_token");
      localStorage.removeItem(sessionStorageKey);
      localStorage.removeItem(favoritesKey);
      localStorage.removeItem(childOrderKey);
    }
    window.location.href = "/";
  };

  const refreshCurrentUser = async () => {
    if (!currentUser?.token) return;

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
      if (!data.success || !data.user) return;

      const activeSession = readSessions().find((session) => session.user.id === currentUser.id);
      const mergedUser = {
        ...currentUser,
        ...data.user,
        token: currentUser.token,
      };

      setCurrentUser(mergedUser);
      setChildList(data.user.children || []);

      if (typeof window !== "undefined" && activeSession?.token) {
        upsertSession({
          user: mergedUser,
          token: activeSession.token,
          lastUsedAt: activeSession.lastUsedAt,
        });
      }

      syncSavedChildSessions();
      syncFavoriteChildIds();
      syncChildOrderIds();
    } catch (error) {
      console.error("Refresh current user failed:", error);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;

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

      await refreshCurrentUser();
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.token, isHydrated]); // Run after local state hydration

  useEffect(() => {
    if (!isHydrated) return;
    if (typeof window !== "undefined") {
      if (currentUser) {
        localStorage.setItem("little_achievers_user", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("little_achievers_user");
      }

      localStorage.setItem("little_achievers_mode", mode);
    }
  }, [currentUser, mode, isHydrated]);

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
        if (data.token) {
          upsertSession({ user, token: data.token, lastUsedAt: new Date().toISOString() });
        }
        syncSavedChildSessions();
        syncFavoriteChildIds();
        syncChildOrderIds();

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
              window.location.href = `/child`;
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
    const sessions = readSessions();
    const session = sessions.find((item) => item.user.id === child.id && item.token);
    if (!session) {
      return;
    }
    activateSession(session);
  };

  const switchToParent = async (): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      setMode("parent");
      if (currentUser?.token) {
        upsertSession({ user: currentUser, token: currentUser.token, lastUsedAt: new Date().toISOString() });
      }
      syncSavedChildSessions();
      syncFavoriteChildIds();
      syncChildOrderIds();
      return true;
    } catch (_error: unknown) {
      console.error("Switch to parent error:", _error);
      return false;
    }
  };

  const refreshChildren = async () => {
    if (!currentUser || !currentUser.token) return;
    try {
      const data = await request("/api/auth/current");
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
        syncSavedChildSessions();
        syncFavoriteChildIds();
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
        savedChildSessions,
        favoriteChildIds,
        childOrderIds,
        mode,
        login,
        logout,
        switchToChild,
        openChildLogin: undefined,
        toggleFavoriteChild,
        reorderChildSessions,
        resetChildOrder,
        switchToParent,
        refreshChildren,
        refreshCurrentUser,
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
