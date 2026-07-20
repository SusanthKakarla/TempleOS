import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LegalSection({
  id,
  title,
  icon: Icon,
  children,
  className,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      id={id}
      className={cn("scroll-mt-24 ring-foreground/8 gap-4", className)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <span className="gradient-ocean-blue flex size-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:text-sm [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </CardContent>
    </Card>
  );
}
