// =====================================================
// GymBro PWA - Exercise Media Database
// Mapeo de ejercicios a videos de YouTube
// =====================================================

export interface ExerciseMedia {
    videoId: string;  // ID del video de YouTube (11 caracteres)
}

// Helper para obtener thumbnail de YouTube (alta calidad)
export const getYouTubeThumbnail = (videoId: string): string =>
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

// Helper para obtener URL completa del video
export const getYouTubeUrl = (videoId: string): string =>
    `https://www.youtube.com/watch?v=${videoId}`;

// Mapeo de ejercicios a videos de YouTube
// Los videos son de canales reconocidos de fitness
export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
    // =====================================================
    // CALENTAMIENTO Y GENERALES
    // =====================================================
    "Calentamiento": { videoId: "g_tea8ZNk5A" },            // Full Body Stretch (Safe Warm Up)
    "Calentamiento General": { videoId: "g_tea8ZNk5A" },    // Duplicate for matching
    "Movilidad Articular": { videoId: "g_tea8ZNk5A" },      // Mobility
    "Estiramiento": { videoId: "g_tea8ZNk5A" },             // Full Body Stretch
    "Vuelta a la Calma": { videoId: "g_tea8ZNk5A" },        // Cool Down
    "Jumping Jacks": { videoId: "c4DAnQ6DtF8" },            // Jumping Jacks
    "Burpees": { videoId: "u6ZelKyUM6g" },                  // Burpees (Verified 200)
    "Mountain Climbers": { videoId: "cnyTQDSE884" },        // Mountain Climbers

    // =====================================================
    // ZONA MEDIA (CORE)
    // =====================================================
    "Core": { videoId: "pSHjTRCQxIw" },                     // Plank (Generic Core)
    "Zona Media": { videoId: "pSHjTRCQxIw" },               // Plank (Generic Core)
    "Abdominales": { videoId: "2fbujeH3F0E" },              // Core fallback
    "Espinales": { videoId: "-MTjHC3NC2s" },                // Back fallback

    // =====================================================
    // CARDIO
    // =====================================================
    "Cinta": { videoId: "EIb_mtyZe-w" },                    // Treadmill Form
    "Eliptico": { videoId: "ph3pddpKzzw" },                 // Elliptical Safe Fallback
    "Bicicleta": { videoId: "ph3pddpKzzw" },                // Fallback Safe Video
    "Spinning": { videoId: "ph3pddpKzzw" },                 // Fallback Safe Video
    "Remo": { videoId: "GZbfZ033f74" },                     // Fallback Remo Polea

    // =====================================================
    // ESPINALES
    // =====================================================
    "Espinales en Maquina": { videoId: "-MTjHC3NC2s" },     // Back Extension Machine (45 degree)
    "Espinales en Banco": { videoId: "-MTjHC3NC2s" },       // Fallback Machine
    "Espinales en Colchoneta": { videoId: "pSHjTRCQxIw" },  // Fallback Plank (Better than Cardio)

    // =====================================================
    // ABDOMINALES
    // =====================================================
    "Abdominales en Maquina": { videoId: "2fbujeH3F0E" },   // Crunch en mï¿½quina
    "Abdominales en Colchoneta": { videoId: "Xyd_fa5zoEU" }, // Crunch bï¿½sico
    "Abdominales en Banco": { videoId: "Xyd_fa5zoEU" },     // Fallback Crunch
    "Abdominales en Polea": { videoId: "2fbujeH3F0E" },     // Fallback Maquina
    "Plancha Abdominal": { videoId: "pSHjTRCQxIw" },        // Plancha correcta
    "Abdominales Inferiores en Paralelas": { videoId: "hdng3Nm1x_E" }, // Elevaciï¿½n piernas
    "Abdominales Inferiores en Colchoneta": { videoId: "l4kQd9eWclE" }, // Lower abs

    // =====================================================
    // OBLICUOS
    // =====================================================
    "Oblicuos en Colchoneta": { videoId: "Iwyvozckjak" },   // Bicycle crunches
    "Oblicuos en Banco": { videoId: "Iwyvozckjak" },        // Fallback Oblicuos
    "Plancha Lateral": { videoId: "K2VljzCC16g" },          // Side plank
    "Oblicuos Cruzados": { videoId: "wkD8rjkodUI" },        // Russian twist

    // =====================================================
    // PECTORAL
    // =====================================================
    "Chest Press": { videoId: "N7DjfGB8-xY" },              // Chest press mï¿½quina (Fitness Consciente)
    "Chest Press Hammer": { videoId: "N7DjfGB8-xY" },       // Hammer strength press (Same mechanism as Machine Press)
    "Peck Deck": { videoId: "WtMmRk1SCEM" },                // Peck deck / fly machine
    "Pec Fly": { videoId: "WtMmRk1SCEM" },                  // Pec fly machine
    "Press en Banco Plano con Barra": { videoId: "TAH8RxOS0VI" }, // Bench press barra
    "Press en Banco Plano con Smith": { videoId: "TAH8RxOS0VI" }, // Fallback Barra
    "Press en Banco Plano con Mancuernas": { videoId: "Lp9LLEGJJrI" }, // Dumbbell press
    "Press en Banco Inclinado con Barra": { videoId: "vUMtItXfO8Y" }, // Incline barbell press
    "Press en Banco Inclinado con Smith": { videoId: "vUMtItXfO8Y" }, // Fallback Barra
    "Press en Banco Inclinado con Mancuernas": { videoId: "5wN-99Fny5Q" }, // Incline dumbbell press
    "Cruces en Polea": { videoId: "WNtBIde3Qks" },          // Cable crossover
    "Apertura en Banco Plano": { videoId: "OrlXQdNwNwM" },  // Dumbbell fly
    "Apertura en Banco Inclinado": { videoId: "bhRTIO31e-E" }, // Incline fly
    "Flexiones de Brazos": { videoId: "24whjX_tS78" },      // Push ups

    // =====================================================
    // ESPALDA
    // =====================================================
    "Vertical Trac": { videoId: "EO9AmI-bu_0" },            // Lat pulldown mï¿½quina (Jalï¿½n al pecho)
    "Low Row (Remo Bajo)": { videoId: "JtTusrYzAos" },      // Seated cable row
    "Low Row Hammer": { videoId: "JtTusrYzAos" },           // Hammer row (Same technique as Low Row)
    "Lat con Barra Pronado": { videoId: "EO9AmI-bu_0" },    // Lat pulldown pronado
    "Lat con Barra Supino": { videoId: "wnqlYRu1hHk" },     // Lat pulldown supino
    "Lat con Triangulo": { videoId: "VUJYixXx5I8" },        // Close grip lat pulldown
    "Face Pull": { videoId: "Bc72POZyV6A" },                // Face Pull (Athlean-X Espanol)
    "Pull Over con Mancuerna": { videoId: "Lw0k_Gv0sIM" },  // Dumbbell pullover
    "Pull Over en Polea": { videoId: "Lw0k_Gv0sIM" },       // Fallback Mancuerna (Technique similar)
    "Remo con Barra": { videoId: "3uiWjik2yEQ" },           // Barbell row
    "Remo en Polea": { videoId: "JtTusrYzAos" },            // Cable row
    "Dominadas": { videoId: "N_8qW6Y6K-c" },                // Pull ups
    "Remo a un Brazo con Mancuerna": { videoId: "evJBZ_8-2ik" }, // One arm dumbbell row
    "Remo a un Brazo en Polea": { videoId: "vTNPYGGrDmg" }, // One arm cable row

    // =====================================================
    // TRAPECIO
    // =====================================================
    "Tiron al Menton": { videoId: "cJRVVxmytaM" },          // Fallback Encogimiento
    "Encogimiento con Barra": { videoId: "cJRVVxmytaM" },   // Barbell shrugs
    "Encogimiento con Mancuernas": { videoId: "cJRVVxmytaM" }, // Dumbbell shrugs
    "Encogimiento con Discos": { videoId: "cJRVVxmytaM" },  // Plate shrugs

    // =====================================================
    // HOMBROS
    // =====================================================
    "Shoulder Press (Maquina)": { videoId: "Wp4BlxcFTkE" }, // Machine shoulder press
    "Press de Hombros con Barra": { videoId: "2yjwXTZQDDI" }, // Overhead press barbell
    "Press de Hombros con Mancuernas": { videoId: "qEwKCR5JCog" }, // Dumbbell shoulder press
    "Press de Hombros con Smith": { videoId: "2yjwXTZQDDI" }, // Fallback Barbell Overhead
    "Press Arnold": { videoId: "3ml7BH7mNwQ" },             // Arnold press
    "Press Militar": { videoId: "2yjwXTZQDDI" },            // Military press (Barbell overhead)
    "Vuelos Frontales con Mancuernas": { videoId: "-t7fuZ0KhDA" }, // Front raise
    "Vuelos Frontales en Polea": { videoId: "-t7fuZ0KhDA" }, // Fallback Dumbbell Front Raise
    "Vuelos Laterales con Mancuernas": { videoId: "3VcKaXpzqRo" }, // Lateral raise
    "Vuelos Laterales en Polea": { videoId: "3VcKaXpzqRo" }, // Fallback Dumbbell Lateral Raise
    "Vuelos Posteriores en Maquina": { videoId: "3VcKaXpzqRo" }, // Reverse pec deck matches fly mostly
    "Vuelos Posteriores con Mancuernas": { videoId: "ttvfGg9d76c" }, // Rear delt fly dumbbell
    "Vuelos Posteriores en Polea": { videoId: "ttvfGg9d76c" }, // Fallback Dumbbell Rear Delt Fly

    // =====================================================
    // Bï¿½CEPS
    // =====================================================
    "Arm Curl (Biceps en Maquina)": { videoId: "ykJmrZ5v0Oo" }, // Fallback Mancuerna
    "Curl con Mancuernas": { videoId: "ykJmrZ5v0Oo" },      // Dumbbell curl
    "Curl en Polea": { videoId: "NFzTWp2qpiE" },            // Cable curl
    "Curl Alternado": { videoId: "sAq_ocpRh_I" },           // Alternating curl
    "Curl 21": { videoId: "kwG2ipFRgfo" },                  // Fallback Barra
    "Curl Parado con Barra": { videoId: "kwG2ipFRgfo" },    // Standing barbell curl
    "Banco Scott": { videoId: "soxrZlIl35U" },              // Preacher curl
    "Curl Concentrado": { videoId: "0AUGkch3tzc" },         // Concentration curl

    // =====================================================
    // TRï¿½CEPS
    // =====================================================
    "Arm Extension (Triceps en Maquina)": { videoId: "d_KZxkY_0cM" }, // Machine tricep extension
    "Extension en Polea con Barra": { videoId: "2-LAMcpzODU" }, // Tricep pushdown bar
    "Extension en Polea con Soga": { videoId: "kiuVA0gs3EI" }, // Rope pushdown
    "Press Frances": { videoId: "d_KZxkY_0cM" },            // Skull crusher
    "Press Cerrado con Barra": { videoId: "wxVRe9pmJdk" },  // Close grip bench press
    "Press Cerrado con Smith": { videoId: "wxVRe9pmJdk" },  // Close grip smith press
    "Fondos en Banco": { videoId: "6kALZikXxLc" },          // Bench dips
    "Fondos en Paralelas": { videoId: "2z8JmcrW-As" },      // Parallel bar dips
    "Triceps Concentrado con Mancuerna": { videoId: "nRiJVZDpdL0" }, // Overhead tricep extension
    "Triceps Concentrado en Polea": { videoId: "nRiJVZDpdL0" }, // Overhead cable extension
    "Patada de Triceps": { videoId: "6SS6K3lAwZ8" },        // Tricep kickback

    // =====================================================
    // PIERNAS
    // =====================================================
    "Prensa de Piernas": { videoId: "IZxyjW7MPJQ" },        // Leg Press
    "Prensa de Piernas 45 grados": { videoId: "IZxyjW7MPJQ" },    // Leg Press 45
    "Prensa de Piernas 90 grados": { videoId: "IZxyjW7MPJQ" },    // Leg Press 90
    "Prensa de Piernas 45 grados / 90 grados": { videoId: "IZxyjW7MPJQ" }, // Combined Leg Press
    "Prensa de Piernas 45\u00BA": { videoId: "IZxyjW7MPJQ" },     // Legacy alias (45º)
    "Prensa de Piernas 90\u00BA": { videoId: "IZxyjW7MPJQ" },     // Legacy alias (90º)
    "Prensa de Piernas 45\u00BA / 90\u00BA": { videoId: "IZxyjW7MPJQ" }, // Legacy alias
    "Prensa Inclinada": { videoId: "IZxyjW7MPJQ" },         // Leg Press
    "Prensa Horizontal": { videoId: "IZxyjW7MPJQ" },        // Leg Press
    "Prensa 45 grados": { videoId: "IZxyjW7MPJQ" },          // Leg press 45
    "Prensa 90 grados": { videoId: "IZxyjW7MPJQ" },          // Leg press horizontal
    "Prensa 45\u00B0": { videoId: "IZxyjW7MPJQ" },           // Legacy alias (45°)
    "Prensa 90\u00B0": { videoId: "IZxyjW7MPJQ" },           // Legacy alias (90°)
    "Leg Curl (Femorales)": { videoId: "1Tq3QdYUuHs" },     // Lying leg curl
    "Leg Extension (Cuadriceps)": { videoId: "YyvSfVjQeL0" }, // Leg extension
    "Gemelos": { videoId: "gwLzBJYoWlI" },                  // Calf raise machine
    "Maquina Aductores": { videoId: "SEdqd1n0cvg" },        // Multi-Hip (Verified 200)
    "Maquina Abductores": { videoId: "SEdqd1n0cvg" },       // Multi-Hip (Verified 200)
    "Multi-Hip": { videoId: "SEdqd1n0cvg" },                // Multi-Hip Machine (Verified 200)
    "Sentadilla Sissy": { videoId: "bEv6CCg2BC8" },         // Fallback Sentadilla Barra
    "Sentadilla con Barra": { videoId: "bEv6CCg2BC8" },     // Barbell squat
    "Sentadilla con Smith": { videoId: "bEv6CCg2BC8" },     // Fallback Sentadilla Barra
    "Sentadilla con Mancuernas": { videoId: "UXJrBgI2RxA" }, // Dumbbell squat
    "Estocadas con Mancuernas": { videoId: "D7KaRcUTQeE" }, // Lunges
    "Estocadas Caminando": { videoId: "D7KaRcUTQeE" },      // Lunges (Fallback static)
    "Sentadilla Bulgara": { videoId: "2C-uNgKwPLE" },       // Bulgarian Split Squat
    "Subida al Cajon (Step Up)": { videoId: "UXJrBgI2RxA" }, // Step Up Fallback (Verified 200)
    "Peso Muerto con Barra": { videoId: "op9kVnSso6Q" },    // Barbell deadlift
    "Peso Muerto con Mancuernas": { videoId: "lJ3QwaXNJfw" }, // Dumbbell deadlift

    // =====================================================
    // GLï¿½TEOS
    // =====================================================
    "Hip Thrust con Barra": { videoId: "xDmFkJxPzeM" },     // Barbell hip thrust
    "Hip Thrust con Smith": { videoId: "xDmFkJxPzeM" },     // Smith machine hip thrust
    "Hip Thrust en Colchoneta": { videoId: "SEdqd1n0cvg" }, // Glute bridge
    "Gluteos en Polea": { videoId: "SEdqd1n0cvg" },         // Fallback Glute Bridge
};


// Funcion para buscar media por nombre (busqueda flexible)
export const findExerciseMedia = (name: string): ExerciseMedia | null => {
    // Bï¿½squeda exacta
    if (EXERCISE_MEDIA[name]) {
        return EXERCISE_MEDIA[name];
    }

    // Normalizacion avanzada para busqueda fuzzy
    const normalize = (str: string) => {
        return str.toLowerCase()
            .replace(/[()]/g, '') // Eliminar parentesis
            .replace(/\b(con|en|de|la|el|los|las)\b/g, '') // Eliminar palabras de enlace
            .replace(/\s+/g, ' ') // Unificar espacios
            .trim();
    };

    const searchName = normalize(name);

    // 1. Intentar matching exacto normalizado
    const match = Object.entries(EXERCISE_MEDIA).find(([key]) => {
        const normalizedKey = normalize(key);
        return normalizedKey === searchName;
    });

    if (match) return match[1];

    // 2. Intentar contenciï¿½n mutua de tokens significativos
    const searchTokens = searchName.split(' ').filter(t => t.length > 2);

    const fuzzyMatch = Object.entries(EXERCISE_MEDIA).find(([key]) => {
        const normalizedKey = normalize(key);
        // Si la clave contiene el nombre buscado o viceversa
        if (normalizedKey.includes(searchName) || searchName.includes(normalizedKey)) return true;

        // Verificar si la mayorï¿½a de tokens coinciden
        const keyTokens = normalizedKey.split(' ').filter(t => t.length > 2);
        const matchingTokens = searchTokens.filter(token => keyTokens.some(k => k.includes(token) || token.includes(k)));

        // Si coinciden suficientes tokens (ej: "pull" "over" "mancuerna" vs "pull" "over" "mancuernas")
        return matchingTokens.length >= Math.min(searchTokens.length, keyTokens.length) * 0.7;
    });

    return fuzzyMatch ? fuzzyMatch[1] : null;
};

export const getExerciseImage = (name: string, group?: string): string => {
    const n = name.toLowerCase();

    // -- VISUAL OVERRIDES (Prioritize distinct images for duplicated videos) --
    if (n.includes('bicicleta') || n.includes('spinning')) return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop';
    if (n.includes('elï¿½ptico') || n.includes('eliptico')) return 'https://plus.unsplash.com/premium_photo-1664109999537-088e7d964da2?w=500&auto=format&fit=crop';
    if (n.includes('cinta')) return 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=500&auto=format&fit=crop';
    if (n.includes('espinales') || n.includes('lumbar')) return 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=500&auto=format&fit=crop';
    if (n.includes('aductor') || n.includes('abductor')) return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&auto=format&fit=crop'; // Leg generic

    // Primero buscar en EXERCISE_MEDIA (thumbnails de YouTube)
    const media = findExerciseMedia(name);
    if (media) {
        return getYouTubeThumbnail(media.videoId);
    }

    // Fallback: imagenes genï¿½ricas basadas en keywords
    const g = group?.toLowerCase() || '';

    // -- KEYWORD SPECIFIC (High Priority) --

    // Pectoral / Chest
    if (n.includes('press') && (n.includes('banca') || n.includes('plano') || n.includes('chest')))
        return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop';
    if (n.includes('peck deck') || n.includes('pec fly') || (n.includes('apertura') && g === 'pectoral'))
        return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop';

    // Legs / Glutes
    if (n.includes('sentadilla') || n.includes('squat'))
        return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&auto=format&fit=crop';
    if (n.includes('prensa') || n.includes('leg press'))
        return 'https://images.unsplash.com/photo-1541534741688-6078c64b5913?w=500&auto=format&fit=crop';
    if (n.includes('extensiï¿½n') && (n.includes('pierna') || n.includes('leg')))
        return 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=500&auto=format&fit=crop';
    if (n.includes('peso muerto') || n.includes('deadlift'))
        return 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=500&auto=format&fit=crop';
    if (n.includes('hip thrust') || g === 'gluteos')
        return 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=500&auto=format&fit=crop';

    // Back
    if (n.includes('pull down') || n.includes('lat') || n.includes('traccion'))
        return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=500&auto=format&fit=crop';
    if (n.includes('remo') || n.includes('row'))
        return 'https://images.unsplash.com/photo-1616724855591-301c663abc82?w=500&auto=format&fit=crop';

    // Shoulders
    if (n.includes('militar') || (n.includes('press') && (n.includes('hombro') || n.includes('shoulder'))))
        return 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=500&auto=format&fit=crop';
    if (n.includes('vuelo') || n.includes('lateral'))
        return 'https://images.unsplash.com/photo-1541534741688-6078c64b5913?w=500&auto=format&fit=crop';

    // Arms
    if (n.includes('curl') || n.includes('bicep'))
        return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop';
    if (n.includes('tricep') || n.includes('extensiï¿½n') && g === 'triceps')
        return 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=500&auto=format&fit=crop';

    // Core
    if (n.includes('abdomen') || n.includes('crunch') || n.includes('plancha') || g === 'abdominales')
        return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&auto=format&fit=crop';

    // -- GROUP FALLBACKS (Secondary) --
    if (g === 'pectoral') return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop';
    if (g === 'piernas' || g === 'gluteos') return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&auto=format&fit=crop';
    if (g === 'espalda') return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=500&auto=format&fit=crop';
    if (g === 'hombros') return 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=500&auto=format&fit=crop';
    if (g === 'cardio') return 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=500&auto=format&fit=crop';

    // Final Fallback
    return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop';
};

export const getExerciseVideo = (name: string): string | null => {
    const media = findExerciseMedia(name);
    return media ? getYouTubeUrl(media.videoId) : null;
};


