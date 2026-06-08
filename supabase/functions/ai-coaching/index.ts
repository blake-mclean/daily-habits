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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user JWT via the anon client
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

    // Service role client — bypasses RLS for data reads
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 10 calls per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_coaching_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);
    if ((recentCalls ?? 0) >= 10) {
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
        JSON.stringify({ message: "Add some habits and start tracking to get personalized coaching! 🌱" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 13); // last 14 days inclusive
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, date, count")
      .eq("user_id", user.id)
      .gte("date", cutoffStr)
      .lte("date", todayStr);

    const logsArr = logs ?? [];

    const habitStats = habits.map((h: { id: string; name: string; emoji: string; type: string; target_count: number }) => {
      const habitLogs = logsArr.filter((l: { habit_id: string; date: string; count: number }) => l.habit_id === h.id);
      const completedDates = habitLogs
        .filter((l: { habit_id: string; date: string; count: number }) => l.count >= h.target_count)
        .map((l: { habit_id: string; date: string; count: number }) => l.date);
      const completionRate = Math.round((completedDates.length / 14) * 100);

      // Current streak: count consecutive complete days backwards from yesterday (don't penalize for today yet)
      let streak = 0;
      const cursor = new Date(today);
      cursor.setDate(cursor.getDate() - 1); // start from yesterday
      for (let i = 0; i < 14; i++) {
        const d = cursor.toISOString().split("T")[0];
        if (completedDates.includes(d)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      // Also count today if completed
      if (completedDates.includes(todayStr)) streak++;

      return { name: h.name, emoji: h.emoji, completionRate, streak, completedDays: completedDates.length };
    });

    const todayLogs = logsArr.filter((l: { habit_id: string; date: string; count: number }) => l.date === todayStr);
    const completedToday = habits.filter((h: { id: string; target_count: number }) => {
      const log = todayLogs.find((l: { habit_id: string; count: number }) => l.habit_id === h.id);
      return log && log.count >= h.target_count;
    }).length;

    const sanitizeName = (name: string) => name.replace(/[^\w\sÀ-ɏ一-鿿぀-ヿ가-힯]/g, '').trim().slice(0, 80);

    const rankedStats = [...habitStats].sort((a, b) => b.completionRate - a.completionRate);
    const dataStr = rankedStats
      .map((s) => `  • ${sanitizeName(s.name)}: ${s.completionRate}% complete over 14 days, streak: ${s.streak} days`)
      .join("\n");

    const prompt = `You are a personal habit coach for a mobile app. Here is the user's recent data:

Today: ${completedToday}/${habits.length} habits completed
14-day habit breakdown:
${dataStr}

Write a personalized 2-3 sentence coaching message that:
1. Celebrates a specific win (name the habit using its emoji)
2. Gently highlights the biggest opportunity to improve (name the habit using its emoji)
3. Ends with one concrete, actionable tip

Be warm, direct, and specific. Write in plain conversational English. Do not use em-dashes, markdown, bullet points, or asterisks. Keep it under 80 words.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const message = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    await supabase.from("ai_coaching_messages").insert({
      user_id: user.id,
      message,
      context_data: { habitStats, completedToday, totalHabits: habits.length },
    });

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-coaching error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
