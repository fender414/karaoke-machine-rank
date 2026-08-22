const KEY = 'entries';
const MAX_ENTRIES = 20;

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === '/api/entries' && method === 'GET') {
      const entries = await getEntries(env);
      return json({ entries });
    }

    if (path === '/api/entries' && method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: 'invalid_json' }, { status: 400 });
      }

      const name = (body.name || '').toString().trim().slice(0, 30);
      const song = (body.song || '').toString().trim().slice(0, 60);
      const score = Number(body.score);

      if (!name || !song || Number.isNaN(score)) {
        return json({ error: 'invalid_input' }, { status: 400 });
      }

      const entries = await getEntries(env);

      if (entries.length >= MAX_ENTRIES) {
        return json({ error: 'limit_reached', entries }, { status: 409 });
      }

      const entry = { id: crypto.randomUUID(), name, song, score };
      entries.push(entry);
      await saveEntries(env, entries);

      return json({ entries });
    }

    if (path.startsWith('/api/entries/') && method === 'DELETE') {
      const id = decodeURIComponent(path.slice('/api/entries/'.length));
      let entries = await getEntries(env);
      entries = entries.filter((e) => e.id !== id);
      await saveEntries(env, entries);
      return json({ entries });
    }

    if (path === '/api/reset' && method === 'POST') {
      await saveEntries(env, []);
      return json({ entries: [] });
    }

    return new Response('Not found', { status: 404 });
  },
};
