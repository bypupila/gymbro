import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db_config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const sql = getDb();

        // Create the table if it doesn't exist (same as before)
        await sql`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        // Determine the user ID
        // Check body or query params
        let userId = (req.body?.userId as string) || (req.query?.userId as string);

        // Fallback for backward compatibility or testing (optional, but requested by user to identify)
        // If no userId is provided, return 400 or default?
        // Let's use 'default-user' only if explicitly requested, otherwise require ID.
        // However, to be safe, if missing, we can revert to 'default-user'.
        if (!userId) {
            userId = 'default-user';
        }

        if (req.method === 'POST') {
            const { data } = req.body;

            if (!data) {
                return res.status(400).json({ error: 'Missing data payload' });
            }

            // Upsert the data for the specific user
            await sql`
        INSERT INTO user_data (user_id, data, updated_at)
        VALUES (${userId}, ${JSON.stringify(data)}, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `;

            return res.status(200).json({ success: true, message: `Data synced for user ${userId}` });
        }

        if (req.method === 'GET') {
            const result = await sql`
        SELECT data FROM user_data WHERE user_id = ${userId}
      `;

            if (result.length > 0) {
                return res.status(200).json({ success: true, data: result[0].data });
            } else {
                return res.status(404).json({ success: false, message: 'No data found for this user' });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Database Sync Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message || String(error) });
    }
}
