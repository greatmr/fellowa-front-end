import { setRequestLocale } from "next-intl/server";

import { HomeIntroduction } from "@/features/landing/components/home-introduction";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeIntroduction />;
}
