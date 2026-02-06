 "use client";
 
 import ChildShell from "@/components/ChildShell";
 
 export default function Layout({ children }: { children: React.ReactNode }) {
   return <ChildShell>{children}</ChildShell>;
 }
