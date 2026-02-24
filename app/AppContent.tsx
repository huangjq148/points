"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(24px)",
          borderRadius: "32px",
          padding: "48px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🌟</div>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a5f" }}>小小奋斗者</h1>
        <p style={{ color: "#3b82f6", marginTop: "8px" }}>加载中...</p>
      </div>
    </div>
  );
}

export default function AppContent() {
  const { currentUser, mode } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (currentUser) {
      if (mode === "child") {
        router.push(`/child`);
      } else {
        router.push("/parent/home");
      }
    } else if (!currentUser && pathname !== "/login") {
      router.push("/login");
    }
  }, [mode, currentUser, router, pathname]);

  if (!currentUser && pathname !== "/login") {
    return <LoadingScreen />;
  }

  // 对于 /child 和 /parent 路径，依赖 Next.js 的文件系统路由
  return null; // 或者可以返回一个通用的布局组件，如果需要的话
}
