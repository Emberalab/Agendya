import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && <span className="ml-1 text-red-500 dark:text-red-400">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border px-3 py-2 bg-white text-gray-900 transition-colors
            dark:bg-gray-900 dark:text-gray-100
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
            dark:disabled:bg-gray-800 dark:disabled:text-gray-500
            ${hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
