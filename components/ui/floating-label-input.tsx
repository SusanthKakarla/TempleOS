"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FloatingLabelInputProps extends Omit<React.ComponentProps<typeof Input>, "placeholder"> {
  id: string
  label: string
  icon?: React.ReactNode
  error?: string
  wrapperClassName?: string
}

/** Peer-based CSS float — no JS state. Label overlaps the input until focused or filled, then floats above. */
function FloatingLabelInput({
  id,
  label,
  icon,
  error,
  wrapperClassName,
  className,
  ...props
}: FloatingLabelInputProps) {
  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground [&>svg]:size-4">
            {icon}
          </span>
        )}
        <Input id={id} placeholder=" " className={cn("peer h-12 pt-4 pb-1", icon && "pl-9", className)} {...props} />
        <Label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200",
            "peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary",
            "peer-[&:not(:placeholder-shown)]:top-2.5 peer-[&:not(:placeholder-shown)]:translate-y-0 peer-[&:not(:placeholder-shown)]:text-xs",
            icon && "left-9",
          )}
        >
          {label}
        </Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export { FloatingLabelInput }
