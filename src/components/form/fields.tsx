import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-lg border border-input bg-field px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60";

export function Label({
  children,
  required,
  hint,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-foreground">
      {children}
      {required && <span className="ml-0.5 text-primary">*</span>}
      {hint && <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-sm text-destructive">{msg}</p>;
}

export function TextInput({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined} className={cn(inputClass, invalid && "border-destructive", className)} />;
}

export function TextArea({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputClass, "min-h-[96px] resize-y", invalid && "border-destructive", className)}
    />
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label required={required} hint={hint}>
        {label}
      </Label>
      {children}
      <ErrorText msg={error} />
    </div>
  );
}

export function CheckChip({
  checked,
  onToggle,
  children,
  accent = "border-primary bg-primary/15",
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        checked ? accent : "border-input bg-field text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked ? "border-foreground bg-foreground text-background" : "border-muted-foreground/60",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export function YesNo({
  value,
  onChange,
  invalid,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-lg border bg-field p-1", invalid ? "border-destructive" : "border-input")}>
      {[
        { v: true, l: "Yes" },
        { v: false, l: "No" },
      ].map((o) => (
        <button
          key={o.l}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "min-w-16 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === o.v ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h4>;
}
