import { create } from 'zustand';
import type {
  StudioDesign,
  PlannerOutput,
  StudioGraph,
  ValidationResult,
  ExportBundle,
} from '@openclaw-studio/shared';
import { DesignStatus } from '@openclaw-studio/shared';
import { api } from '@/lib/api';

export interface DesignState {
  designs: StudioDesign[];
  activeDesign: StudioDesign | null;
  plannerOutput: PlannerOutput | null;
  validationResult: ValidationResult | null;
  exportBundle: ExportBundle | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Design CRUD
  loadDesigns: () => Promise<void>;
  loadDesign: (id: string) => Promise<void>;
  createDesign: (name: string, useCasePrompt: string) => Promise<void>;
  saveDesign: () => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;
  setActiveDesign: (design: StudioDesign | null) => void;

  // Graph
  updateGraph: (graph: StudioGraph) => void;

  // Planner
  generatePlan: (prompt: string) => Promise<void>;
  refinePlan: (feedback: string) => Promise<void>;

  // Validation
  validateDesign: () => Promise<void>;

  // Export
  generateExport: () => Promise<void>;

  // Misc
  clearError: () => void;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  designs: [],
  activeDesign: null,
  plannerOutput: null,
  validationResult: null,
  exportBundle: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  loadDesigns: async () => {
    set({ isLoading: true, error: null });
    try {
      const designs = await api.get<StudioDesign[]>('/designs');
      set({ designs, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load designs';
      set({ error: message, isLoading: false });
    }
  },

  loadDesign: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const design = await api.get<StudioDesign>(`/designs/${id}`);
      set({
        activeDesign: design,
        plannerOutput: design.planner_output || null,
        exportBundle: design.export_bundle || null,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load design';
      set({ error: message, isLoading: false });
    }
  },

  createDesign: async (name: string, useCasePrompt: string) => {
    set({ isLoading: true, error: null });
    try {
      const design = await api.post<StudioDesign>('/designs', {
        name,
        use_case_prompt: useCasePrompt,
      });
      set((state) => ({
        designs: [...state.designs, design],
        activeDesign: design,
        plannerOutput: null,
        validationResult: null,
        exportBundle: null,
        isLoading: false,
      }));
    } catch (err) {
      // Fallback to local creation if API not available
      const newDesign: StudioDesign = {
        id: `design-${Date.now()}`,
        name,
        description: '',
        status: DesignStatus.Draft,
        use_case_prompt: useCasePrompt,
        created_by: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        designs: [...state.designs, newDesign],
        activeDesign: newDesign,
        plannerOutput: null,
        validationResult: null,
        exportBundle: null,
        isLoading: false,
      }));
    }
  },

  saveDesign: async () => {
    const { activeDesign } = get();
    if (!activeDesign) return;
    set({ isLoading: true, error: null });
    try {
      const updated = await api.put<StudioDesign>(
        `/designs/${activeDesign.id}`,
        activeDesign,
      );
      set((state) => ({
        activeDesign: updated,
        designs: state.designs.map((d) => (d.id === updated.id ? updated : d)),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save design';
      set({ error: message, isLoading: false });
    }
  },

  deleteDesign: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/designs/${id}`);
      set((state) => ({
        designs: state.designs.filter((d) => d.id !== id),
        activeDesign: state.activeDesign?.id === id ? null : state.activeDesign,
        plannerOutput: state.activeDesign?.id === id ? null : state.plannerOutput,
        validationResult: state.activeDesign?.id === id ? null : state.validationResult,
        exportBundle: state.activeDesign?.id === id ? null : state.exportBundle,
        isLoading: false,
      }));
    } catch (err) {
      // Fallback to local deletion
      set((state) => ({
        designs: state.designs.filter((d) => d.id !== id),
        activeDesign: state.activeDesign?.id === id ? null : state.activeDesign,
        plannerOutput: state.activeDesign?.id === id ? null : state.plannerOutput,
        isLoading: false,
      }));
    }
  },

  setActiveDesign: (design: StudioDesign | null) => {
    set({
      activeDesign: design,
      plannerOutput: design?.planner_output || null,
      exportBundle: design?.export_bundle || null,
      validationResult: null,
    });
  },

  updateGraph: (graph: StudioGraph) => {
    set((state) => {
      if (!state.activeDesign) return state;
      const updated = {
        ...state.activeDesign,
        graph,
        updated_at: new Date().toISOString(),
      };
      return {
        activeDesign: updated,
        designs: state.designs.map((d) => (d.id === updated.id ? updated : d)),
      };
    });
  },

  generatePlan: async (prompt: string) => {
    set({ isGenerating: true, error: null });
    try {
      const output = await api.post<PlannerOutput>('/planner/generate', {
        use_case_prompt: prompt,
      });

      const { activeDesign } = get();
      if (!activeDesign) {
        // Create a new design
        const newDesign: StudioDesign = {
          id: `design-${Date.now()}`,
          name: output.recommended_architecture_name || 'New Design',
          description: output.use_case_summary || '',
          status: DesignStatus.Draft,
          use_case_prompt: prompt,
          planner_output: output,
          graph: output.graph_seed,
          created_by: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          designs: [...state.designs, newDesign],
          activeDesign: newDesign,
          plannerOutput: output,
          isGenerating: false,
        }));
      } else {
        const updated = {
          ...activeDesign,
          planner_output: output,
          graph: output.graph_seed,
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          activeDesign: updated,
          designs: state.designs.map((d) => (d.id === updated.id ? updated : d)),
          plannerOutput: output,
          isGenerating: false,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate plan';
      set({ error: message, isGenerating: false });
    }
  },

  refinePlan: async (feedback: string) => {
    const { activeDesign, plannerOutput } = get();
    if (!activeDesign) return;
    set({ isGenerating: true, error: null });
    try {
      const output = await api.post<PlannerOutput>('/planner/refine', {
        use_case_prompt: activeDesign.use_case_prompt,
        feedback,
        previous_output: plannerOutput,
      });
      const updated = {
        ...activeDesign,
        planner_output: output,
        graph: output.graph_seed,
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        activeDesign: updated,
        designs: state.designs.map((d) => (d.id === updated.id ? updated : d)),
        plannerOutput: output,
        isGenerating: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refine plan';
      set({ error: message, isGenerating: false });
    }
  },

  validateDesign: async () => {
    const { activeDesign } = get();
    if (!activeDesign?.graph) return;
    set({ isLoading: true, error: null });
    try {
      const result = await api.post<ValidationResult>(
        '/validation/validate',
        activeDesign.graph,
      );
      set({ validationResult: result, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      set({ error: message, isLoading: false });
    }
  },

  generateExport: async () => {
    const { activeDesign } = get();
    if (!activeDesign) return;
    set({ isLoading: true, error: null });
    try {
      const bundle = await api.post<ExportBundle>(
        `/designs/${activeDesign.id}/export`,
        {},
      );
      const updated = {
        ...activeDesign,
        export_bundle: bundle,
        status: DesignStatus.Exported,
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        activeDesign: updated,
        designs: state.designs.map((d) => (d.id === updated.id ? updated : d)),
        exportBundle: bundle,
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
