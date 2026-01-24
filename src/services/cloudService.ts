
import { PerfilCompleto } from '../stores/userStore';

const API_URL = '/api/sync';

export const cloudService = {
    async saveData(data: PerfilCompleto, userId?: string) {
        try {
            // Include userId in the payload. If not provided, API defaults to 'default-user'
            // But we should send it if we have it
            const payload = {
                data,
                userId: userId || 'default-user'
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Error uploading data');
            }

            return await response.json();
        } catch (error) {
            console.error('Cloud Sync Upload Error:', error);
            throw error;
        }
    },

    async downloadData(userId?: string): Promise<PerfilCompleto | null> {
        try {
            const idToFetch = userId || 'default-user';
            const response = await fetch(`${API_URL}?userId=${idToFetch}`);

            if (response.status === 404) return null;

            if (!response.ok) {
                throw new Error('Error downloading data');
            }

            const result = await response.json();
            return result.data as PerfilCompleto;
        } catch (error) {
            console.error('Cloud Sync Download Error:', error);
            throw error;
        }
    }
};
