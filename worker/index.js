// worker/index.js
const KEY = "entries";
const MAX_ENTRIES = 30;

async function getEntries(env) {
  const raw = await env.ENTRIES.get(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveEntries(env, entries) {
  await env.ENTRIES.put(KEY, JSON.stringify(entries));
}

function json(data, init) {
  return Response.json(data, init);
}

// 名前・曲名は必須。点数は空欄OK（空欄なら null = 未採点）
function parseInput(body) {
  const name = (body.name || "").toString().trim().slice(0, 30);
  const song = (body.song || "").toString().trim().slice(0, 60);
  const raw = body.score;
  let score = null;
  if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
    score = Number(raw);
    if (Number.isNaN(score)) return null;
  }
  if (!name || !song) return null;
  return { name, song, score };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/api/entries" && method === "GET") {
      const entries = await getEntries(env);
      return json({ entries });
    }

    if (path === "/api/entries" && method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "invalid_json" }, { status: 400 });
      }
      const input = parseInput(body);
      if (!input) {
        return json({ error: "invalid_input" }, { status: 400 });
      }
      const entries = await getEntries(env);
      if (entries.length >= MAX_ENTRIES) {
        return json({ error: "limit_reached", entries }, { status: 409 });
      }
      const entry = { id: crypto.randomUUID(), ...input };
      entries.push(entry);
      await saveEntries(env, entries);
      return json({ entries });
    }

    // 登録済みの内容を編集（名前・曲名・点数）
    if (path.startsWith("/api/entries/") && method === "PUT") {
      const id = decodeURIComponent(path.slice("/api/entries/".length));
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "invalid_json" }, { status: 400 });
      }
      const input = parseInput(body);
      if (!input) {
        return json({ error: "invalid_input" }, { status: 400 });
      }
      const entries = await getEntries(env);
      const target = entries.find((e) => e.id === id);
      if (!target) {
        return json({ error: "not_found", entries }, { status: 404 });
      }
      Object.assign(target, input);
      await saveEntries(env, entries);
      return json({ entries });
    }

    if (path.startsWith("/api/entries/") && method === "DELETE") {
      const id = decodeURIComponent(path.slice("/api/entries/".length));
      let entries = await getEntries(env);
      entries = entries.filter((e) => e.id !== id);
      await saveEntries(env, entries);
      return json({ entries });
    }

    if (path === "/api/reset" && method === "POST") {
      await saveEntries(env, []);
      return json({ entries: [] });
    }

    return new Response("Not found", { status: 404 });
  },
};
