
import { PerfilCompleto } from '../stores/userStore';
import { neon } from '@neondatabase/serverless';

// Direct Database Access for 100% Stability in Local Dev (Vite)
// This avoids needing 'vercel dev' to run the /api folder
const getSql = () => {
    const url = import.meta.env.VITE_DATABASE_URL;
    if (!url) {
        console.warn("VITE_DATABASE_URL no configurada. El guardado en la nube estará desactivado.");
        return null;
    }
    return neon(url);
};

export const cloudService = {
    async ensureTable() {
        const sql = getSql();
        if (!sql) return;
        try {
            await sql`
                CREATE TABLE IF NOT EXISTS user_data (
                    user_id TEXT PRIMARY KEY,
                    data JSONB,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `;
        } catch (e) {
            console.error("Error creating table:", e);
        }
    },

    async saveData(data: PerfilCompleto, userId?: string) {
        const sql = getSql();
        if (!sql) return { success: false };

        try {
            await this.ensureTable();
            const id = userId || 'default-user';

            await sql`
                INSERT INTO user_data (user_id, data, updated_at)
                VALUES (${id}, ${JSON.stringify(data)}, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
            `;

            return { success: true };
        } catch (error) {
            console.error('Cloud Sync Upload Error:', error);
            throw new Error('Error al sincronizar con la nube');
        }
    },

    async downloadData(userId?: string): Promise<PerfilCompleto | null> {
        const sql = getSql();
        if (!sql) return null;

        try {
            await this.ensureTable();
            const id = userId || 'default-user';

            const result = await sql`
                SELECT data FROM user_data WHERE user_id = ${id} LIMIT 1
            `;

            if (result.length > 0) {
                return result[0].data as PerfilCompleto;
            }
            return null;
        } catch (error) {
            console.error('Cloud Sync Download Error:', error);
            return null; // Return null so it doesn't break the app
        }
    },

    async findUserByAlias(alias: string) {
        const sql = getSql();
        if (!sql) return null;

        try {
            const cleanAlias = alias.toLowerCase().trim();
            const result = await sql`
                SELECT user_id as id, 
                       (data->'usuario'->>'nombre') as name, 
                       user_id as alias
                FROM user_data 
                WHERE user_id = ${cleanAlias} 
                LIMIT 1
            `;

            if (result.length > 0) {
                return result[0];
            } else {
                // If user doesn't exist yet, we treat the alias as the potential ID
                return { id: cleanAlias, name: cleanAlias, alias: cleanAlias };
            }
        } catch (error) {
            console.error('Find User Error:', error);
            return null;
        }
    },

    async addWorkoutToPartner(partnerId: string, workout: any) {
        try {
            const currentData = await this.downloadData(partnerId);
            if (currentData) {
                const updatedData = {
                    ...currentData,
                    historial: [workout, ...currentData.historial]
                };
                await this.saveData(updatedData, partnerId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Partner Sync Error:', error);
            return false;
        }
    },

    async shareRoutine(targetAlias: string, routine: any) {
        try {
            const targetUser = await this.findUserByAlias(targetAlias);
            if (!targetUser) return { success: false, message: 'Usuario no encontrado' };

            const targetId = targetUser.id;
            let targetData = await this.downloadData(targetId);

            const routineCopy = {
                ...routine,
                nombre: `${routine.nombre} (Compartida)`,
                fechaInicio: new Date().toISOString()
            };

            if (!targetData) {
                targetData = {
                    usuario: { nombre: targetUser.alias || 'Usuario', edad: 0, peso: 0, altura: 0, nivel: 'principiante', objetivo: 'ganar_musculo', lesiones: '' },
                    pareja: null,
                    horario: { dias: [] },
                    rutina: routineCopy,
                    historial: [],
                    historialRutinas: [],
                    onboardingCompletado: true
                };
            } else {
                if (targetData.rutina) {
                    targetData.historialRutinas.push(targetData.rutina);
                }
                targetData.rutina = routineCopy;
            }

            await this.saveData(targetData, targetId);
            return { success: true, message: 'Rutina compartida con éxito' };
        } catch (error) {
            console.error('Share Routine Error:', error);
            return { success: false, message: 'Error al compartir la rutina' };
        }
    }
};
