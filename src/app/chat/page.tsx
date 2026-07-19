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
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { PickScoreRing } from "@/components/pick-score-ring";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  getConversationLaptops,
  listConversations,
  renameConversation,
  streamAgentChat,
} from "@/lib/api/agent";
import { calculatePersonalScoreBatch } from "@/lib/api/pickscore";
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

// const examplePrompts = [
//   "I need a light laptop for college under RM 4,500, mostly for coding",
//   "Best gaming laptop around RM 6,000?",
//   "What do reviewers say about the MacBook Air M5?",
// ];

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
 * Minimal markdown for agent replies (headings, **bold**, bullets, tables,
 * [links](url)) — enough for Pico's formatting without a markdown dependency
 * or raw HTML.
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

  // [label](url) → anchor; everything else falls through to bold(). While a
  // link is still streaming in (no closing paren yet) it renders as plain
  // text and converts once complete.
  const inline = (line: string, key: number) => {
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let k = 0;
    for (let m = linkRe.exec(line); m !== null; m = linkRe.exec(line)) {
      if (m.index > last) parts.push(bold(line.slice(last, m.index), k++));
      parts.push(
        <a
          key={k++}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-medium underline underline-offset-2 hover:opacity-80"
        >
          {words(m[1])}
        </a>,
      );
      last = m.index + m[0].length;
    }
    if (last === 0) return bold(line, key);
    if (last < line.length) parts.push(bold(line.slice(last), k++));
    return <span key={key}>{parts}</span>;
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
                      {inline(h, 0)}
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
                        {inline(cell, 0)}
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
          {inline(heading[1], 0)}
        </p>,
      );
    } else {
      const bullet = line.match(/^\s*[-*]\s+(.*)/);
      if (bullet) {
        out.push(
          <p key={i} className="flex gap-2 pl-1">
            <span className="text-brand">•</span>
            <span>{inline(bullet[1], 0)}</span>
          </p>,
        );
      } else if (line.trim() === "") {
        out.push(<div key={i} className="h-2" />);
      } else {
        out.push(<p key={i}>{inline(line, 0)}</p>);
      }
    }
    i++;
  }

  return out;
}

/** Live reasoning trace for the in-flight turn — auto-follows the newest
 * text; collapsible via its header (collapsed by default). */
function ThinkingFlow({ text, active }: { text: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [text, open]);

  return (
    <div className="border-line bg-surface-2 w-full rounded-2xl border px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Brain className="text-brand h-3.5 w-3.5" />
        Thinking
        {active && (
          <span className="border-brand-tint border-t-brand h-3 w-3 animate-spin rounded-full border-2" />
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
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
      )}
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

/** Compact shortlist tile fed by real agent data (name, price, PickScore).
 * When `personalScore` is set, the ring shows it instead of the stored
 * general-mode score, marked with a small person badge. */
function ResultCard({
  laptop,
  personalScore,
}: {
  laptop: AgentLaptopCard;
  personalScore?: number;
}) {
  const ringScore = personalScore ?? laptop.pick_score;
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
      {ringScore != null && (
        <span
          className="relative flex-none"
          title={
            personalScore != null
              ? "Personalized PickScore — weighted from your Needs Wizard answers"
              : undefined
          }
        >
          <PickScoreRing score={ringScore} size={42} caption="none" />
          {personalScore != null && (
            <span className="bg-brand absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full text-white">
              <UserRound className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
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
  const { user, token, isLoading, hasPreferences } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [laptops, setLaptops] = useState<AgentLaptopCard[]>([]);
  // laptop_id -> personalized PickScore, overlaying the stored general-mode
  // scores. null = personalization off (guest / no wizard prefs / failed).
  const [personalScores, setPersonalScores] = useState<Record<string, number> | null>(null);
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
  // Guards personalization against stale batch responses after the
  // shortlist changed (e.g. switching conversations mid-request).
  const personalizeSeq = useRef(0);

  /** Overlay personalized PickScores onto a fresh shortlist (best-effort). */
  const personalizeShortlist = (cards: AgentLaptopCard[]) => {
    const seq = ++personalizeSeq.current;
    setPersonalScores(null);
    if (!token || !user || hasPreferences !== true || cards.length === 0) return;
    calculatePersonalScoreBatch(
      cards.map((c) => c.laptop_id),
      user.id,
      token,
    )
      .then((res) => {
        if (seq !== personalizeSeq.current) return;
        const map: Record<string, number> = {};
        for (const r of res.results) {
          if (r.mode === "personalized") map[r.product_id] = r.score;
        }
        setPersonalScores(Object.keys(map).length > 0 ? map : null);
      })
      .catch(() => {
        // General-mode scores remain — personalization is an overlay only.
      });
  };

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
      // Shortlist restore is best-effort — an empty rail must not block the thread.
      const [conv, cards] = await Promise.all([
        getConversation(id, token),
        getConversationLaptops(id, token).catch(() => [] as AgentLaptopCard[]),
      ]);
      setMessages(
        conv.messages.map((m) => ({ role: m.role, content: m.content })),
      );
      setLaptops(cards);
      personalizeShortlist(cards);
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
    setPersonalScores(null);
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

  // Rename dialog state — target row, draft title, and save status.
  const [renameTarget, setRenameTarget] = useState<ConversationSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const openRename = (chat: ConversationSummary) => {
    setRenameTarget(chat);
    setRenameTitle(chat.title);
    setRenameError(null);
  };

  const saveRename = async () => {
    const title = renameTitle.trim();
    if (!token || !renameTarget || !title || renameSaving) return;
    setRenameSaving(true);
    setRenameError(null);
    try {
      const updated = await renameConversation(renameTarget.id, title, token);
      setConversations((cs) =>
        cs.map((c) => (c.id === updated.id ? { ...c, title: updated.title } : c)),
      );
      setRenameTarget(null);
    } catch (e) {
      setRenameError(
        e instanceof Error ? e.message : "Couldn't rename the conversation.",
      );
    } finally {
      setRenameSaving(false);
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
            personalizeShortlist(cards);
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
      {personalScores && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <UserRound className="text-brand mt-px h-3 w-3 flex-none" />
          PickScores personalized from your Needs Wizard answers — your
          budget, priorities and portability reweight each factor.
        </p>
      )}
      {laptops.map((l) => (
        <ResultCard
          key={l.laptop_id}
          laptop={l}
          personalScore={personalScores?.[l.laptop_id]}
        />
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Actions for "${chat.title}"`}
                        className="shrink-0 cursor-pointer rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" sideOffset={4} className="w-36">
                        <DropdownMenuItem
                          onClick={() => openRename(chat)}
                          className="cursor-pointer gap-2 text-[12.5px] font-medium"
                        >
                          <Pencil className="size-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => removeConversation(chat.id)}
                          className="cursor-pointer gap-2 text-[12.5px] font-medium data-[variant=destructive]:text-negative data-[variant=destructive]:focus:bg-negative/10 data-[variant=destructive]:focus:text-negative"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
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
                    {/* {examplePrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => send(p)}
                        className="border-brand text-brand hover:bg-brand-tint rounded-full border px-4 py-2 text-[13px] font-medium"
                      >
                        {p}
                      </button>
                    ))} */}
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
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter breaks a line; never send
                      // mid-IME-composition (Chinese/Japanese input).
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={isStreaming ? "Pico is replying…" : "Message Pico…"}
                    aria-label="Message Pico"
                    disabled={isStreaming}
                    rows={1}
                    className="max-h-40 min-h-[52px] resize-none rounded-[26px] border-0 bg-transparent py-[15px] pr-16 pl-6 text-[14.5px] leading-[22px] md:text-[14.5px] focus-visible:ring-0 disabled:bg-transparent disabled:opacity-60 dark:bg-transparent dark:disabled:bg-transparent"
                  />
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={isStreaming || !input.trim()}
                    className="bg-brand absolute right-[6px] bottom-[6px] flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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
                      <Icon className="text-brand h-3.5 w-3.5" />
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

      {/* Rename-conversation dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRenameTarget(null);
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogTitle className="font-sans text-[15px] font-semibold tracking-tight">
            Rename conversation
          </DialogTitle>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveRename();
            }}
          >
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              maxLength={60}
              autoFocus
              aria-label="Conversation title"
              className="border-line bg-canvas dark:bg-canvas h-11 rounded-xl border px-4 text-[13.5px] md:text-[13.5px] transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0"
            />
            {renameError && (
              <p className="text-negative text-[12px] font-medium">{renameError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameTitle.trim() || renameSaving}
                className="bg-brand rounded-full text-white transition-opacity hover:bg-brand hover:opacity-90"
              >
                {renameSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
