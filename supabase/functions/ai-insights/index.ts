// AI-generated financial insights & monthly summary
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats, recentTransactions, period } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Analyze this Indian small-business owner's finances for ${period || "this month"} and give a punchy summary.

STATS:
${JSON.stringify(stats, null, 2)}

RECENT TRANSACTIONS (sample):
${JSON.stringify((recentTransactions || []).slice(0, 30), null, 2)}

Return: a one-line headline, 3 short insights, and 2 actionable tips. Be specific with ₹ amounts and category names. Plain language, Indian context.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "You are a sharp financial advisor for Indian small businesses. Be concise, specific, and use ₹." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "financial_summary",
            description: "Return a structured financial summary.",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string", description: "Punchy one-liner with ₹ amount" },
                mood: { type: "string", enum: ["positive", "neutral", "warning"] },
                insights: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2, maxItems: 4,
                  description: "Short observations about spending/income patterns",
                },
                tips: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1, maxItems: 3,
                  description: "Actionable recommendations",
                },
                topCategory: { type: "string", description: "Biggest spending category" },
              },
              required: ["headline", "mood", "insights", "tips", "topCategory"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "financial_summary" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "AI credits exhausted" }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!args) {
      return new Response(JSON.stringify({ error: "No summary returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
