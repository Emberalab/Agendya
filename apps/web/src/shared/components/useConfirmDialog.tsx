import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog, type ConfirmOptions } from './ConfirmDialog';

/**
 * Promise-based drop-in for `window.confirm()`:
 *
 *   const { confirm, confirmDialog } = useConfirmDialog();
 *   if (!(await confirm({ title: '¿Eliminar…?', destructive: true }))) return;
 *   …
 *   return <>{…}{confirmDialog}</>;
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    // A second request before the first settles cancels the first.
    resolveRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  };

  const confirmDialog = options ? (
    <ConfirmDialog
      {...options}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
