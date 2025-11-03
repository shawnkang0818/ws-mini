import type { FollowUpPayload, AgentQuestions, ServerToClientEvents, ClientToServerEvents } from '../../shared/types';
import { useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type FollowUpPayload = { items: string[]; createdAt: number };
type AgentQuestions = { text: string; createdAt: number };

export default function App() {
  const [text, setText] = useState('latency, retry logic, error states');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ack'>('idle');
  const [response, setResponse] = useState<string>('—');

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = useMemo(() => {
    const s = io('http://localhost:3000');
    s.on('connect', () => console.log('Reviewer connected:', s.id));
    s.on('agent:questions', (data: AgentQuestions) => {
      setStatus('ack');
      setResponse(data.text);
    });
    return s;
  }, []);

  const normalize = (raw: string) =>
    raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 8);

  const send = () => {
    const items = normalize(text);
    if (!items.length) return;
    setStatus('sending');
    const payload: FollowUpPayload = { items, createdAt: Date.now() };
    socket.emit('followup:create', payload);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Reviewer</h2>
      <p>Enter items (comma-separated):</p>
      <textarea
        rows={4}
        style={{ width: 420 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <button onClick={send} style={{ marginTop: 12 }}>Send</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <strong>Status:</strong> {status}
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Response:</strong> {response}
      </div>
    </div>
  );
}
