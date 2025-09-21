// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const payload = await req.json();
    const messages = payload.tokens.map((to: string) => ({
      to,
      title: payload.title ?? 'Theta',
      body: payload.body ?? '',
      data: payload.data ?? {},
      sound: 'default',
      channelId: 'default',
      priority: 'default',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const json = await res.json();
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
