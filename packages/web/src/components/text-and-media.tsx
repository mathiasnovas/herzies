import { cn } from "@/lib/utils";

export default function TextAndMedia({
  preTitle,
  title,
  description,
  media,
  position = "left",
}: {
  preTitle?: string;
  title: string;
  description: string;
  media: React.ReactNode;
  position?: "left" | "right";
}) {
  return (
    <section className="py-16 sm:py-24 grid grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-12">
      <div className="text-center max-w-xl w-full mx-auto md:mx-0">
        {preTitle && (
          <p className="text-sm text-text-dim mb-2 uppercase tracking-widest">
            {preTitle}
          </p>
        )}
        <h2 className={cn("text-xl sm:text-2xl text-purple mb-4")}>{title}</h2>
        <p className="text-sm text-text-dim">{description}</p>
      </div>

      <div
        className={cn(
          "text-center max-w-xl w-full mx-auto md:mx-0",
          position === "left" ? "md:-order-1" : "order-2",
        )}
      >
        {media}
      </div>
    </section>
  );
}
