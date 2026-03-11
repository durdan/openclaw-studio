import { useDesignStore, type DesignState } from '@/store/design.store';

export function useDesign(): DesignState {
  return useDesignStore();
}
