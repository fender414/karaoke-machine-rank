// Cloudflare Pages Functions
// KVバインディング名: ENTRIES （Pagesの設定 > Functions > KV namespace bindings で追加）

const KEY = 'entries';
const MAX_ENTRIES = 20;

async function getEntries(env) {
  const raw = await env.ENTRIES.get(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveEntries(env, entries) {
  await env.ENTRIES.put(KEY, JSON.stringify(entries));
}

export async function onRequestGet({ env }) {
  const entries = await getEntries(env);
  return Response.json({ entries });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = (body.name || '').toString().trim().slice(0, 30);
  const song = (body.song || '').toString().trim().slice(0, 60);
  const score = Number(body.score);

  if (!name || !song || Number.isNaN(score)) {
    return Response.json({ error: 'invalid_input' }, { status: 400 });
  }

  const entries = await getEntries(env);

  if (entries.length >= MAX_ENTRIES) {
    return Response.json({ error: 'limit_reached', entries }, { status: 409 });
  }

  const entry = { id: crypto.randomUUID(), name, song, score };
  entries.push(entry);
  await saveEntries(env, entries);

  return Response.json({ entries });
}
