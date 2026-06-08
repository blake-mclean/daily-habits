import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const period: "weekly" | "monthly" = body.period === "monthly" ? "monthly" : "weekly";

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 3 calls per hour per user.
    // Limit is tight (normal cadence is 1/24hr via client TTL) to reduce race condition blast radius.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_reflections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);
    if ((recentCalls ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: habits } = await supabase
      .from("habits")
      .select("id, name, emoji, type, target_count")
      .eq("user_id", user.id)
      .eq("deleted", false);

    if (!habits || habits.length === 0) {
      return new Response(
        JSON.stringify({ summary: "Add some habits and start tracking to get your reflection summary! 🌱" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const days = period === "weekly" ? 7 : 30;
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, date, count")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr);

    const logsArr = logs ?? [];

    const habitStats = habits.map((h: { id: string; name: string; emoji: string; type: string; target_count: number }) => {
      const habitLogs = logsArr.filter((l: { habit_id: string; date: string; count: number }) => l.habit_id === h.id);
      const completedDays = habitLogs.filter((l: { habit_id: string; date: string; count: number }) => l.count >= h.target_count).length;
      const completionRate = Math.round((completedDays / days) * 100);
      return { name: h.name, emoji: h.emoji, completionRate, completedDays, totalDays: days };
    });

    const sanitizeName = (name: string) => name.replace(/[^\w\sÀ-ɏ一-鿿぀-ヿ가-힯]/g, '').trim().slice(0, 80);

    const sorted = [...habitStats].sort((a, b) => b.completionRate - a.completionRate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const dataStr = sorted
      .map((s) => `  • ${sanitizeName(s.name)}: ${s.completionRate}% (${s.completedDays}/${s.totalDays} days)`)
      .join("\n");

    const periodLabel = period === "weekly" ? "week" : "month";

    const prompt = `You are a personal habit coach generating a ${period} reflection.

Period: ${startStr} to ${endStr} (${days} days)
Habit performance (ranked best to worst):
${dataStr}

Best: ${sanitizeName(best.name)} at ${best.completionRate}%
Needs most attention: ${sanitizeName(worst.name)} at ${worst.completionRate}%

Write a 3-4 sentence ${period} reflection that:
1. Celebrates the top-performing habit with specific numbers
2. Addresses the habit needing most attention with empathy (not criticism)
3. Notes one pattern or insight from the data
4. Ends with encouragement for the next ${periodLabel}

Be warm, insightful, and specific. Write in plain conversational English. Do not use em-dashes, markdown, bullet points, or asterisks. Keep it under 100 words.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const summary = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    await supabase.from("ai_reflections").insert({
      user_id: user.id,
      period,
      period_start: startStr,
      summary,
      stats_data: { habitStats, startStr, endStr, days },
    });

    return new Response(JSON.stringify({ summary, period, startStr, endStr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-reflection error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
