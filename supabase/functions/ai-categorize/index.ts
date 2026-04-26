// LLM-powered SMS / transaction categorization (fallback for low-confidence ML)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "Food", "Groceries", "Transport", "Shopping", "Bills", "Telecom", "Entertainment",
  "Medical", "Education", "Housing", "Salary", "Sales", "Refund", "Investment",
  "Loan", "Insurance", "Fees", "ATM Cash", "Transfer", "Other Expense", "Other Income"
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, merchant, amount, direction } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!text && !merchant) {
      return new Response(JSON.stringify({ error: "text or merchant required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `Classify this Indian financial transaction.

Merchant/Source: ${merchant ?? "unknown"}
Direction: ${direction ?? "unknown"}
Amount: ₹${amount ?? "?"}
Raw text: ${text ?? ""}

Pick the single best category from the allowed list and return a confidence (0-1).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "You are an expert at classifying Indian SMS bank/UPI transactions." },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_transaction",
            description: "Return the best category and confidence for a transaction.",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", enum: CATEGORIES },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                reason: { type: "string", description: "Brief reason (max 12 words)" },
              },
              required: ["category", "confidence", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_transaction" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errBody = await response.text();
      console.error("AI gateway error:", status, errBody);
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limited" : "Credits exhausted" }), {
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
      return new Response(JSON.stringify({ error: "No classification returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-categorize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
