const KEY = 'entries';

export async function onRequestPost({ env }) {
  await env.ENTRIES.put(KEY, JSON.stringify([]));
  return Response.json({ entries: [] });
}
