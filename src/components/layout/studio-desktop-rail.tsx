"use client";

import { useState, type ReactNode } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** Only the desktop rail's disclosure is client-owned; its body stays server-rendered. */
export function StudioDesktopRail({ children }: { children: ReactNode }) {
  const t = useTranslations("studio");
  const [collapsed, setCollapsed] = useState(false);
  const Icon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group/sidebar bg-card sticky top-0 hidden h-dvh shrink-0 border-e lg:block",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div id="desktop-studio-navigation" className="h-full pb-12">
        {children}
      </div>
      <button
        type="button"
        aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
        aria-expanded={!collapsed}
        aria-controls="desktop-studio-navigation"
        onClick={() => setCollapsed((value) => !value)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 text-body absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        <Icon className="size-4.5 rtl:rotate-180" aria-hidden />
        <span className={collapsed ? "sr-only" : undefined}>
          {t("collapseSidebar")}
        </span>
      </button>
    </aside>
  );
}
