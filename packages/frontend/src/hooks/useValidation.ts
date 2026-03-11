import { useEffect, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';

export function useValidation() {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const validateDesign = useDesignStore((s) => s.validateDesign);
  const validationResult = useDesignStore((s) => s.validationResult);
  const isLoading = useDesignStore((s) => s.isLoading);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graphVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeDesign?.graph) return;

    const graphVersion = activeDesign.graph.metadata.updated_at;
    if (graphVersion === graphVersionRef.current) return;
    graphVersionRef.current = graphVersion;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      validateDesign();
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [activeDesign?.graph?.metadata.updated_at, validateDesign]);

  return {
    validationResult,
    isValidating: isLoading,
    validate: validateDesign,
  };
}
