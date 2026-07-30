"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface LabeledInputProps extends React.ComponentProps<typeof Input> {
  id: string
  label: string
  icon?: React.ReactNode
  error?: string
  wrapperClassName?: string
  /** Text shown next to the label when `required` is set (e.g. the localized word for "Required") — omit to show no indicator at all. */
  requiredLabel?: string
}

/** Standard label-above-input field: the label always renders above the input, never inside or overlapping it. */
function LabeledInput({
  id,
  label,
  icon,
  error,
  wrapperClassName,
  className,
  placeholder,
  required,
  requiredLabel,
  ...props
}: LabeledInputProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", wrapperClassName)}>
      <Label htmlFor={id} className="justify-between">
        <span>{label}</span>
        {required && requiredLabel && (
          <span className="text-xs font-normal text-muted-foreground">{requiredLabel}</span>
        )}
      </Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground [&>svg]:size-4">
            {icon}
          </span>
        )}
        <Input
          id={id}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
          className={cn(icon && "pl-9", className)}
          required={required}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export { LabeledInput }
