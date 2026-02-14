import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Activity {
  description: string;
  category: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activities, date } = await req.json();
    
    // Input validation
    const MAX_ACTIVITIES = 100;
    if (!activities || !Array.isArray(activities)) {
      return new Response(
        JSON.stringify({ error: "Activities must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (activities.length > MAX_ACTIVITIES) {
      return new Response(
        JSON.stringify({ error: `Can analyze maximum ${MAX_ACTIVITIES} activities at once` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each activity has required fields
    for (const activity of activities) {
      if (!activity.description || typeof activity.description !== 'string' ||
          !activity.category || typeof activity.category !== 'string' ||
          !activity.startTime || typeof activity.startTime !== 'string') {
        return new Response(
          JSON.stringify({ error: "Each activity must have description, category, and startTime as strings" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (activities.length === 0) {
      return new Response(
        JSON.stringify({
          summary: "No activities logged yet for this day. Start tracking to get insights!",
          redFlags: [],
          greenFlags: [],
          recommendations: ["Start by logging your first activity of the day."],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Format activities for the prompt
    const activitySummary = activities.map((a: Activity) => {
      const start = new Date(a.startTime).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
      const end = a.endTime 
        ? new Date(a.endTime).toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          })
        : 'ongoing';
      const duration = a.duration ? `(${a.duration} min)` : '';
      return `- ${start} to ${end} ${duration}: ${a.description} [${a.category}]`;
    }).join('\n');

    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    activities.forEach((a: Activity) => {
      if (a.duration) {
        categoryTotals[a.category] = (categoryTotals[a.category] || 0) + a.duration;
      }
    });
    const totalMinutes = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, mins]) => `${cat}: ${Math.round(mins)} minutes (${Math.round(mins/totalMinutes*100)}%)`)
      .join('\n');

    const systemPrompt = `You are a lifestyle coach analyzing a user's daily time tracking data. Provide helpful, encouraging insights.

Analyze the day's activities and provide:
1. A brief, personalized summary (2-3 sentences) of how the day went
2. Red flags (concerning patterns) - be specific about times and durations
3. Green flags (positive patterns) - celebrate good habits
4. Actionable recommendations for improvement

Red flags to look for:
- Working more than 10 hours
- Skipping meals (no meal activity around typical meal times: 7-9am, 12-2pm, 7-9pm)
- Eating too late (dinner after 9pm)
- No exercise or physical activity
- Working past midnight
- Too many context switches (more than 8 different activities)
- Long work sessions without breaks (2+ hours unbroken)
- No leisure or social time

Green flags to celebrate:
- Regular meal times
- Taking breaks between work sessions
- Including exercise
- Deep focus blocks (2+ hour work/coding sessions)
- Reasonable end to work day (before 7pm)
- Including social or leisure time
- Good sleep timing

Be warm and supportive. Use the user's actual activities in your feedback.`;

    const userPrompt = `Date: ${date}

Activities Timeline:
${activitySummary}

Category Totals:
${categoryBreakdown}
Total tracked: ${Math.round(totalMinutes)} minutes

Please analyze this day and provide insights.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_analysis",
              description: "Provide structured analysis of the day's activities",
              parameters: {
                type: "object",
                properties: {
                  summary: { 
                    type: "string",
                    description: "A brief, personalized 2-3 sentence summary of the day"
                  },
                  redFlags: { 
                    type: "array",
                    items: { type: "string" },
                    description: "List of concerning patterns observed (empty if none)"
                  },
                  greenFlags: { 
                    type: "array",
                    items: { type: "string" },
                    description: "List of positive patterns to celebrate (empty if none)"
                  },
                  recommendations: { 
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 specific, actionable suggestions for improvement"
                  },
                },
                required: ["summary", "redFlags", "greenFlags", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI analysis response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "provide_analysis") {
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing day:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to analyze day" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
