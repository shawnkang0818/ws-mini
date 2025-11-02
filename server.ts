import Fastify from 'fastify';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';

const PORT = 3000;

const app = Fastify({ logger: true });
const httpServer = createServer(app.server);
const io = new IOServer(httpServer, { cors: { origin: '*' } });

// Simple health endpoint
app.get('/health', async () => ({ ok: true }));

// WebSocket events
io.on('connection', (socket) => {
  app.log.info({ id: socket.id }, 'socket connected');

  // receive a message from the client
  socket.on('followup:create', (payload: { items: string[]; createdAt: number }) => {
    // echo back a polite question
    const items = (payload?.items ?? []).map(s => s.trim()).filter(Boolean);
    if (!items.length) return;
    const text = `Thanks—just to confirm: ${items.join(', ')}?`;
    socket.emit('agent:questions', { text, createdAt: Date.now() });
  });

  socket.on('disconnect', () => {
    app.log.info({ id: socket.id }, 'socket disconnected');
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  app.log.info(`Server listening on http://localhost:${PORT}`);
});
