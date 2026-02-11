import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
    AnalysisResult,
    Clarification,
    DatosPersonales,
    DiaEntrenamiento,
    EjercicioRutina,
    HorarioSemanal,
} from "../stores/userStore";

interface GeminiExerciseRaw {
    id?: string;
    nombre_original?: string;
    nombre_estandarizado?: string;
    nombre?: string;
    series?: number | string;
    repeticiones?: string;
    descanso?: number;
    categoria?: "calentamiento" | "maquina" | string;
    dia?: string;
    enfocadoA?: "ambos" | "hombre" | "mujer";
    grupo_muscular?: string;
    observaciones?: string;
}

interface GeminiClarificationRaw {
    id?: string;
    question: string;
    detected_value?: string;
    options?: string[];
    exercise_index?: number;
    field?: keyof EjercicioRutina;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const IS_DEV = import.meta.env.DEV;

if (IS_DEV) {
    console.debug("Gemini: API key loaded:", API_KEY.length >= 10 ? "yes" : "no");
    if (API_KEY.length < 10) {
        console.warn("Gemini: missing or invalid VITE_GEMINI_API_KEY.");
    }
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
    },
});

const parseSeries = (rawSeries: number | string | undefined, fallback = 3): number => {
    const parsed = Number(rawSeries);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};

const stripJsonFence = (text: string): string => {
    const trimmed = text.trim();
    if (trimmed.startsWith("```")) {
        return trimmed.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
    }
    return text;
};

const parseJsonWithFallback = (text: string): Record<string, unknown> => {
    try {
        return JSON.parse(stripJsonFence(text));
    } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("INVALID_JSON_RESPONSE");
        }
        return JSON.parse(jsonMatch[0]);
    }
};

const toRoutineExercise = (ex: GeminiExerciseRaw, fallbackDay = "Dia 1"): EjercicioRutina => ({
    id: ex.id || crypto.randomUUID(),
    nombre: ex.nombre_estandarizado || ex.nombre_original || ex.nombre || "Ejercicio",
    series: parseSeries(ex.series, 3),
    repeticiones: String(ex.repeticiones || "10-12"),
    descanso: ex.descanso ?? 60,
    categoria: ex.categoria === "calentamiento" ? "calentamiento" : "maquina",
    dia: ex.dia || fallbackDay,
    grupoMuscular: ex.grupo_muscular,
    nombreOriginal: ex.nombre_original,
    observaciones: ex.observaciones,
    enfocadoA: ex.enfocadoA || "ambos",
});

export const analyzeRoutineImages = async (
    image1Base64: string,
    image2Base64?: string,
    userDescription?: string
): Promise<AnalysisResult> => {
    try {
        const prompt = `Actua como un experto en digitalizacion de rutinas de gym.

Objetivo:
- Extraer SOLO ejercicios que aparezcan en la imagen.
- No inventar informacion.
- Mantener series/repeticiones como texto real cuando aplique (ej: "12-10-8", "45s").

Contexto del usuario:
"${userDescription || "No proporcionado"}"

Si hay ambiguedad, responde preguntas en "unclear_items" en lugar de asumir.

Devuelve JSON con esta forma:
{
  "routine_name": "Nombre",
  "confidence_level": "High|Medium|Low",
  "exercises": [
    {
      "id": "uuid",
      "dia": "Lunes",
      "nombre_original": "texto",
      "nombre_estandarizado": "nombre",
      "series": 3,
      "repeticiones": "12-15",
      "categoria": "calentamiento|maquina",
      "grupo_muscular": "pectoral",
      "observaciones": "nota opcional"
    }
  ],
  "unclear_items": [
    {
      "id": "q_id",
      "question": "pregunta",
      "detected_value": "valor",
      "options": ["op1","op2"],
      "exercise_index": 0,
      "field": "categoria"
    }
  ]
}`;

        const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = [
            {
                inlineData: {
                    data: image1Base64.split(",")[1] || image1Base64,
                    mimeType: "image/jpeg",
                },
            },
        ];

        if (image2Base64) {
            imageParts.push({
                inlineData: {
                    data: image2Base64.split(",")[1] || image2Base64,
                    mimeType: "image/jpeg",
                },
            });
        }

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const parsed = parseJsonWithFallback(response.text()) as {
            routine_name?: string;
            confidence_level?: string;
            exercises?: GeminiExerciseRaw[];
            unclear_items?: GeminiClarificationRaw[];
        };

        const exercises: EjercicioRutina[] = (parsed.exercises || []).map((ex) => toRoutineExercise(ex));
        const unclearItems: Clarification[] = (parsed.unclear_items || []).map((item) => ({
            id: item.id || crypto.randomUUID(),
            question: item.question,
            detectedValue: item.detected_value,
            options: item.options,
            exerciseIndex: item.exercise_index,
            field: item.field,
        }));

        const confidenceRaw = (parsed.confidence_level || "").toLowerCase();
        const confidence: AnalysisResult["confidence"] =
            confidenceRaw === "high" ? "high" : confidenceRaw === "medium" ? "medium" : "low";

        return {
            exercises,
            unclearItems,
            confidence,
            routineName: parsed.routine_name,
        };
    } catch (error: unknown) {
        console.error("Gemini analyze error:", error);
        const message = error instanceof Error ? error.message : "Error al conectar con el servicio de IA.";
        throw new Error(message);
    }
};

export const generateRoutineFromProfile = async (
    member1: DatosPersonales,
    member2: DatosPersonales | null = null,
    horario: HorarioSemanal | null = null
): Promise<AnalysisResult> => {
    try {
        const isCouple = !!member2;
        const scheduleText = JSON.stringify(
            horario?.dias
                ?.filter((d: DiaEntrenamiento) => d.entrena)
                .map((d: DiaEntrenamiento) => `${d.dia}: ${d.grupoMuscular}`) || []
        );

        const prompt = `Actua como entrenador personal experto.

Genera una rutina ${isCouple ? "para pareja" : "individual"} usando el perfil y horario.

Perfil 1:
- Nombre: ${member1.nombre}
- Nivel: ${member1.nivel}
- Objetivo: ${member1.objetivo}
- Peso: ${member1.peso}
- Lesiones: ${member1.lesiones || "Ninguna"}

${isCouple ? `Perfil 2:
- Nombre: ${member2?.nombre}
- Nivel: ${member2?.nivel}
- Objetivo: ${member2?.objetivo}
- Peso: ${member2?.peso}
- Lesiones: ${member2?.lesiones || "Ninguna"}` : ""}

Horario disponible: ${scheduleText}

Reglas:
- Cada dia debe tener calentamiento + rutina principal.
- Mantener estructura segura y progresiva.
- Si es pareja, usar enfocadoA: ambos|hombre|mujer cuando aplique.

Responde JSON:
{
  "routine_name": "Nombre",
  "exercises": [
    {
      "id": "uuid",
      "dia": "Lunes",
      "nombre": "Ejercicio",
      "series": 4,
      "repeticiones": "12-10-8",
      "descanso": 60,
      "categoria": "calentamiento|maquina",
      "enfocadoA": "ambos|hombre|mujer",
      "grupo_muscular": "pectoral"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const parsed = parseJsonWithFallback(response.text()) as {
            routine_name?: string;
            nombre?: string;
            exercises?: GeminiExerciseRaw[];
        };

        const exercises: EjercicioRutina[] = (parsed.exercises || []).map((ex) => toRoutineExercise(ex));

        return {
            exercises,
            unclearItems: [],
            confidence: "high",
            routineName: parsed.routine_name || parsed.nombre,
        };
    } catch (error: unknown) {
        console.error("Gemini generation error:", error);
        throw new Error("Error al generar la rutina.");
    }
};

export const reorganizeRoutine = async (
    exercises: EjercicioRutina[],
    userDescription?: string
): Promise<AnalysisResult> => {
    try {
        const prompt = `Actua como entrenador experto.

Reorganiza estos ejercicios en una rutina semanal logica.

Entrada:
${JSON.stringify(
    exercises.map((e) => ({
        nombre: e.nombre,
        series: e.series,
        repeticiones: e.repeticiones,
        descanso: e.descanso,
        categoria: e.categoria,
        dia_actual: e.dia,
    }))
)}

Contexto adicional:
"${userDescription || "Divide por dias de forma logica y separa calentamiento de rutina principal."}"

Devuelve JSON:
{
  "routine_name": "Nombre sugerido",
  "exercises": [
    {
      "nombre": "Nombre",
      "dia": "Dia 1",
      "categoria": "calentamiento|maquina",
      "series": 3,
      "repeticiones": "12",
      "descanso": 60,
      "grupo_muscular": "pectoral"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const parsed = parseJsonWithFallback(response.text()) as {
            routine_name?: string;
            exercises?: GeminiExerciseRaw[];
        };

        return {
            exercises: (parsed.exercises || []).map((ex) => ({
                ...toRoutineExercise(ex, "General"),
                id: crypto.randomUUID(),
            })),
            unclearItems: [],
            confidence: "high",
            routineName: parsed.routine_name,
            isAI: true,
        };
    } catch (error: unknown) {
        console.error("Gemini reorganize error:", error);
        throw error;
    }
};

export const coachChat = async (
    message: string,
    history: { role: "user" | "model"; parts: { text: string }[] }[],
    userProfile: DatosPersonales
): Promise<string> => {
    try {
        const validHistory = history.map((h) => ({
            role: h.role,
            parts: h.parts.map((p) => ({ text: p.text })),
        }));

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{
                        text: `Eres el coach de GymBro. Perfil: ${userProfile.nombre}, nivel ${userProfile.nivel}, objetivo ${userProfile.objetivo}, peso ${userProfile.peso}kg, lesiones: ${userProfile.lesiones || "Ninguna"}. Responde tecnico y claro.`,
                    }],
                },
                {
                    role: "model",
                    parts: [{
                        text: `Entendido. Soy el coach de ${userProfile.nombre}. Listo para ayudarte con recomendaciones tecnicas de entrenamiento.`,
                    }],
                },
                ...validHistory,
            ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error: unknown) {
        console.error("Gemini chat error:", error);
        return "Lo siento, tuve un problema al procesar tu consulta. Intentalo de nuevo.";
    }
};
