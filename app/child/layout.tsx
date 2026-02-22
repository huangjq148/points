"use client";

import { usePathname } from "next/navigation";
import ChildShell from "@/components/ChildShell";
import ChildLayout from "@/components/ChildLayout";

const PAGES_WITH_CUSTOM_LAYOUT = ['/child/store', '/child/achievements', '/child/wallet'];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/child" || pathname === "/child/";
  const useCustomLayout = PAGES_WITH_CUSTOM_LAYOUT.includes(pathname);

  if (isHomePage || useCustomLayout) {
    return <ChildLayout>{children}</ChildLayout>;
  }

  return <ChildShell showShell={true} isHomePage={isHomePage}>{children}</ChildShell>;
}
