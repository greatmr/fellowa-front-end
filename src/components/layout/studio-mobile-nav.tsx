"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Below `lg` the sidebar lives in a drawer on the start side (the side the
 * desktop rail occupies). `children` is the server-rendered sidebar body.
 * Any link click inside closes the drawer.
 */
export function StudioMobileNav({ children }: { children: ReactNode }) {
  const t = useTranslations("studio");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  function closeOnLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) {
      setOpen(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label={t("openMenu")}
        >
          <MenuIcon className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="start"
        closeLabel={tCommon("close")}
        aria-describedby={undefined}
        className="w-70 gap-0 sm:max-w-70"
      >
        <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
        <div className="h-full" onClick={closeOnLinkClick}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
