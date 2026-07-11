import { useEffect, useMemo, useRef, useState } from "react";
import { SEO } from '@/components/common/SEO';
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import ReactMarkdown from "react-markdown";
import { db } from "@/database/db";
import { BottomNav } from "@/components/common/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, Trash2 } from "lucide-react";
import { streamChat, type ChatMsg } from "@/services/ai/aiClient";
import { toast } from "sonner";
import { formatIndianCurrency } from "@/lib/utils/indianCurrencyFormatter";
import { 
  generateFinancialProfile, 
  calculateFinancialHealthScore, 
  generateSmartInsights 
} from "@/services/ai/financialCopilot";

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
    
    const profile = generateFinancialProfile(transactions);
    const health = calculateFinancialHealthScore(transactions);
    const insights = generateSmartInsights(transactions);

    // Get recent transactions to pass as context
    const recent = transactions.slice(-15).map(t => ({
      date: new Date(t.date).toISOString().slice(0, 10),
      type: t.type, 
      amount: t.amount, 
      category: t.category,
      description: t.merchantCanonical || t.description || 'Unknown',
    }));

    // Calculate merchant frequencies from last 50 transactions
    const merchantFreq: Record<string, number> = {};
    transactions.slice(-50).forEach(t => {
      if (t.type === 'expense') {
        const name = t.merchantCanonical || t.description || 'Unknown';
        merchantFreq[name] = (merchantFreq[name] || 0) + 1;
      }
    });

    return JSON.stringify({
      financialProfile: profile,
      financialHealthScore: {
        score: health.score,
        rating: health.rating,
        details: health.details
      },
      spendingAlerts: insights.spendingAlerts,
      savingsOpportunities: insights.savingsOpportunities,
      merchantConcentration: insights.merchantConcentration,
      recurringExpensesText: insights.recurringExpensesText,
      // Field mappings explicitly required by Phase 3
      topMerchants: profile.topMerchants,
      topCategories: profile.topCategories,
      spendingPatterns: {
        highestExpenseCategory: profile.highestExpenseCategory,
        monthlyIncome: profile.monthlyIncome,
        monthlyExpense: profile.monthlyExpense,
        savingsRate: profile.savingsRate
      },
      merchantFrequency: merchantFreq,
      recurringExpenses: profile.recurringExpenses,
      cashflowTrend: profile.spendingTrend,
      recent,
      systemPrompt: "You are the KhaataKitab Financial Copilot, a highly skilled personal finance assistant. You base your suggestions on real user transactions. You MUST mention canonical/normalized merchant names (e.g. Swiggy, Amazon, Blinkit) and correct category names. Keep your responses encouraging and actionable. If the user asks for a monthly summary, format a detailed financial report in markdown including: Income Summary, Expense Summary, Top Categories, Top Merchants, Savings Suggestions, and their Financial Health Score."
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

  const healthScore = useMemo(() => {
    return calculateFinancialHealthScore(transactions || []);
  }, [transactions]);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Good': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Average': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    }
  };

  const monthExpense = useMemo(() => {
    if (!transactions) return 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    return transactions.filter(t => t.type === "expense" && new Date(t.date) >= monthStart)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  return (
    <>
      <SEO title="AI Assistant | KhaataKitab" description="Chat with your AI financial assistant for insights, tips, and answers about your transactions." path="/ai" />
      <div className="min-h-screen bg-background pb-40 flex flex-col">
      <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">
                {transactions?.length ?? 0} txns · ₹{formatIndianCurrency(monthExpense)} this month
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
          {/* Financial Health Score Widget */}
          <Card className="p-4 bg-gradient-to-br from-card to-accent/10 border-border shadow-sm flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financial Health Score</h2>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-primary">{healthScore.score}</span>
                <span className="text-sm text-muted-foreground font-medium">/100</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rating based on savings rate, cashflow, and category diversity.
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-semibold shrink-0 ${getRatingColor(healthScore.rating)}`}>
              {healthScore.rating}
            </div>
          </Card>

          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <Bot className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Hi! I'm your KhaataKitab Financial Copilot.</p>
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about your spending, income, or get tips to save money.
                      I use your real transaction history to give you personalized guidance.
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
        {/* Horizontal Quick Actions Row */}
        <div className="max-w-2xl mx-auto px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {[
            "Where am I spending most?",
            "How can I save money?",
            "What expenses are increasing?",
            "What subscriptions do I have?",
            "What is my spending pattern?",
            "Generate monthly summary."
          ].map(q => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => send(q)}
              className="whitespace-nowrap shrink-0 text-[11px] px-3 py-1 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="max-w-2xl mx-auto px-4 py-3 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your Financial Copilot..."
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
    </>
  );
}
