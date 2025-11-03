import type { ClientToServerEvents, ServerToClientEvents, FollowUpPayload, AgentQuestions } from './shared/types';
import Fastify from 'fastify';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';


const PORT = 3000;

const app = Fastify({ logger: true });
const httpServer = createServer(app.server);
const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

// In-memory replay buffer (lightweight)
const recentMessages: AgentQuestions[] = [];
const MAX_BUFFER = 200; // keep last N messages in memory

// Simple health endpoint
app.get('/health', async () => ({ ok: true }));

// WebSocket events
io.on('connection', (socket) => {
  app.log.info({ id: socket.id }, 'socket connected');

  // Lightweight replay using timestamps
  socket.on('replay:since', (since?: number) => {
    const cutoff = typeof since === 'number' ? since : 0;
    const missed = recentMessages.filter(m => m.createdAt > cutoff).slice(-MAX_BUFFER);
    for (const m of missed) {
      socket.emit('agent:questions', m);
    }
  });

  socket.on('followup:create', (payload: FollowUpPayload) => {
    const items = (payload?.items ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 8);
    if (!items.length) return;

    const base = items.join(', ');
    const questions = [
      `Just to confirm — are we focusing on ${base}?`,
      `Any edge cases or constraints around ${base}?`,
      `What are the success criteria for ${base}?`,
      `Any dependencies or sequencing for ${base}?`,
    ].slice(0, Math.min(4, Math.max(2, items.length)));

    for (const q of questions) {
      const msg: AgentQuestions = { text: q, createdAt: Date.now() };

      // buffer for replay
      recentMessages.push(msg);
      if (recentMessages.length > MAX_BUFFER) recentMessages.shift();

      // broadcast to ALL clients (Reviewer + Participant)
      io.emit('agent:questions', msg);
    }
  });

  socket.on('disconnect', () => {
    app.log.info({ id: socket.id }, 'socket disconnected');
  });
});


httpServer.listen(PORT, '0.0.0.0', () => {
  app.log.info(`Server listening on http://localhost:${PORT}`);
});
