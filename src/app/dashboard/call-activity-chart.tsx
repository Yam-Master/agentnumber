"use client";

export function CallActivityChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const labelInterval = Math.max(1, Math.floor(data.length / 7));

  return (
    <div>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 group relative"
            title={`${d.label}: ${d.count} calls`}
          >
            <div
              className={`w-full transition-colors ${
                d.count > 0
                  ? "bg-accent hover:bg-accent-dim"
                  : "bg-border hover:bg-foreground/20"
              }`}
              style={{
                height: d.count > 0 ? `${Math.max(4, (d.count / max) * 100)}%` : "2px",
                minHeight: d.count > 0 ? "4px" : "2px",
                marginTop: "auto",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelInterval === 0 && (
              <span className="text-xs text-foreground whitespace-nowrap uppercase">{d.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
