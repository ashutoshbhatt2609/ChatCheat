import { useEffect, type RefObject } from 'react';

/** Calls `onDismiss` on an outside click or Escape while `open` is true (menus, popovers). */
export function useDismiss(ref: RefObject<HTMLElement>, open: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onDismiss]);
}
