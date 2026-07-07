import Link from "next/link";
import {
  ArrowUp,
  Bot,
  Download,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

const historyGroups = [
  {
    label: "Today",
    chats: [{ title: "Creative Work RM 7k", active: true }],
  },
  {
    label: "Previous 7 Days",
    chats: [
      { title: "Gaming Laptop Research", active: false },
      { title: "Budget Office PC", active: false },
    ],
  },
];

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6">
      {/* Chat history sidebar */}
      <aside className="hidden w-72 flex-col rounded-3xl border bg-muted/30 p-4 md:flex">
        <button
          type="button"
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Conversation
        </button>

        <div className="flex-1 space-y-6 overflow-y-auto">
          {historyGroups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 px-2 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                {group.label}
              </h3>
              <ul className="space-y-1">
                {group.chats.map((chat) => (
                  <li key={chat.title}>
                    <button
                      type="button"
                      className={cn(
                        "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                        chat.active
                          ? "border bg-background shadow-sm"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-2 truncate pr-2">
                        <MessageSquare
                          className={cn(
                            "h-4 w-4 shrink-0",
                            chat.active
                              ? "text-primary"
                              : "text-muted-foreground/60",
                          )}
                        />
                        {chat.title}
                      </span>
                      <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-3xl border bg-card shadow-xl motion-safe:animate-fade-in-up">
        {/* Chat header */}
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 px-6 py-4 backdrop-blur">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Open chat history"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
          </div>
          <div>
            <h2 className="font-semibold">Pico</h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              PickWise AI Assistant
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-muted-foreground/60">
            <button
              type="button"
              className="transition-colors hover:text-foreground"
              title="Export Chat"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="transition-colors hover:text-red-500"
              title="Delete Chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
          <div className="my-2 text-center text-xs font-medium text-muted-foreground/50">
            Today, 14:22
          </div>

          {/* Pico message */}
          <div className="flex max-w-[85%] items-end gap-2">
            <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-muted px-5 py-3.5 text-sm leading-relaxed">
              Hey there! Pico here, your friendly tech guide from PickWise! 👋
              <br />
              <br />
              Awesome to connect with you! I&apos;m all geared up to help you
              find that perfect laptop.
              <br />
              <br />
              So, what kind of machine are you dreaming of? Are you looking for
              something for gaming, work, creative stuff, or just everyday
              browsing? And any budget in mind? Let me know, and we&apos;ll get
              this laptop hunt started! 😊
            </div>
          </div>

          {/* User message */}
          <div className="flex max-w-[85%] items-end justify-end gap-2 self-end">
            <div className="rounded-2xl rounded-br-sm bg-primary px-5 py-3.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
              Hi Pico! I need a laptop mainly for creative work like video
              editing and 3D design. My budget is around RM 7000. I prefer
              something that isn&apos;t too heavy.
            </div>
          </div>

          {/* Typing indicator */}
          <div className="flex max-w-[85%] items-end gap-2">
            <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex h-10 w-16 items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-5 py-4">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <div className="relative flex items-center">
            <button
              type="button"
              className="absolute left-4 text-muted-foreground/60 transition-colors hover:text-primary"
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="Reply to Pico..."
              className="w-full rounded-full border bg-muted/40 py-3.5 pr-14 pl-12 transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
            <Link
              href="/results"
              aria-label="Send message"
              className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <ArrowUp className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-3 text-center text-[10px] font-medium text-muted-foreground/60">
            Pico can make mistakes. Consider verifying important specs.
          </p>
        </div>
      </div>
    </main>
  );
}
