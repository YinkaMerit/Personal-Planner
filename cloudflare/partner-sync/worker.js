// Partner sync for Tee's Planner.
// Two planners that share a pairing code each upload a copy of their schedule here and read the
// other's. The pairing code never reaches this Worker: the planner sends a SHA-256 hash of it,
// which names a Durable Object holding just that pair's two copies. A Durable Object is used
// (rather than KV) because it is consistent straight away: the second planner sees the first one's
// copy immediately, and a third planner can be turned away reliably.

import { DurableObject } from "cloudflare:workers";

const ALLOWED_ORIGINS = ["https://yinkamerit.github.io"];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MAX_BYTES = 900_000;
const KEEP_MS = 120 * 24 * 60 * 60 * 1000; // a pair's copies are deleted if untouched this long
const PAIR = /^[a-f0-9]{64}$/;
const MEMBER = /^[A-Za-z0-9_-]{8,64}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) || LOCAL.test(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // /v1/pair/<pair hash>            GET  ?me=<member>  -> the other planner's latest copy
    // /v1/pair/<pair hash>/<member>   PUT  body: JSON    -> store this planner's copy
    // /v1/pair/<pair hash>/<member>   DELETE             -> remove this planner's copy (disconnect)
    const [, version, kind, pair, member] = new URL(request.url).pathname.split("/");
    if (version !== "v1" || kind !== "pair" || !PAIR.test(pair || "")) return json({ error: "not_found" }, 404);

    const room = env.PAIRS.get(env.PAIRS.idFromName(pair));

    if (request.method === "PUT") {
      if (!MEMBER.test(member || "")) return json({ error: "bad_member" }, 400);
      const text = await request.text();
      if (text.length > MAX_BYTES) return json({ error: "too_large" }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: "bad_json" }, 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_json" }, 400);

      const result = await room.save(member, text);
      return json(result, result.error ? 409 : 200);
    }

    if (request.method === "DELETE") {
      if (!MEMBER.test(member || "")) return json({ error: "bad_member" }, 400);
      await room.leave(member);
      return json({ ok: true });
    }

    if (request.method === "GET") {
      const me = new URL(request.url).searchParams.get("me") || "";
      return json({ partner: await room.partnerOf(me) });
    }

    return json({ error: "method_not_allowed" }, 405);
  },
};

// One instance per pairing code. Storage keys are member ids, values are that planner's JSON copy.
export class PairRoom extends DurableObject {
  async save(member, text) {
    const members = [...(await this.ctx.storage.list()).keys()];
    // A pairing code is for two planners; a third is turned away
    if (!members.includes(member) && members.length >= 2) return { error: "pair_full" };
    await this.ctx.storage.put(member, text);
    await this.ctx.storage.setAlarm(Date.now() + KEEP_MS);
    return { ok: true, partnerJoined: members.some(m => m !== member) };
  }

  async partnerOf(me) {
    let partner = null;
    for (const [member, text] of await this.ctx.storage.list()) {
      if (member === me) continue;
      const copy = JSON.parse(text);
      if (!partner || (copy.lastUpdated || 0) > (partner.lastUpdated || 0)) partner = copy;
    }
    return partner;
  }

  async leave(member) {
    await this.ctx.storage.delete(member);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
