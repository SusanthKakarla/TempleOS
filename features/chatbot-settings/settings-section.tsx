"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Collapsible card used to group Chatbot Settings into sections (Chatbot Configuration, Notification Settings, ...) so the page doesn't force one long scroll. */
export function SettingsSection({ icon, title, description, defaultOpen = false, children }: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-3 p-4 text-left sm:p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-base font-semibold">{title}</span>
            {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
          </span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="space-y-4 pt-4 sm:pt-5">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
