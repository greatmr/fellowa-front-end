/** Title block at the top of a studio page (presentation Header `VIEW_TITLES`). */
export function StudioPageHeader({
  title,
  category,
}: {
  title: string;
  category?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      {category ? (
        <p className="text-muted-foreground text-label font-semibold">
          {category}
        </p>
      ) : null}
      <h1 className="text-foreground text-title font-bold tracking-tight">
        {title}
      </h1>
    </div>
  );
}
