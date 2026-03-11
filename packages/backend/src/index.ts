import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runMigrations } from './db';
import { errorHandler } from './middleware/error-handler';
import { designsRouter } from './routes/designs';
import { plannerRouter } from './routes/planner';
import { validationRouter } from './routes/validation';
import { exportRouter } from './routes/export';
import { assetsRouter } from './routes/assets';
import { templatesRouter } from './routes/templates';
import { publishRouter } from './routes/publish';
import { chatRouter } from './routes/chat';

// Initialize database and run migrations before starting the server
runMigrations();
console.log('Database initialized and migrations applied.');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/designs', designsRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/validation', validationRouter);
app.use('/api/export', exportRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/publish', publishRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`OpenClaw Studio backend running on port ${config.port}`);
});

export default app;
