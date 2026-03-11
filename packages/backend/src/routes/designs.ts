import { Router, Request, Response } from 'express';
import { designService } from '../services/design.service';

export const designsRouter = Router();

// GET /api/designs - List all designs
designsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const designs = await designService.list();
    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/designs/:id - Get a design by ID
designsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const design = await designService.getById(req.params.id);
    if (!design) {
      res.status(404).json({ error: { message: 'Design not found' } });
      return;
    }
    res.json(design);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/designs - Create a new design
designsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const design = await designService.create(req.body);
    res.status(201).json(design);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// PUT /api/designs/:id - Update a design
designsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const design = await designService.update(req.params.id, req.body);
    if (!design) {
      res.status(404).json({ error: { message: 'Design not found' } });
      return;
    }
    res.json(design);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// DELETE /api/designs/:id - Delete a design
designsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await designService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: { message: 'Design not found' } });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/designs/:id/versions - Get design versions
designsRouter.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await designService.getVersions(req.params.id);
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/designs/:id/versions - Create a new version snapshot
designsRouter.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const version = await designService.createVersion(req.params.id, req.body.change_summary || '');
    if (!version) {
      res.status(404).json({ error: { message: 'Design not found or has no graph to snapshot' } });
      return;
    }
    res.status(201).json(version);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
