"use client";

import { useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
] as const;

type ThemeValue = (typeof OPTIONS)[number]["value"];

const noopSubscribe = () => () => {};

/**
 * Light · dark · system segmented control (presentation Sidebar "ظاهر",
 * @fdb5f6c). next-themes only knows the stored theme in the browser, so the
 * selection renders after hydration; the server output shows no option
 * selected rather than a wrong one.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const current: ThemeValue | undefined = hydrated
    ? OPTIONS.find((option) => option.value === theme)?.value
    : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <p
        id="theme-switch-label"
        className="text-muted-foreground text-label font-semibold"
      >
        {t("label")}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="theme-switch-label"
        className="bg-secondary grid grid-cols-3 gap-1 rounded-md p-1"
      >
        {OPTIONS.map(({ value, icon: Icon }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "text-label focus-visible:ring-ring/50 inline-flex min-w-0 items-center justify-center gap-1 rounded-md px-1 py-1.5 font-semibold transition-colors outline-none focus-visible:ring-[3px]",
                selected
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t(value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
