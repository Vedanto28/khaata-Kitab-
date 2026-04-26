import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { aiInsights, type AIInsightsResult } from "@/lib/ai-client";
import { Transaction } from "@/lib/db";
import { toast } from "sonner";

interface Props {
  transactions: Transaction[];
}

const STORAGE_KEY = "ai-monthly-summary";

export const AIMonthlySummary = ({ transactions }: Props) => {
  const [data, setData] = useState<AIInsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Restore cached summary
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(parsed.data);
        setGeneratedAt(parsed.generatedAt);
      }
    } catch {}
  }, []);

  const generate = async () => {
    if (!transactions || transactions.length === 0) {
      toast.error("Add some transactions first");
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthTx = transactions.filter(t => new Date(t.date) >= monthStart);
      const income = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const byCat: Record<string, number> = {};
      monthTx.filter(t => t.type === "expense").forEach(t => {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
      });

      const result = await aiInsights({
        stats: {
          monthIncome: income,
          monthExpense: expense,
          netSavings: income - expense,
          transactionCount: monthTx.length,
          categoryBreakdown: byCat,
        },
        recentTransactions: monthTx.slice(-30).map(t => ({
          date: new Date(t.date).toISOString().slice(0, 10),
          type: t.type, amount: t.amount,
          category: t.category, description: t.description?.slice(0, 40),
        })),
        period: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      });

      setData(result);
      const timestamp = new Date().toISOString();
      setGeneratedAt(timestamp);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: result, generatedAt: timestamp }));
    } catch (e: any) {
      if (e?.status === 429) toast.error("Too many requests. Try again soon.");
      else if (e?.status === 402) toast.error("AI credits exhausted.");
      else toast.error(e?.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const moodColor = data?.mood === "warning"
    ? "from-destructive/10 to-destructive/5 border-destructive/30"
    : data?.mood === "positive"
    ? "from-success/10 to-success/5 border-success/30"
    : "from-primary/10 to-primary/5 border-primary/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-5 bg-gradient-to-br ${moodColor}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">AI Monthly Summary</h3>
              <p className="text-xs text-muted-foreground">
                {generatedAt ? `Updated ${new Date(generatedAt).toLocaleString("en-IN")}` : "Tap to generate"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {!data && !loading && (
          <Button onClick={generate} className="w-full mt-2" variant="default">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI summary
          </Button>
        )}

        {loading && !data && (
          <div className="py-6 flex flex-col items-center text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Analyzing your transactions…</p>
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <p className="font-semibold text-base flex items-start gap-2">
              {data.mood === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              ) : (
                <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              )}
              <span>{data.headline}</span>
            </p>

            {data.topCategory && (
              <Badge variant="secondary" className="text-xs">
                Top: {data.topCategory}
              </Badge>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Insights</p>
              <ul className="space-y-1.5">
                {data.insights.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Tips</p>
              <ul className="space-y-1.5">
                {data.tips.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-success">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
