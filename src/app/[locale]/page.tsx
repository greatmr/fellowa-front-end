import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("scaffoldTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {t("scaffoldBody")}
        </CardContent>
      </Card>
    </main>
  );
}
