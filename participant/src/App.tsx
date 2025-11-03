import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type AgentQuestions = { text: string; createdAt: number };

export default function App() {
  const [messages, setMessages] = useState<AgentQuestions[]>([]);
  const [connected, setConnected] = useState(false);

  // Speech queue state
  const speakingRef = useRef(false);
  const queueRef = useRef<string[]>([]);

  const socket: Socket = useMemo(() => {
    const s = io('http://localhost:3000', { reconnection: true });

    s.on('connect', () => {
      setConnected(true);
      // Ask server to replay anything we missed since our last timestamp
      const lastTs = Number(localStorage.getItem('lastReceivedAt') || '0') || undefined;
      s.emit('replay:since', lastTs);
    });

    s.on('disconnect', () => setConnected(false));

    s.on('agent:questions', (data: AgentQuestions) => {
      setMessages((prev) => [...prev, data]);
      localStorage.setItem('lastReceivedAt', String(data.createdAt));
      enqueueSpeech(data.text);
    });

    return s;
  }, []);

  useEffect(() => {
    return () => {
      socket.close();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [socket]);

  function enqueueSpeech(text: string) {
    if (!('speechSynthesis' in window)) return;
    queueRef.current.push(text);
    if (!speakingRef.current) {
      speakNext();
    }
  }

  function speakNext() {
    const next = queueRef.current.shift();
    if (!next) {
      speakingRef.current = false;
      return;
    }
    const utter = new SpeechSynthesisUtterance(next);
    speakingRef.current = true;
    // Optional: pick a voice or rate here (defaults usually fine)
    // utter.rate = 1;
    utter.onend = () => {
      speakingRef.current = false;
      speakNext();
    };
    window.speechSynthesis.speak(utter);
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Participant</h2>
      <div>Ready.</div>
      <div style={{ marginTop: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            {new Date(m.createdAt).toLocaleTimeString()} — {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
