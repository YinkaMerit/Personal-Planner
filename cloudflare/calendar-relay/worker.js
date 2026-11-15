// Calendar relay for Tee's Planner.
// iCloud public calendar links can't be fetched from a web page (no CORS headers), so the planner
// asks this Worker for them instead. It only ever fetches iCloud published calendars and stores nothing.

const ALLOWED_ORIGINS = ["https://yinkamerit.github.io"];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) || LOCAL.test(origin) ? origin : ALLOWED_ORIGINS[0],
      "Vary": "Origin",
    };
    const reply = (text, status) => new Response(text, { status, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });

    if (request.method === "OPTIONS") return new Response(null, { headers: { ...cors, "Access-Control-Allow-Methods": "GET" } });
    if (request.method !== "GET") return reply("Method not allowed", 405);

    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get("url"));
    } catch {
      return reply("Add ?url= with an iCloud public calendar link", 400);
    }
    const isIcloud = target.hostname === "icloud.com" || target.hostname.endsWith(".icloud.com");
    if (target.protocol !== "https:" || !isIcloud || !target.pathname.startsWith("/published/")) {
      return reply("Only iCloud public calendar links are allowed", 403);
    }

    const upstream = await fetch(target.toString(), { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!upstream.ok) return reply("Calendar not available", 502);

    return new Response(upstream.body, {
      headers: { ...cors, "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "max-age=300" },
    });
  },
};
