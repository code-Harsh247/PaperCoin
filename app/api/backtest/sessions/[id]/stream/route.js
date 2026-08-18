// SSE bridge across the process boundary: the engine forwards session events
// (throttled trade ticks, fills, order updates, session end) to the
// 'backtest_events' NOTIFY channel; this route LISTENs on a dedicated
// connection and forwards this session's events to the browser.
import { Pool } from 'pg';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

// Small dedicated pool: LISTEN holds a connection for the life of the stream,
// so these must not come out of the shared query pool.
const listenPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

export async function GET(request, { params }) {
  const userId = await getAuthedUserId();
  if (!userId) return new Response('Not authenticated', { status: 401 });
  const { id } = await params;
  const owned = await runQuery(
    `SELECT 1 FROM backtest_sessions WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (owned.length === 0) return new Response('Not found', { status: 404 });

  const client = await listenPool.connect();
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const finish = () => {
        if (closed) return;
        closed = true;
        client.removeAllListeners('notification');
        client.query('UNLISTEN backtest_events').catch(() => {});
        client.release();
        try { controller.close(); } catch { /* already closed */ }
      };

      client.on('notification', (n) => {
        try {
          const event = JSON.parse(n.payload);
          if (Number(event.session_id) !== Number(id)) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          if (event.type === 'session') finish(); // replay over: end the stream
        } catch { /* skip malformed payloads */ }
      });
      await client.query('LISTEN backtest_events');
      controller.enqueue(encoder.encode(`data: {"type":"stream_open"}\n\n`));

      request.signal.addEventListener('abort', finish);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
