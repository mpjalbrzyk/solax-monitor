"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoHint({
  children,
  label = "Co to znaczy?",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs glass-strong border-white/60 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-foreground">{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
