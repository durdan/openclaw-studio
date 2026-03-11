import { Router, Request, Response } from 'express';
import { validationService } from '../services/validation.service';

export const validationRouter = Router();

// POST /api/validation/validate - Validate a graph
validationRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const result = await validationService.validate(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/validation/rules - Get all validation rules
validationRouter.get('/rules', (_req: Request, res: Response) => {
  try {
    const rules = validationService.getRules();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
