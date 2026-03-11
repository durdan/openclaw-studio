import { Router, Request, Response } from 'express';
import { plannerService } from '../services/planner.service';

export const plannerRouter = Router();

// POST /api/planner/generate - Generate a plan from use-case prompt
plannerRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const output = await plannerService.generate(req.body);
    res.json(output);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/planner/refine - Refine an existing plan with feedback
plannerRouter.post('/refine', async (req: Request, res: Response) => {
  try {
    const { current_output, feedback } = req.body;
    if (!current_output || !feedback) {
      res.status(400).json({ error: { message: 'current_output and feedback are required' } });
      return;
    }
    const output = await plannerService.refine(current_output, feedback);
    res.json(output);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
