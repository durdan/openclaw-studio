import { Router, Request, Response } from 'express';
import { templateService } from '../services/template.service';

export const templatesRouter = Router();

// GET /api/templates - List all templates
templatesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await templateService.list();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/templates/:id - Get template by ID
templatesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateService.getById(req.params.id);
    if (!template) {
      res.status(404).json({ error: { message: 'Template not found' } });
      return;
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/templates - Create a new template
templatesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const template = await templateService.create(req.body);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// PUT /api/templates/:id - Update a template
templatesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateService.update(req.params.id, req.body);
    if (!template) {
      res.status(404).json({ error: { message: 'Template not found' } });
      return;
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// DELETE /api/templates/:id - Delete a template
templatesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await templateService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: { message: 'Template not found' } });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
