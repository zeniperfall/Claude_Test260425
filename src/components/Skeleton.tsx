import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-[var(--bg-3)]/60",
        className,
      )}
    />
  );
}

export function SkeletonRows({ count = 4, height = "h-3" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height}`} />
      ))}
    </div>
  );
}
