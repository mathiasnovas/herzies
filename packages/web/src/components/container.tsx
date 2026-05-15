import { cn } from "@/lib/utils";

export default function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("w-5xl max-w-full mx-auto px-4 sm:px-6 md:px-8", className)}
    >
      {children}
    </div>
  );
}
