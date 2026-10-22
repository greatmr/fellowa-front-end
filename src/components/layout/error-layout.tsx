import { useId, type ReactNode } from "react";
import { AlertCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** A provider-independent error frame, safe inside an existing main landmark. */
export function ErrorLayout({
  title,
  description,
  brand,
  actions,
  variant = "unexpected",
}: {
  title: string;
  description: string;
  brand?: ReactNode;
  actions: ReactNode;
  variant?: "unexpected" | "not-found";
}) {
  const titleId = useId();

  return (
    <section
      data-slot="error-layout"
      role="alert"
      aria-labelledby={titleId}
      className="max-w-error mx-auto flex w-full flex-col items-center justify-center gap-5 px-6 py-20 text-center sm:py-28"
    >
      {brand ? <div className="mb-6">{brand}</div> : null}
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-xl",
          variant === "not-found"
            ? "text-warning bg-amber-50 dark:bg-amber-500/15"
            : "bg-destructive/10 text-destructive",
        )}
      >
        <AlertCircleIcon className="size-8" strokeWidth={1.6} aria-hidden />
      </span>
      <h1 id={titleId} className="text-headline font-bold">
        {title}
      </h1>
      <p className="text-muted-foreground text-body leading-7">{description}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {actions}
      </div>
    </section>
  );
}
