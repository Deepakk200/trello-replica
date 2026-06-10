interface Props {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4
                    py-24 px-8 text-center">
      {/* SVG illustration */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="80" height="80" rx="16" fill="#282E33" />
        <rect x="12" y="20" width="22" height="40" rx="4" fill="#384048" />
        <rect x="40" y="20" width="22" height="28" rx="4" fill="#384048" />
        <rect x="14" y="24" width="18" height="3" rx="1.5" fill="#4C5A63" />
        <rect x="14" y="30" width="13" height="3" rx="1.5" fill="#4C5A63" />
        <rect x="42" y="24" width="18" height="3" rx="1.5" fill="#4C5A63" />
        <rect x="42" y="30" width="11" height="3" rx="1.5" fill="#4C5A63" />
      </svg>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
