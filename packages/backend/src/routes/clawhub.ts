import { Router } from 'express';
import {
  searchSkills,
  listSkills,
  getSkill,
  getSyncState,
  syncClawHub,
} from '../services/clawhub-sync.service';

export const clawhubRouter = Router();

// GET /api/clawhub/skills/search?q=email&limit=20
clawhubRouter.get('/skills/search', (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skills = searchSkills(query, limit);
    res.json({ skills, query, count: skills.length });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/clawhub/skills?offset=0&limit=20
clawhubRouter.get('/skills', (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 200);
    const result = listSkills({ offset, limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/clawhub/skills/:slug
clawhubRouter.get('/skills/:slug', (req, res) => {
  try {
    const skill = getSkill(req.params.slug);
    if (!skill) {
      return res.status(404).json({ error: { message: 'Skill not found' } });
    }
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/clawhub/sync/status
clawhubRouter.get('/sync/status', (_req, res) => {
  try {
    const state = getSyncState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/clawhub/sync/trigger
clawhubRouter.post('/sync/trigger', (_req, res) => {
  try {
    // Start sync in background, return immediately
    syncClawHub()
      .then((result) => console.log(`ClawHub manual sync: ${result.message}`))
      .catch((err) => console.error(`ClawHub manual sync error: ${err.message}`));

    res.json({ status: 'syncing', message: 'Sync started in background' });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
