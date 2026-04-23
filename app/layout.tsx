import type { Metadata } from "next";
import "./globals.css";
import "./styles/parent.css";
import "./styles/child.css";
import "./styles/login.css";
import "./styles/dashboard-base.css";
import "./styles/parent-dark.css";
import { AppProvider } from "../context/AppContext";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "小小奋斗者 - Little Achievers",
  description: "家庭激励系统 - 培养孩子的习惯与成就感",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AppProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProvider>
        <div id="datepicker-portal" />
      </body>
    </html>
  );
}
