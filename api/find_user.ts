import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db_config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const sql = getDb();
        const alias = (req.query.alias as string)?.toLowerCase().trim();

        if (!alias) {
            return res.status(400).json({ error: 'Alias required' });
        }

        // Now we look for the ID in the user_data table since we bypassed auth
        const result = await sql`
            SELECT user_id as id, 
                   (data->'usuario'->>'nombre') as name, 
                   user_id as alias
            FROM user_data 
            WHERE user_id = ${alias} 
            LIMIT 1
        `;

        if (result.length > 0) {
            return res.status(200).json({ success: true, user: result[0] });
        } else {
            // If doesn't exist in DB, but the user is typing it in "Find Partner", 
            // we assume for now it might just be the ID itself
            return res.status(200).json({
                success: true,
                user: { id: alias, name: alias, alias: alias }
            });
        }
    } catch (error: any) {
        console.error('User Lookup Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
