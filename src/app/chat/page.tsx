"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Brain,
  Calculator,
  Check,
  ChevronDown,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { PickScoreRing } from "@/components/pick-score-ring";
import { Input } from "@/components/ui/input";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  type AgentLaptopCard,
  type ConversationSummary,
  deleteConversation,
  getConversation,
  listConversations,
  streamAgentChat,
} from "@/lib/api/agent";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/** The agent's tools — shown as a capabilities tile; the active one lights up. */
const capabilities = [
  {
    tool: "search_laptops",
    icon: Search,
    label: "Catalog search",
    chip: "Searching the catalog",
  },
  {
    tool: "get_review_evidence",
    icon: Star,
    label: "Review evidence",
    chip: "Reading reviewer opinions",
  },
  {
    tool: "search_malaysian_market_price",
    icon: ShoppingBag,
    label: "Market prices",
    chip: "Checking Malaysian market prices",
  },
  {
    tool: "calculate_custom_apple_price",
    icon: Calculator,
    label: "Apple configurator",
    chip: "Calculating configuration price",
  },
];

const toolChipLabel = (name: string) =>
  capabilities.find((c) => c.tool === name)?.chip ?? "Working on it";

const examplePrompts = [
  "I need a light laptop for college under RM 4,500, mostly for coding",
  "Best gaming laptop around RM 6,000?",
  "What do reviewers say about the MacBook Air M5?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  /** Reasoning trace streamed during this turn — only present for turns
   * generated in this session; persisted history doesn't store it. */
  thinking?: string;
}

interface ActivityChip {
  id: number;
  tool: string;
  label: string;
  done: boolean;
}

/** Group conversations by recency for the conversations tile. */
function groupConversations(convs: ConversationSummary[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const groups: { label: string; chats: ConversationSummary[] }[] = [
    { label: "Today", chats: [] },
    { label: "Previous 7 Days", chats: [] },
    { label: "Older", chats: [] },
  ];
  for (const c of convs) {
    const age = now - new Date(c.updated_at).getTime();
    if (age < day) groups[0].chats.push(c);
    else if (age < 7 * day) groups[1].chats.push(c);
    else groups[2].chats.push(c);
  }
  return groups.filter((g) => g.chats.length > 0);
}

const isTableLine = (line: string | undefined) =>
  line != null && /^\s*\|.*\|\s*$/.test(line);
const isTableSeparator = (line: string | undefined) =>
  line != null && /^\s*\|[\s:\-|]+\|\s*$/.test(line);
const splitTableRow = (line: string) =>
  line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/**
 * Minimal markdown for agent replies (headings, **bold**, bullets, tables) —
 * enough for Pico's formatting without a markdown dependency or raw HTML.
 *
 * With `animate`, every word is wrapped in a fade-in span. Index keys keep
 * already-rendered words' DOM stable as streamed text appends, so the
 * animation only plays on newly arrived words (the growing last word updates
 * in place without replaying).
 */
function renderMarkdownLite(text: string, animate = false) {
  const words = (s: string) =>
    animate
      ? s.split(/(?<=\s)/).map((w, i) => (
          <span key={i} className="motion-safe:animate-token-in">
            {w}
          </span>
        ))
      : s;

  const bold = (line: string, key: number) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={key}>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <strong key={i}>{words(p)}</strong>
          ) : (
            <span key={i}>{words(p)}</span>
          ),
        )}
      </span>
    );
  };

  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table block: consecutive |…| lines (models sometimes emit blank lines
    // between rows — tolerate them when another table row follows).
    if (isTableLine(line)) {
      const rows: string[] = [];
      let j = i;
      while (j < lines.length) {
        if (isTableLine(lines[j])) {
          rows.push(lines[j]);
          j++;
        } else if (lines[j].trim() === "") {
          const next = lines.slice(j + 1).find((l) => l.trim() !== "");
          if (isTableLine(next)) j++;
          else break;
        } else break;
      }
      const hasSeparator = rows.length >= 2 && isTableSeparator(rows[1]);
      if (hasSeparator) {
        const header = splitTableRow(rows[0]);
        const body = rows.slice(2).filter((r) => !isTableSeparator(r)).map(splitTableRow);
        out.push(
          <div key={i} className="border-line my-2 overflow-x-auto rounded-xl border">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-surface border-line border-b">
                  {header.map((h, k) => (
                    <th
                      key={k}
                      className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    >
                      {bold(h, 0)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, r) => (
                  <tr key={r} className="border-line border-b last:border-0">
                    {row.map((cell, k) => (
                      <td
                        key={k}
                        className={cn(
                          "px-3 py-2 align-top tabular-nums",
                          k === 0 && "font-medium whitespace-nowrap",
                        )}
                      >
                        {bold(cell, 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        i = j;
        continue;
      }
    }

    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      out.push(
        <p key={i} className="mt-2 mb-1 font-semibold first:mt-0">
          {bold(heading[1], 0)}
        </p>,
      );
    } else {
      const bullet = line.match(/^\s*[-*]\s+(.*)/);
      if (bullet) {
        out.push(
          <p key={i} className="flex gap-2 pl-1">
            <span className="text-brand">•</span>
            <span>{bold(bullet[1], 0)}</span>
          </p>,
        );
      } else if (line.trim() === "") {
        out.push(<div key={i} className="h-2" />);
      } else {
        out.push(<p key={i}>{bold(line, 0)}</p>);
      }
    }
    i++;
  }

  return out;
}

/** Live reasoning trace for the in-flight turn — auto-follows the newest text. */
function ThinkingFlow({ text, active }: { text: string; active: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [text]);

  return (
    <div className="border-line bg-surface-2 w-full rounded-2xl border px-4 py-3">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold text-muted-foreground">
        <Brain className="text-brand h-3.5 w-3.5" />
        Thinking
        {active && (
          <span className="border-brand-tint border-t-brand h-3 w-3 animate-spin rounded-full border-2" />
        )}
      </div>
      <div
        ref={bodyRef}
        className="mt-2 max-h-36 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground"
      >
        {text.split(/(?<=\s)/).map((w, i) => (
          <span key={i} className="motion-safe:animate-token-in">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Collapsed reasoning trace attached to a finished assistant message. */
function ThinkingDisclosure({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 self-start text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Brain className="h-3.5 w-3.5" />
        Thinking
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-line bg-surface-2 max-h-48 overflow-y-auto rounded-2xl border px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {text}
        </div>
      )}
    </div>
  );
}

function formatPrice(price: number | null) {
  if (price == null || price <= 0) return "Price not on record";
  return `RM ${Math.round(price).toLocaleString("en-MY")}`;
}

/** Compact shortlist tile fed by real agent data (name, price, PickScore). */
function ResultCard({ laptop }: { laptop: AgentLaptopCard }) {
  return (
    <Link
      href={`/laptops/${laptop.laptop_id}`}
      className="group border-line bg-surface-2 flex items-center gap-3.5 rounded-2xl border px-4 py-3 transition-all duration-300 hover:shadow-lg motion-safe:hover:scale-[1.02]"
    >
      {laptop.image_url && (
        <div className="flex h-11 w-14 flex-none items-center justify-center overflow-hidden rounded-lg bg-white">
          <Image
            src={laptop.image_url}
            alt={laptop.product_name}
            width={112}
            height={88}
            className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
          />
        </div>
      )}
      {laptop.pick_score != null && (
        <PickScoreRing score={laptop.pick_score} size={42} caption="none" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold">
          {laptop.product_name}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {laptop.similarity_score != null &&
            `${Math.round(laptop.similarity_score * 100)}% match · `}
          <span
            className={cn(
              "tabular-nums",
              laptop.price_rm && laptop.price_rm > 0
                ? "font-semibold text-foreground"
                : "italic",
            )}
          >
            {formatPrice(laptop.price_rm)}
          </span>
        </span>
      </div>
      <span className="text-brand text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [laptops, setLaptops] = useState<AgentLaptopCard[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [thinkingText, setThinkingText] = useState("");
  const [activity, setActivity] = useState<ActivityChip[]>([]);

  const streamTextRef = useRef("");
  const thinkingRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const chipId = useRef(0);

  // Auth-gated page: bounce anonymous visitors to /login.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listConversations(token)
      .then((cs) => {
        if (!cancelled) setConversations(cs);
      })
      .catch(() => {
        // Sidebar load is best-effort.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Abort an in-flight stream when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  const refreshConversations = () => {
    if (!token) return;
    listConversations(token)
      .then(setConversations)
      .catch(() => {});
  };

  const selectConversation = async (id: string) => {
    if (!token || isStreaming || id === activeId) return;
    setActiveId(id);
    setLaptops([]);
    setThreadLoading(true);
    try {
      const conv = await getConversation(id, token);
      setMessages(
        conv.messages.map((m) => ({ role: m.role, content: m.content })),
      );
    } catch {
      setMessages([
        {
          role: "assistant",
          content: "Couldn't load this conversation. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setThreadLoading(false);
    }
  };

  const startNewConversation = () => {
    if (isStreaming) return;
    setActiveId(null);
    setMessages([]);
    setLaptops([]);
  };

  const removeConversation = async (id: string) => {
    if (!token || isStreaming) return;
    try {
      await deleteConversation(id, token);
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (id === activeId) startNewConversation();
    } catch {
      // Leave the row; a later refresh will reconcile.
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !token || isStreaming) return;

    setInput("");
    setMessages((ms) => [...ms, { role: "user", content: text }]);
    setLaptops([]);
    setActivity([]);
    setStreamText("");
    setThinkingText("");
    streamTextRef.current = "";
    thinkingRef.current = "";
    setIsStreaming(true);

    const finishChips = () =>
      setActivity((a) => a.map((c) => ({ ...c, done: true })));

    const finalize = (content: string, isError = false) => {
      if (content) {
        setMessages((ms) => [
          ...ms,
          {
            role: "assistant",
            content,
            isError,
            thinking: thinkingRef.current || undefined,
          },
        ]);
      }
      setStreamText("");
      setThinkingText("");
      streamTextRef.current = "";
      thinkingRef.current = "";
      finishChips();
      setIsStreaming(false);
    };

    abortRef.current = new AbortController();
    try {
      await streamAgentChat(
        text,
        activeId,
        token,
        {
          onMeta: (id) => setActiveId((cur) => cur ?? id),
          onToken: (t) => {
            finishChips();
            streamTextRef.current += t;
            setStreamText(streamTextRef.current);
          },
          onThinking: (t) => {
            thinkingRef.current += t;
            setThinkingText(thinkingRef.current);
          },
          onTurnReset: () => {
            streamTextRef.current = "";
            setStreamText("");
          },
          onTool: (name) => {
            setActivity((a) => [
              ...a.map((c) => ({ ...c, done: true })),
              {
                id: chipId.current++,
                tool: name,
                label: toolChipLabel(name),
                done: false,
              },
            ]);
          },
          onDone: (_id, cards) => {
            finalize(streamTextRef.current);
            setLaptops(cards);
            refreshConversations();
          },
          onError: (detail) => finalize(detail, true),
        },
        abortRef.current.signal,
      );
      // Stream ended without done/error (connection dropped): keep whatever
      // streamed rather than losing the turn.
      if (streamTextRef.current) finalize(streamTextRef.current);
      else setIsStreaming(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        finalize(
          e instanceof Error ? e.message : "The agent is unavailable right now.",
          true,
        );
      }
    }
  };

  if (isLoading || !user || !token) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-brand h-6 w-6 animate-spin" />
      </main>
    );
  }

  const showEmptyState = messages.length === 0 && !threadLoading && !isStreaming;
  const activeTool = activity.find((c) => !c.done)?.tool ?? null;

  const shortlist = (
    <>
      {laptops.map((l) => (
        <ResultCard key={l.laptop_id} laptop={l} />
      ))}
    </>
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-10 pb-5 sm:px-6">
      {/* Bento workspace: conversations | thread | Pico + shortlist rail */}
      <div className="grid h-[calc(100vh-154px)] grid-cols-1 gap-5 md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        {/* Tile: conversations */}
        <aside className="border-line bg-surface hidden min-h-0 flex-col rounded-3xl border p-4 motion-safe:animate-fade-in-up md:flex">
          <button
            type="button"
            onClick={startNewConversation}
            className="border-line bg-canvas mb-4 flex items-center justify-center gap-2 rounded-full border py-2.5 text-[13px] font-semibold transition-colors hover:border-brand hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" /> New Conversation
          </button>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
            {groupConversations(conversations).map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </span>
                {group.chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "group flex items-center justify-between rounded-[10px] pr-2 transition-colors",
                      chat.id === activeId
                        ? "bg-brand-tint text-brand"
                        : "hover:bg-surface-2 text-foreground",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(chat.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 truncate px-3 py-2.5 text-left text-[13px] font-medium"
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{chat.title}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete "${chat.title}"`}
                      onClick={() => removeConversation(chat.id)}
                      className="hover:text-negative shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="px-2.5 text-xs text-muted-foreground">
                No conversations yet — your chats with Pico will appear here.
              </p>
            )}
          </div>
        </aside>

        {/* Tile: thread */}
        <section
          className="border-line bg-surface flex min-h-0 flex-col overflow-hidden rounded-3xl border motion-safe:animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          {/* Tile header */}
          <div className="border-line flex items-center gap-3 border-b px-5 py-3.5">
            <div className="bg-brand flex h-9 w-9 items-center justify-center rounded-full text-white">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] leading-tight font-semibold">Pico</span>
              <span className="text-[11.5px] text-muted-foreground">
                {isStreaming ? "Working on it…" : "AI laptop advisor"}
              </span>
            </div>
            {isStreaming && (
              <span className="border-brand-tint border-t-brand ml-auto h-3.5 w-3.5 animate-spin rounded-full border-2" />
            )}
          </div>

          {/* Messages — MessageScroller follows streamed output at the live
              edge but stops when the user scrolls up to read. */}
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller className="flex-1">
              <MessageScrollerViewport className="px-4 pt-6 pb-4 sm:px-6">
                <MessageScrollerContent className="mx-auto w-full max-w-[680px] gap-5">
              {showEmptyState && (
                <div className="flex flex-col items-center gap-5 pt-14 text-center">
                  <div className="bg-brand flex h-12 w-12 items-center justify-center rounded-full text-white">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Hi, I&apos;m Pico</h1>
                    <p className="mt-1 text-[13.5px] text-muted-foreground">
                      Tell me what you need and your budget — I&apos;ll search the
                      catalog, check reviews, and compare real market prices.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {examplePrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => send(p)}
                        className="border-brand text-brand hover:bg-brand-tint rounded-full border px-4 py-2 text-[13px] font-medium"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {threadLoading && (
                <div className="flex justify-center pt-14">
                  <Loader2 className="text-brand h-5 w-5 animate-spin" />
                </div>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <MessageScrollerItem key={i} messageId={`m-${i}`} scrollAnchor>
                    <div className="flex justify-end">
                      <div className="bg-brand max-w-[70%] rounded-[20px] rounded-br-[4px] px-4.5 py-3 text-[14.5px] leading-relaxed text-white">
                        {m.content}
                      </div>
                    </div>
                  </MessageScrollerItem>
                ) : (
                  <MessageScrollerItem key={i} messageId={`m-${i}`}>
                    <div className="flex items-start gap-3">
                    <div className="bg-brand mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex max-w-[85%] flex-col gap-1.5">
                      <span className="text-[11.5px] font-semibold text-muted-foreground">
                        Pico
                      </span>
                      {m.thinking && <ThinkingDisclosure text={m.thinking} />}
                      <div
                        className={cn(
                          "bg-surface-2 rounded-[20px] rounded-bl-[4px] px-4.5 py-3.5 text-[14.5px] leading-relaxed",
                          m.isError && "border border-dashed border-line",
                        )}
                      >
                        {renderMarkdownLite(m.content)}
                      </div>
                    </div>
                    </div>
                  </MessageScrollerItem>
                ),
              )}

              {/* Thinking flow + tool activity for the in-flight turn */}
              {isStreaming && (
                <MessageScrollerItem
                  messageId="live-activity"
                  className="flex flex-col items-start gap-2 pl-11"
                >
                  {thinkingText && (
                    <ThinkingFlow text={thinkingText} active={!streamText} />
                  )}
                  {activity.map((chip) =>
                    chip.done ? (
                      <GlassSurface
                        key={chip.id}
                        cornerRadius={999}
                        className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-muted-foreground"
                      >
                        <Check className="text-positive h-3 w-3" strokeWidth={2.6} />
                        {chip.label}
                      </GlassSurface>
                    ) : (
                      <div
                        key={chip.id}
                        className="motion-safe:animate-shimmer flex items-center gap-2 rounded-full border border-line bg-[linear-gradient(100deg,var(--glass)_40%,var(--brand-tint)_50%,var(--glass)_60%)] bg-[length:200%_100%] px-3.5 py-1.5 text-xs text-muted-foreground shadow-[0_4px_16px_var(--shadow)]"
                      >
                        <span className="border-brand-tint border-t-brand h-3 w-3 animate-spin rounded-full border-2" />
                        {chip.label}…
                      </div>
                    ),
                  )}
                  {activity.length === 0 && !streamText && !thinkingText && (
                    <div className="motion-safe:animate-shimmer flex items-center gap-2 rounded-full border border-line bg-[linear-gradient(100deg,var(--glass)_40%,var(--brand-tint)_50%,var(--glass)_60%)] bg-[length:200%_100%] px-3.5 py-1.5 text-xs text-muted-foreground shadow-[0_4px_16px_var(--shadow)]">
                      <span className="border-brand-tint border-t-brand h-3 w-3 animate-spin rounded-full border-2" />
                      Pico is thinking…
                    </div>
                  )}
                </MessageScrollerItem>
              )}

              {/* Streaming reply bubble */}
              {isStreaming && streamText && (
                <MessageScrollerItem
                  messageId="live-reply"
                  className="flex items-start gap-3"
                >
                  <div className="bg-brand mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex max-w-[85%] flex-col gap-1.5">
                    <span className="text-[11.5px] font-semibold text-muted-foreground">
                      Pico
                    </span>
                    <div className="bg-surface-2 rounded-[20px] rounded-bl-[4px] px-4.5 py-3.5 text-[14.5px] leading-relaxed">
                      {renderMarkdownLite(streamText, true)}
                    </div>
                  </div>
                </MessageScrollerItem>
              )}

              {/* Shortlist inline — only when the rail is hidden (< lg) */}
              {laptops.length > 0 && (
                <MessageScrollerItem
                  messageId="shortlist"
                  className="ml-11 flex flex-col gap-3 lg:hidden"
                >
                  {shortlist}
                </MessageScrollerItem>
              )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="rounded-full" />
            </MessageScroller>
          </MessageScrollerProvider>

          {/* Composer */}
          <div className="px-4 pt-2 pb-4 sm:px-6">
            <div className="mx-auto max-w-[680px]">
              <GlassSurface cornerRadius={999} fullWidth>
                <form
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isStreaming ? "Pico is replying…" : "Message Pico…"}
                    aria-label="Message Pico"
                    disabled={isStreaming}
                    className="h-[52px] rounded-full border-0 bg-transparent py-0 pr-16 pl-6 text-[14.5px] md:text-[14.5px] focus-visible:ring-0 disabled:bg-transparent disabled:opacity-60 dark:bg-transparent dark:disabled:bg-transparent"
                  />
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={isStreaming || !input.trim()}
                    className="bg-brand absolute top-[6px] right-[6px] flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </GlassSurface>
              <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
                Pico can make mistakes. Consider verifying important specs.
              </p>
            </div>
          </div>
        </section>

        {/* Rail: Pico capabilities + shortlist (lg+) */}
        <div className="hidden min-h-0 flex-col gap-5 lg:flex">
          <div
            className="border-line bg-surface rounded-3xl border p-5 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <h2 className="text-[13px] font-semibold tracking-tight">
              What Pico can do
            </h2>
            <p className="mt-0.5 mb-3 text-[11.5px] text-muted-foreground">
              Every answer is grounded in these live tools.
            </p>
            <div className="flex flex-col gap-1.5">
              {capabilities.map(({ tool, icon: Icon, label }) => (
                <div
                  key={tool}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                    activeTool === tool
                      ? "bg-brand-tint text-brand"
                      : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "bg-surface-2 flex h-7 w-7 items-center justify-center rounded-lg",
                      activeTool === tool && "bg-brand text-white",
                    )}
                  >
                    {activeTool === tool ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div
            className="border-line bg-surface flex min-h-0 flex-1 flex-col rounded-3xl border p-5 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold tracking-tight">
                Current shortlist
              </h2>
              {laptops.length > 0 && (
                <span className="text-[11.5px] text-muted-foreground tabular-nums">
                  {laptops.length}
                </span>
              )}
            </div>
            {laptops.length > 0 ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
                {shortlist}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                When Pico finds laptops that fit, they land here with their
                PickScore — tap one for full specs and price history.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
