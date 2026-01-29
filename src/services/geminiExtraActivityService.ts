import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtraActivity } from '../stores/userStore';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
export async function analyzeExtraActivity(
    descripcion: string,
    videoUrl?: string
): Promise<ExtraActivity['analisisIA']> {
    try {
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
            }
        });

        const prompt = `Analiza esta descripción de actividad física y extrae la información en formato JSON.

Descripción: "${descripcion}"
${videoUrl ? `URL del video: ${videoUrl}` : ''}

Debes devolver UN SOLO objeto JSON válido con esta estructura exacta:
{
    "tipoDeporte": "nombre del tipo de deporte o actividad (ej: running, ciclismo, natación, fútbol, yoga, etc)",
    "intensidad": "baja" | "media" | "alta",
    "distanciaKm": número o null si no se menciona,
    "duracionMinutos": número o null si no se menciona,
    "calorias": estimación de calorías quemadas o null,
    "notas": "cualquier observación adicional relevante"
}

IMPORTANTE:
- Solo devuelve el objeto JSON, sin texto adicional
- Si no puedes determinar un campo, usa null
- La intensidad debe ser siempre "baja", "media" o "alta"
- Las distancias conviértelas a kilómetros
- La duración conviértela a minutos
- Estima calorías razonablemente basándote en la actividad, intensidad y duración

JSON:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        // Remove markdown code blocks if present
        const jsonText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const analisis = JSON.parse(jsonText);

        // Validate and sanitize the response
        return {
            tipoDeporte: analisis.tipoDeporte || undefined,
            intensidad: ['baja', 'media', 'alta'].includes(analisis.intensidad)
                ? analisis.intensidad
                : 'media',
            distanciaKm: typeof analisis.distanciaKm === 'number' ? analisis.distanciaKm : undefined,
            duracionMinutos: typeof analisis.duracionMinutos === 'number' ? analisis.duracionMinutos : undefined,
            calorias: typeof analisis.calorias === 'number' ? analisis.calorias : undefined,
            notas: typeof analisis.notas === 'string' ? analisis.notas : undefined,
        };
    } catch (error) {
        console.error('Error analyzing extra activity:', error);
        // Return default/fallback response
        return {
            tipoDeporte: 'actividad física',
            intensidad: 'media',
            notas: 'No se pudo analizar automáticamente. Descripción original: ' + descripcion
        };
    }
}
