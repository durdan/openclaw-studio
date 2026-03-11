import { Router, Request, Response } from 'express';
import { exportService } from '../services/export.service';
import { designService } from '../services/design.service';

export const exportRouter = Router();

// POST /api/export/bundle - Generate export bundle for a design
exportRouter.post('/bundle', async (req: Request, res: Response) => {
  try {
    const { design_id } = req.body;
    if (!design_id) {
      res.status(400).json({ error: { message: 'design_id is required' } });
      return;
    }

    const design = await designService.getById(design_id);
    if (!design) {
      res.status(404).json({ error: { message: 'Design not found' } });
      return;
    }

    const bundle = await exportService.generateBundle(design);
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
