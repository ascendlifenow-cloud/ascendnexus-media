interface PublicConsentFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  error?: string;
}

export function PublicConsentField({ checked, onChange, id, error }: PublicConsentFieldProps) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm leading-6 text-white/72" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyanGlow"
        />
        <span id={`${id}-help`}>
          I consent to Ascend Nexus Media storing this information to process my request. I understand this form is not for sensitive personal information.
        </span>
      </label>
      {error ? <p id={`${id}-error`} className="mt-2 text-sm font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
