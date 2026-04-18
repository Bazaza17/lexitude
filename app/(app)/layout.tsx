import { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
