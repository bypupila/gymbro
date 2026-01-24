
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_sabvW4SE7uhq@ep-frosty-queen-ahrep9ya-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function getUsers() {
    try {
        const users = await sql`
      SELECT user_id, updated_at, data->'usuario'->>'nombre' as nombre 
      FROM user_data ORDER BY updated_at DESC
    `;

        console.log('Registered Users:');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            console.table(users);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

getUsers();
