import { useEffect, useCallback } from 'react';

/**
 * Hook to warn users before leaving the page when there's unsaved work
 * Shows the browser's native "Are you sure you want to leave?" dialog
 */
export function useBeforeUnload(shouldWarn: boolean, message?: string) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      
      // Modern browsers ignore custom messages but we set it anyway
      const warningMessage = message || 'You have unsaved changes. Are you sure you want to leave?';
      e.preventDefault();
      e.returnValue = warningMessage;
      return warningMessage;
    },
    [shouldWarn, message]
  );

  useEffect(() => {
    if (shouldWarn) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [shouldWarn, handleBeforeUnload]);
}
