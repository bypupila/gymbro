import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db_config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const sql = getDb();

        // Select all users, returning only id and name (inside the json)
        const users = await sql`
      SELECT user_id, updated_at, data->'usuario'->>'nombre' as nombre 
      FROM user_data 
      ORDER BY updated_at DESC
    `;

        return res.status(200).json({ success: true, count: users.length, users });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message || String(error) });
    }
}
