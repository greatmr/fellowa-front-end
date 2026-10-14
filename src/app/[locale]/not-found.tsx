import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground text-sm">{t("notFoundBody")}</p>
    </main>
  );
}
