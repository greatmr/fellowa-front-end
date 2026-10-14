import * as React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"div">, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Usually a retry button; composed so this stays usable from server components. */
  action?: React.ReactNode;
};

/** Failed-to-load panel (presentation `ErrorState`). Defaults to the shared `errors.unexpected*` copy. */
export function ErrorState({
  title,
  description,
  action,
  className,
  ...props
}: Props) {
  const t = useTranslations("errors");

  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "bg-card flex flex-col items-center justify-center gap-3 rounded-md border px-6 py-14 text-center",
        className,
      )}
      {...props}
    >
      <AlertCircle
        className="text-destructive size-10"
        strokeWidth={1.7}
        aria-hidden
      />
      <p className="text-foreground text-body font-semibold">
        {title ?? t("unexpectedTitle")}
      </p>
      <p className="text-muted-foreground text-label max-w-xs leading-6">
        {description ?? t("unexpectedBody")}
      </p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
