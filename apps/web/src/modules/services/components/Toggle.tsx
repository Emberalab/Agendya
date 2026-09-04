interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Toggle({
  id,
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      style={{
        position: 'relative',
        width: '44px',
        height: '26px',
        flexShrink: 0,
        padding: 0,
        border: 'none',
        borderRadius: '999px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        backgroundColor: checked
          ? 'var(--color-brand-primary)'
          : 'var(--color-border)',
        transition: 'background-color 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-text-on-brand)',
          boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
          transition: 'left 0.15s',
        }}
      />
    </button>
  );
}
