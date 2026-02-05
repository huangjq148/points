'use client';

import Layout from '@/components/Layouts';
import ParentDashboard from '@/components/ParentDashboard';

export default function ParentPage() {
  return <ParentDashboard />;
}
export function ParentLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}