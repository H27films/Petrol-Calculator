import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const sql = neon(process.env.DATABASE_URL);
const JWKS = createRemoteJWKSet(new URL(process.env.NEON_JWKS_URL));
const DOCS = ['journeys', 'weekly'];

export default async function handler(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Not signed in' });

  let userId;
  try {
    const { payload } = await jwtVerify(token, JWKS);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const doc = req.query.doc;
  if (!DOCS.includes(doc)) return res.status(400).json({ error: 'Unknown document' });

  if (req.method === 'GET') {
    const rows = await sql`select journeys, weekly from user_data where id = ${userId}`;
    return res.status(200).json(rows[0]?.[doc] ?? {});
  }

  if (req.method === 'PUT') {
    const body = JSON.stringify(req.body ?? {});
    if (doc === 'journeys') {
      await sql`insert into user_data (id, journeys, updated_at)
                values (${userId}, ${body}::jsonb, now())
                on conflict (id) do update set journeys = excluded.journeys, updated_at = now()`;
    } else {
      await sql`insert into user_data (id, weekly, updated_at)
                values (${userId}, ${body}::jsonb, now())
                on conflict (id) do update set weekly = excluded.weekly, updated_at = now()`;
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
