import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import ReactMarkdown from "react-markdown";
import { db } from "@/lib/db";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, Trash2 } from "lucide-react";
import { streamChat, type ChatMsg } from "@/lib/ai-client";
import { toast } from "sonner";
import { formatINR } from "@/lib/indian-currency-formatter";

const STORAGE_KEY = "ai-assistant-history";

const SUGGESTED_PROMPTS = [
  "How am I spending this month?",
  "Where can I save money?",
  "Show top 3 expense categories",
  "Predict next week's cashflow",
];

export default function AIAssistant() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Build a compact financial context for the model
  const context = useMemo(() => {
    if (!transactions || transactions.length === 0) return "User has no transactions yet.";
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTx = transactions.filter(t => new Date(t.date) >= monthStart);
    const income = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const byCat: Record<string, number> = {};
    monthTx.filter(t => t.type === "expense").forEach(t => {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const recent = transactions.slice(-15).map(t => ({
      date: new Date(t.date).toISOString().slice(0, 10),
      type: t.type, amount: t.amount, category: t.category,
      description: t.description?.slice(0, 40),
    }));
    return JSON.stringify({
      monthIncome: income,
      monthExpense: expense,
      monthNet: income - expense,
      transactionCount: monthTx.length,
      topExpenseCategories: topCats,
      recent,
    }, null, 2);
  }, [transactions]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMsg = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m);
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    abortRef.current = new AbortController();
    try {
      await streamChat({
        messages: [...messages, userMsg],
        context,
        signal: abortRef.current.signal,
        onDelta: upsert,
        onDone: () => setLoading(false),
      });
    } catch (e: any) {
      setLoading(false);
      if (e?.status === 429) toast.error("Too many requests. Please wait a moment.");
      else if (e?.status === 402) toast.error("AI credits exhausted. Add credits in workspace settings.");
      else toast.error(e?.message || "Failed to get a reply");
    }
  };

  const clear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const monthExpense = useMemo(() => {
    if (!transactions) return 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    return transactions.filter(t => t.type === "expense" && new Date(t.date) >= monthStart)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">
                {transactions?.length ?? 0} txns · {formatINR(monthExpense)} this month
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear chat">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <Bot className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Hi! I'm your KhaataKitab AI.</p>
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about your spending, income, or get tips to save money.
                      I can see your recent transactions to give you specific answers.
                    </p>
                  </div>
                </div>
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="text-left text-sm p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-card border border-border">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-background/95 backdrop-blur z-20">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="max-w-2xl mx-auto px-4 py-3 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
