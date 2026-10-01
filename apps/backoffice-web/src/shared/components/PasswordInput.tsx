import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from './Input';

interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label?: string;
  error?: string;
  helperText?: string;
  fieldSize?: 'md' | 'lg';
}

// Password field with a show/hide toggle — same control as apps/web's login
// (eye / eye-slash icon inside the field, label flips between "Mostrar" and
// "Ocultar contraseña").
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        endSlot={
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="flex size-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-text-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="9"
                cy="9"
                r="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              {visible && (
                <path
                  d="M3 3l12 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        }
      />
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
