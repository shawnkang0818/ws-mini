// Add shared TypeScript types
// shared/types.ts
export type FollowUpPayload = { items: string[]; createdAt: number };
export type AgentQuestions = { text: string; createdAt: number; streamId?: string };

export interface ClientToServerEvents {
  "followup:create": (payload: FollowUpPayload) => void;
  "replay:since": (since?: number) => void; // will use in redis stream
}
export interface ServerToClientEvents {
  "agent:questions": (data: AgentQuestions) => void;
}

