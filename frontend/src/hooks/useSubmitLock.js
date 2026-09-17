import { useState, useRef, useCallback } from 'react';

/**
 * useSubmitLock — Prevents duplicate form submissions.
 *
 * Usage:
 *   const { isSubmitting, withLock } = useSubmitLock();
 *   const handleSubmit = withLock(async (e) => { ... });
 *
 * Features:
 *   - Sets isSubmitting=true on first call, blocks re-entry while pending.
 *   - Resets to false after success OR handled error.
 *   - lockRef allows synchronous guard even before React state update cycle.
 */
const useSubmitLock = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false); // Synchronous guard to prevent race on rapid clicks

  /**
   * Wraps an async handler with submit-lock logic.
   * @param {Function} handler - The async form handler to protect.
   * @returns {Function} - A guarded version of the handler.
   */
  const withLock = useCallback(
    (handler) =>
      async (...args) => {
        const e = args[0];
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }

        // Synchronous guard first — React state update is async and too slow
        if (lockRef.current) return;
        lockRef.current = true;
        setIsSubmitting(true);

        try {
          await handler(...args);
        } catch (err) {
          // Re-throw so the caller's catch block still works
          throw err;
        } finally {
          lockRef.current = false;
          setIsSubmitting(false);
        }
      },
    [],
  );

  /**
   * Blocks Enter key press when already submitting.
   * Attach to form or input's onKeyDown.
   */
  const blockEnterIfSubmitting = useCallback(
    (e) => {
      if (isSubmitting && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [isSubmitting],
  );

  return { isSubmitting, withLock, blockEnterIfSubmitting };
};

export default useSubmitLock;
