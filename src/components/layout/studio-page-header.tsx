/** Title block at the top of a studio page (presentation Header `VIEW_TITLES`). */
export function StudioPageHeader({
  title,
  category,
}: {
  title: string
  category?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      {category ? (
        <p className="text-label font-semibold text-muted-foreground">
          {category}
        </p>
      ) : null}
      <h1 className="text-title font-bold tracking-tight text-foreground">
        {title}
      </h1>
    </div>
  )
}
