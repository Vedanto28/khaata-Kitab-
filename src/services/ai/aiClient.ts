// Lightweight client for KhaataKitab AI edge functions

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ANON}`,
  apikey: ANON,
};

export type ChatMsg = { role: "user" | "assistant"; content: string };

export interface AIError extends Error {
  status?: number;
}

const aiError = (message: string, status?: number): AIError => {
  const err = new Error(message) as AIError;
  err.status = status;
  return err;
};

// Streaming chat — calls onDelta for each token chunk.
export async function streamChat(args: {
  messages: ChatMsg[];
  context?: string;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onDone?: () => void;
}) {
  const resp = await fetch(`${FN_BASE}/ai-chat`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ messages: args.messages, context: args.context }),
    signal: args.signal,
  });

  if (!resp.ok || !resp.body) {
    let msg = `Chat failed (${resp.status})`;
    try {
      const j = await resp.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw aiError(msg, resp.status);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: rDone, value } = await reader.read();
    if (rDone) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) args.onDelta(content);
      } catch {
        // partial JSON, restore for next chunk
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // Flush any remainder
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) args.onDelta(content);
      } catch {}
    }
  }

  args.onDone?.();
}

// One-shot helpers
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${FN_BASE}/${path}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw aiError((data as any)?.error || `Request failed (${resp.status})`, resp.status);
  }
  return data as T;
}

export interface AICategorizeResult {
  category: string;
  confidence: number;
  reason: string;
}

export const aiCategorize = (input: {
  text?: string;
  merchant?: string;
  amount?: number;
  direction?: "credit" | "debit" | "unknown";
}) => postJson<AICategorizeResult>("ai-categorize", input);

export interface AIInsightsResult {
  headline: string;
  mood: "positive" | "neutral" | "warning";
  insights: string[];
  tips: string[];
  topCategory: string;
}

export const aiInsights = (input: {
  stats: Record<string, unknown>;
  recentTransactions: unknown[];
  period?: string;
}) => postJson<AIInsightsResult>("ai-insights", input);

export interface AIReceiptResult {
  merchant: string | null;
  totalAmount: number | null;
  date: string | null;
  category: string;
  items: string[];
  paymentMethod: string | null;
  confidence: number;
}

export const aiReceipt = (imageBase64: string) =>
  postJson<AIReceiptResult>("ai-receipt", { imageBase64 });
