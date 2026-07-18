import { API_BASE_URL, ApiError, apiFetch } from "./client";

/** Shortlist entry returned by the agent — mirrors backend AgentLaptopCard. */
export interface AgentLaptopCard {
  laptop_id: string;
  product_name: string;
  price_rm: number | null;
  pick_score: number | null;
  similarity_score: number | null;
  /** First catalog photo; optional so a not-yet-redeployed backend still parses. */
  image_url?: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ConversationRead extends ConversationSummary {
  messages: ConversationMessage[];
}

export function listConversations(token: string) {
  return apiFetch<ConversationSummary[]>("/conversations/", {
    token,
    cache: "no-store",
  });
}

export function getConversation(id: string, token: string) {
  return apiFetch<ConversationRead>(`/conversations/${id}`, {
    token,
    cache: "no-store",
  });
}

/** Rename a conversation; the backend trims and caps the title at 60 chars. */
export function renameConversation(id: string, title: string, token: string) {
  return apiFetch<ConversationSummary>(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
    token,
  });
}

export function deleteConversation(id: string, token: string) {
  return apiFetch<void>(`/conversations/${id}`, {
    method: "DELETE",
    token,
  });
}

/** The conversation's persisted shortlist — same cards the `done` event carries. */
export function getConversationLaptops(id: string, token: string) {
  return apiFetch<AgentLaptopCard[]>(`/conversations/${id}/laptops`, {
    token,
    cache: "no-store",
  });
}

/** Callbacks for the SSE events of POST /agent/chat/stream. */
export interface AgentStreamCallbacks {
  /** First event — the (possibly new) conversation id. */
  onMeta?: (conversationId: string) => void;
  /** One streamed token of the assistant reply. */
  onToken?: (text: string) => void;
  /** One delta of the model's internal reasoning (thinking flow). */
  onThinking?: (text: string) => void;
  /** The streamed text so far was an internal tool-call turn — discard it. */
  onTurnReset?: () => void;
  /** A tool call started (activity indicator). */
  onTool?: (name: string) => void;
  /** Terminal success: final shortlist for score cards. */
  onDone?: (conversationId: string, laptops: AgentLaptopCard[]) => void;
  /** Terminal failure (stream already started, HTTP status was 200). */
  onError?: (detail: string) => void;
}

interface AgentStreamEvent {
  type: "meta" | "token" | "thinking" | "turn_reset" | "tool" | "done" | "error";
  conversation_id?: string;
  text?: string;
  name?: string;
  laptops?: AgentLaptopCard[];
  detail?: string;
}

/**
 * Stream one chat turn. EventSource can't send POST bodies or Authorization
 * headers, so this reads the SSE body off a plain fetch. Resolves when the
 * stream ends; pre-stream HTTP failures (401, 503, …) throw ApiError.
 */
export async function streamAgentChat(
  message: string,
  conversationId: string | null,
  token: string,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/agent/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId ?? undefined,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body.detail === "string"
        ? body.detail
        : `Chat request failed with ${res.status}`;
    throw new ApiError(res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handle = (ev: AgentStreamEvent) => {
    switch (ev.type) {
      case "meta":
        if (ev.conversation_id) callbacks.onMeta?.(ev.conversation_id);
        break;
      case "token":
        if (ev.text) callbacks.onToken?.(ev.text);
        break;
      case "thinking":
        if (ev.text) callbacks.onThinking?.(ev.text);
        break;
      case "turn_reset":
        callbacks.onTurnReset?.();
        break;
      case "tool":
        if (ev.name) callbacks.onTool?.(ev.name);
        break;
      case "done":
        callbacks.onDone?.(ev.conversation_id ?? "", ev.laptops ?? []);
        break;
      case "error":
        callbacks.onError?.(ev.detail ?? "The agent is unavailable.");
        break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; a chunk may end mid-frame,
    // so only complete frames leave the buffer.
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          handle(JSON.parse(line.slice(6)) as AgentStreamEvent);
        } catch {
          // Malformed frame — skip rather than kill the stream.
        }
      }
    }
  }
}
