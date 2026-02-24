'use client';

import ChildLayout from "@/components/ChildLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ChildLayout>{children}</ChildLayout>;
}
