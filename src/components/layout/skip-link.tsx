import { useTranslations } from "next-intl";

/** Every frame exposes the same keyboard entry point for its content. */
export function SkipLink() {
  const t = useTranslations("common");

  return (
    <a
      href="#main-content"
      className="bg-primary text-primary-foreground focus-visible:ring-ring shadow-soft fixed start-4 top-3 z-100 -translate-y-24 rounded-md px-4 py-2 font-semibold transition-transform focus:translate-y-0 focus-visible:ring-2 motion-reduce:transition-none"
    >
      {t("skipToContent")}
    </a>
  );
}
