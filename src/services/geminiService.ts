import { GoogleGenerativeAI } from "@google/generative-ai";
import { EjercicioRutina, AnalysisResult, DatosPersonales, Clarification, HorarioSemanal, DiaEntrenamiento } from "../stores/userStore";

interface GeminiExerciseRaw {
    id?: string;
    nombre_original?: string;
    nombre_estandarizado?: string;
    nombre?: string;
    series?: number | string;
    repeticiones?: string;
    descanso?: number;
    categoria?: 'calentamiento' | 'maquina' | string;
    dia?: string;
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
// Evitar exponer detalles sensibles en consola (especialmente en producción).
if (IS_DEV) {
    console.debug("Gemini: API key cargada:", API_KEY.length >= 10 ? "sí" : "no");
    if (API_KEY.length < 10) console.warn("Gemini: falta `VITE_GEMINI_API_KEY` o es inválida.");
}
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
    }
});


export const analyzeRoutineImages = async (
    image1Base64: string,
    image2Base64?: string,
    userDescription?: string
): Promise<AnalysisResult> => {
    try {
        const prompt = `Actúa como un experto en digitalización de datos y entrenador personal.

Tu tarea es extraer EXCLUSIVAMENTE la rutina de ejercicios asignada al usuario a partir de la imagen proporcionada.

INSTRUCCIÓN TÉCNICA (PRECISIÓN ROBÓTICA):
- Extracción de datos 100% precisa.
- NO seas creativo.
- NO inventes ejercicios que no están en la foto.
- Cíñete estrictamente a lo que ves.

CONTEXTO ADICIONAL DEL USUARIO (MUY IMPORTANTE):
"${userDescription || 'No proporcionado'}"

INSTRUCCIONES DE EXTRACCIÓN CRÍTICAS:
1. SOLO extrae ejercicios marcados (con números a mano, checks o subrayados).
2. REPETICIONES COMPLEJAS: 
   - El campo "repeticiones" es un STRING. Capta la realidad:
   - Si es un rango, mantenlo: "12-15".
   - Si es por tiempo, mantenlo: "45 seg" o "30s".
   - Si es progesiva/piramidal (diferentes reps por serie), capta la secuencia: "15-12-10-8" o "12/10/8".
3. SERIES: Extrae el número total de series indicado.
4. DÍAS: Identifica específicamente los días de la semana (Lunes, Martes, etc.). Si NO están escritos, GENERA una pregunta en "unclear_items" preguntando a qué días de la semana corresponde cada bloque o entrenamiento. No asumas "Día 1" por defecto si hay ambigüedad.
5. INSPECCIÓN ESTRUCTURAL Y CONSULTA: Antes de extraer la lista completa, detecta "claves de autor":
   - ¿Hay símbolos (*, ●, √) que diferencien bloques?
   - ¿Hay códigos de colores o subrayados que separen por días o categorías?
   - ¿Hay notas al margen sobre el orden de los días?
   Si no estás 100% seguro de cómo funcionan estas claves, DETÉN la asunción y genera preguntas específicas en "unclear_items".
   
INSTRUCCIÓN DE CLARIFICACIÓN:
- Si el orden de los días es ambiguo: PREGUNTA.
- Si la diferencia entre calentamiento y rutina principal no es obvia: PREGUNTA.
- Si hay texto manuscrito que parece ser una instrucción de uso de la tabla: PREGUNTA.

ESTRUCTURA DE RESPUESTA (JSON PURO):
{
    "routine_name": "Nombre de la rutina",
    "description": "Resumen",
    "exercises": [
        {
            "id": "uuid",
            "dia": "Lunes, Martes, etc.",
            "nombre_original": "Texto imagen",
            "nombre_estandarizado": "Nombre técnico",
            "series": 3,
            "repeticiones": "12-15",
            "observaciones": "notas extra",
            "grupo_muscular": "pectoral",
            "categoria": "calentamiento o maquina"
        }
    ],
    "unclear_items": [
        {
            "id": "q_id",
            "question": "¿Qué significan los puntos rojos junto a estos ejercicios?",
            "detected_value": "Punto rojo",
            "options": ["Calentamiento", "Serie pesada", "Biset"],
            "exercise_index": 0,
            "field": "categoria"
        }
    ],
    "confidence_level": "High"
}`;

        const imageParts = [
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
        let text = response.text();
        // Evitar volcar la respuesta completa en consola (puede contener datos del usuario).
        if (IS_DEV) console.debug("Gemini: respuesta recibida.");

        // Clean markdown if present
        if (text.trim().startsWith('```')) {
            text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            const parsed = JSON.parse(text);

            const exercises: EjercicioRutina[] = (parsed.exercises || []).map((ex: GeminiExerciseRaw) => ({
                id: ex.id || crypto.randomUUID(),
                nombre: ex.nombre_estandarizado || ex.nombre_original || ex.nombre || "Ejercicio",
                series: typeof ex.series === 'number' ? ex.series : parseInt(ex.series) || 3,
                repeticiones: String(ex.repeticiones || "10-12"),
                descanso: 60,
                categoria: (ex.categoria === 'calentamiento' ? 'calentamiento' : 'maquina') as 'calentamiento' | 'maquina',
                dia: ex.dia || "Día 1",
                grupoMuscular: ex.grupo_muscular,
                nombreOriginal: ex.nombre_original,
                observaciones: ex.observaciones,
                enfocadoA: 'ambos'
            }));

            const unclearItems: Clarification[] = (parsed.unclear_items || []).map((item: GeminiClarificationRaw) => ({
                id: item.id || crypto.randomUUID(),
                question: item.question,
                detectedValue: item.detected_value,
                options: item.options,
                exerciseIndex: item.exercise_index,
                field: item.field
            }));

            return {
                exercises: exercises,
                unclearItems: unclearItems,
                confidence: parsed.confidence_level?.toLowerCase() === 'high' ? 'high' :
                    parsed.confidence_level?.toLowerCase() === 'medium' ? 'medium' : 'low',
                routineName: parsed.routine_name
            };
        } catch (pError) {
            console.error("JSON Parse Error:", pError);

            // Fallback for older models or unexpected output
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // ... logic replicated or simplified ...
                return {
                    exercises: (parsed.exercises || []).map((ex: GeminiExerciseRaw) => ({
                        id: ex.id || crypto.randomUUID(),
                        nombre: ex.nombre_estandarizado || ex.nombre_original || ex.nombre || "Ejercicio",
                        series: typeof ex.series === 'number' ? ex.series : parseInt(ex.series) || 3,
                        repeticiones: String(ex.repeticiones || "10-12"),
                        descanso: 60,
                        categoria: 'maquina' as const,
                        dia: ex.dia || "Día 1",
                    })),
                    unclearItems: [],
                    confidence: 'medium',
                    routineName: parsed.routine_name
                };
            }
            throw new Error("No pudimos formatear los datos. Intenta con una foto más nítida.");
        }

        throw new Error("No pudimos extraer datos de la imagen.");
    } catch (error: Error) {
        console.error("Gemini Error:", error);
        throw new Error(error.message || "Error al conectar con el servicio de IA.");
    }
};

export const generateRoutineFromProfile = async (
    member1: DatosPersonales,
    member2: DatosPersonales | null = null,
    horario: HorarioSemanal | null = null
): Promise<AnalysisResult> => {
    try {
        const isCouple = !!member2;

        const prompt = `
            Actúa como un entrenador personal de élite.
            
            OBJETIVO:
            Crea una rutina personalizada ${isCouple ? 'para una PAREJA' : 'para una persona'}.
            
            INSTRUCCIÓN TÉCNICA (PRECISIÓN):
            - Generación de datos técnica y funcional.
            - Evita descripciones creativas innecesarias.
            - Respeta estrictamente los perfiles proporcionados.
            
            DINÁMICA DE REPETICIONES (IMPORTANTE):
            Usa variedad en el campo "repeticiones" (String):
            - Rangos para hipertrofia: "10-12" o "12-15".
            - Isométricos/Resistencia: "30-45 seg".
            - Progresivas/Piramidales: "15-12-10" (indicando que cada serie baja reps y sube peso).
            
            PERFIL MIEMBRO 1 (${member1.nombre}): ${member1.nivel}, ${member1.objetivo}, ${member1.peso}kg.
            ${isCouple ? `PERFIL MIEMBRO 2 (${member2?.nombre}): ${member2?.nivel}, ${member2?.objetivo}, ${member2?.peso}kg.` : ''}

            REGLAS:
            1. HORARIO: Usa ESTRICTAMENTE estos días y grupos: ${JSON.stringify(horario?.dias?.filter((d: DiaEntrenamiento) => d.entrena).map((d: DiaEntrenamiento) => `${d.dia}: ${d.grupoMuscular}`))}.
            2. CATEGORÍAS: Cada día DEBE empezar con 2-3 ejercicios de "calentamiento" (activación específica, movilidad) y luego 5-7 ejercicios de "maquina" (rutina principal).
            3. ORDEN LÓGICO: Dentro de la rutina principal, coloca primero los ejercicios multiarticulares pesados y al final los de aislamiento. Controla el volumen para evitar sobrecarga.
            4. Si es pareja, ejercicios compartidos ("ambos") + 2 específicos para cada uno ("hombre"/"mujer") intercalados lógicamente.
            5. Incluye progresiones en ejercicios básicos (ej: Sentadillas: "12-10-8").

            ESTRUCTURA (JSON):
            {
                "routine_name": "Nombre",
                "exercises": [
                    {
                        "id": "uuid",
                        "dia": "Lunes, Martes, etc. (según horario)",
                        "nombre": "Ejercicio",
                        "series": 4, 
                        "repeticiones": "12-10-8 o 45s o 10-12",
                        "descanso": 60,
                        "categoria": "calentamiento" | "maquina",
                        "enfocadoA": "ambos" | "hombre" | "mujer",
                        "grupo_muscular": "pectoral | espalda | trapecio | hombros | biceps | triceps | piernas | gluteos"
                    }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean markdown if present
        if (text.trim().startsWith('```')) {
            text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            const parsed = JSON.parse(text);
            const exercises = (parsed.exercises || []).map((ex: GeminiExerciseRaw) => ({
                ...ex,
                id: ex.id && ex.id.length > 5 ? ex.id : crypto.randomUUID(),
                categoria: (ex.categoria === 'calentamiento' ? 'calentamiento' : 'maquina') as 'calentamiento' | 'maquina',
                enfocadoA: ex.enfocadoA || 'ambos',
                grupoMuscular: ex.grupo_muscular
            }));

            return {
                exercises,
                unclearItems: [],
                confidence: 'high',
                routineName: parsed.routine_name
            };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
            // Fallback for regex mapping
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    exercises: (parsed.exercises || []).map((ex: GeminiExerciseRaw) => ({
                        ...ex,
                                            id: ex.id && ex.id.length > 5 ? ex.id : crypto.randomUUID(),
                                            categoria: (ex.categoria === 'calentamiento' ? 'calentamiento' : 'maquina') as 'calentamiento' | 'maquina',                        enfocadoA: ex.enfocadoA || 'ambos',
                        grupoMuscular: ex.grupo_muscular
                    })),
                    unclearItems: [],
                    confidence: 'high',
                    routineName: parsed.routine_name || parsed.nombre
                };
            }
            throw new Error("Error en estructura generada.");
        }
    } catch (error: Error) {
        console.error("Gemini Generation Error:", error);
        throw new Error("Error al generar la rutina.");
    }
};

export const reorganizeRoutine = async (
    exercises: EjercicioRutina[],
    userDescription?: string
): Promise<AnalysisResult> => {
    try {
        const prompt = `Actúa como un experto entrenador personal.
        
        Tu tarea es REORGANIZAR la siguiente lista de ejercicios en una rutina semanal lógica.
        
        ENTRADA:
        ENTRADA:
        ${JSON.stringify(exercises.map(e => ({
            nombre: e.nombre,
            series: e.series,
            repeticiones: e.repeticiones,
            descanso: e.descanso,
            categoria: e.categoria,
            dia_actual: e.dia
        })))}
        
        CONTEXTO ADICIONAL:
        "${userDescription || 'Divide los ejercicios en días lógicos y separa el calentamiento de la rutina principal.'}"
        
        REGLAS:
        1. Identifica qué ejercicios son de CALENTAMIENTO y márcalos como "categoria": "calentamiento".
        2. Divide los ejercicios en días (Día 1, Día 2, etc. o nombres de músculos).
        2. Divide los ejercicios en días (Día 1, Día 2, etc. o nombres de músculos) usando "dia_actual" como referencia si tiene sentido.
        3. Mantén los valores de series, repeticiones y descanso originales si son válidos.
        
        ESTRUCTURA DE RESPUESTA (JSON):
        {
            "routine_name": "Nombre sugerido",
            "exercises": [
                {
                    "nombre": "Nombre",
                    "dia": "Día 1",
                    "categoria": "calentamiento o maquina",
                    "series": 3,
                    "repeticiones": "12",
                    "grupo_muscular": "pectoral"
                }
            ]
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean markdown if present
        if (text.trim().startsWith('```')) {
            text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw e;
            }
        }

        return {
            exercises: (parsed.exercises || []).map((ex: GeminiExerciseRaw) => ({
                id: crypto.randomUUID(),
                nombre: ex.nombre,
                series: ex.series || 3,
                repeticiones: String(ex.repeticiones || "12"),
                descanso: ex.descanso || 60,
                categoria: (ex.categoria === 'calentamiento' ? 'calentamiento' : 'maquina') as 'calentamiento' | 'maquina',
                dia: ex.dia || "General",
                grupoMuscular: ex.grupo_muscular
            })),
            unclearItems: [],
            confidence: 'high',
            routineName: parsed.routine_name,
            isAI: true
        };
    } catch (error) {
        console.error("Error reorganizando:", error);
        throw error;
    }
};

export const coachChat = async (
    message: string,
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    userProfile: DatosPersonales
): Promise<string> => {
    try {
        // Ensure history structure matches Gemini requirements
        const validHistory = history.map(h => ({
            role: h.role,
            parts: h.parts.map(p => ({ text: p.text }))
        }));

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `Eres el Coach de Gymbro. Perfil del usuario: ${userProfile.nombre}, ${userProfile.nivel}, objetivo: ${userProfile.objetivo}, peso: ${userProfile.peso}kg. Responde de forma motivadora y técnica.` }],
                },
                {
                    role: "model",
                    parts: [{ text: `¡Entendido! Soy el Coach de ${userProfile.nombre}. Estoy listo para ayudarle a alcanzar su objetivo de ${userProfile.objetivo} con consejos técnicos y motivación. ¿En qué puedo ayudarte hoy?` }],
                },
                ...validHistory
            ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Lo siento, tuve un problema al procesar tu consulta. Inténtalo de nuevo.";
    }
};
