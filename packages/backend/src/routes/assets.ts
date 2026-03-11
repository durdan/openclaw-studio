import { Router, Request, Response } from 'express';
import { assetService } from '../services/asset.service';

export const assetsRouter = Router();

// GET /api/assets - List all assets
assetsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, asset_type, reusable } = req.query;

    if (search) {
      const results = await assetService.search(search as string, asset_type as string | undefined);
      res.json(results);
      return;
    }

    if (reusable === 'true' || reusable === '1') {
      const results = await assetService.getReusable(asset_type as string | undefined);
      res.json(results);
      return;
    }

    const assets = await assetService.list();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/assets/:id - Get asset by ID
assetsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const asset = await assetService.getById(req.params.id);
    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found' } });
      return;
    }
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/assets - Create a new asset entry
assetsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const asset = await assetService.create(req.body);
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// PUT /api/assets/:id - Update an asset
assetsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const asset = await assetService.update(req.params.id, req.body);
    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found' } });
      return;
    }
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// DELETE /api/assets/:id - Delete an asset
assetsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await assetService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: { message: 'Asset not found' } });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
