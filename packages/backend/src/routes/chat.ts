import { Router, Request, Response } from 'express';
import { chatService } from '../services/chat.service';

export const chatRouter = Router();

/**
 * POST /api/chat/sessions
 * Create a new chat session. Returns the session with an initial greeting message.
 */
chatRouter.post('/sessions', (_req: Request, res: Response) => {
  const session = chatService.createSession();
  res.json(session);
});

/**
 * GET /api/chat/sessions/:id
 * Retrieve a session and all its messages.
 */
chatRouter.get('/sessions/:id', (req: Request, res: Response) => {
  const session = chatService.getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

/**
 * POST /api/chat/sessions/:id/messages
 * Send a user message (non-streaming). Returns the assistant's response.
 */
chatRouter.post(
  '/sessions/:id/messages',
  async (req: Request, res: Response) => {
    const { message, currentGraph } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required and must be a string' });
      return;
    }

    try {
      const response = await chatService.sendMessage(
        req.params.id,
        message,
        currentGraph,
      );
      res.json(response);
    } catch (error) {
      const status = (error instanceof Error && error.message === 'Session not found')
        ? 404
        : 500;
      res.status(status).json({
        error: error instanceof Error ? error.message : 'Chat failed',
      });
    }
  },
);

/**
 * POST /api/chat/sessions/:id/stream
 * Send a user message (streaming via SSE). Chunks are sent as `data: {...}\n\n`.
 */
chatRouter.post(
  '/sessions/:id/stream',
  async (req: Request, res: Response) => {
    const { message, currentGraph } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required and must be a string' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = chatService.sendMessageStream(
        req.params.id,
        message,
        currentGraph,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content:
            error instanceof Error ? error.message : 'Stream failed',
        })}\n\n`,
      );
      res.end();
    }
  },
);

/**
 * DELETE /api/chat/sessions/:id
 * Delete a chat session.
 */
chatRouter.delete('/sessions/:id', (req: Request, res: Response) => {
  chatService.deleteSession(req.params.id);
  res.status(204).send();
});
