const KEY = 'entries';

async function getEntries(env) {
  const raw = await env.ENTRIES.get(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveEntries(env, entries) {
  await env.ENTRIES.put(KEY, JSON.stringify(entries));
}

export async function onRequestDelete({ env, params }) {
  const id = params.id;
  let entries = await getEntries(env);
  entries = entries.filter((e) => e.id !== id);
  await saveEntries(env, entries);
  return Response.json({ entries });
}
