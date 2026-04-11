'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
  suffix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-zinc-500 text-sm pointer-events-none">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm',
              'placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              prefix && 'pl-7',
              suffix && 'pr-10',
              !prefix && 'px-3',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-zinc-500 text-sm pointer-events-none">{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
