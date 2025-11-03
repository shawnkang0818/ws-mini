import type { ClientToServerEvents, ServerToClientEvents, FollowUpPayload, AgentQuestions } from './shared/types';
import Fastify from 'fastify';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';


const PORT = 3000;

const app = Fastify({ logger: true });
const httpServer = createServer(app.server);
const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: '*' } });


// Simple health endpoint
app.get('/health', async () => ({ ok: true }));

// WebSocket events
io.on('connection', (socket) => {
  app.log.info({ id: socket.id }, 'socket connected');

  socket.on('followup:create', (payload: { items: string[]; createdAt: number }) => {
    const items = (payload?.items ?? [])
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 8); // cap list length
    if (!items.length) return;

    const base = items.join(', ');
    // 2–4 concise, polite questions (stubbed)
    const questions = [
      `Just to confirm — are we focusing on ${base}?`,
      `Any edge cases or constraints around ${base}?`,
      `What are the success criteria for ${base}?`,
      `Any dependencies or sequencing for ${base}?`
    ].slice(0, Math.min(4, Math.max(2, items.length)));

    // Emit in order; Socket.IO preserves per-connection ordering
    for (const q of questions) {
      io.emit('agent:questions', { text: q, createdAt: Date.now() });
    }
  });

  socket.on('disconnect', () => {
    app.log.info({ id: socket.id }, 'socket disconnected');
  });
});


httpServer.listen(PORT, '0.0.0.0', () => {
  app.log.info(`Server listening on http://localhost:${PORT}`);
});
