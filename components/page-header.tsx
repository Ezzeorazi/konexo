export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl tracking-wide text-ink md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 font-hand text-lg text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
