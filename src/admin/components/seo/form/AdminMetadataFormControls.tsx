import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  help?: string;
  required?: boolean;
}

export function FieldShell({ label, htmlFor, error, help, required, children }: FieldShellProps & { children: ReactNode }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">
        {label}{required ? " *" : ""}
      </span>
      <div className="mt-2">{children}</div>
      {help ? <p className="mt-1 text-xs leading-5 text-white/42">{help}</p> : null}
      {error ? <p className="mt-1 text-xs font-semibold text-anm-error">{error}</p> : null}
    </label>
  );
}

export const inputClassName =
  "min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClassName} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClassName} min-h-28 resize-y ${props.className ?? ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClassName} ${props.className ?? ""}`} />;
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-anm-card border border-white/10 bg-anm-surface-glass p-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-white/58">{description}</p> : null}
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
