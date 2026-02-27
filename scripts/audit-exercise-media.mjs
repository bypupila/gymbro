import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MEDIA_FILE = path.resolve(process.cwd(), 'src/data/exerciseMedia.ts');
const OEMBED_BASE = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=';
const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const CONCURRENCY = 8;

const parseEntries = (content) => {
    const entryRegex = /^\s*"([^"]+)":\s*\{\s*videoId:\s*"([^"]+)"\s*\}/gm;
    const entries = [];
    let match = entryRegex.exec(content);

    while (match) {
        entries.push({
            exerciseName: match[1],
            videoId: match[2],
        });
        match = entryRegex.exec(content);
    }

    return entries;
};

const chunk = (items, size) => {
    const result = [];
    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }
    return result;
};

const validateWithOEmbed = async (videoId) => {
    const url = `${OEMBED_BASE}${videoId}&format=json`;
    try {
        const response = await fetch(url, { method: 'GET' });
        return response.ok;
    } catch {
        return false;
    }
};

const main = async () => {
    const source = await fs.readFile(MEDIA_FILE, 'utf8');
    const entries = parseEntries(source);

    if (entries.length === 0) {
        console.error('No se encontraron entradas de media en src/data/exerciseMedia.ts');
        process.exitCode = 1;
        return;
    }

    const invalidFormatEntries = entries.filter((entry) => !ID_PATTERN.test(entry.videoId));
    const uniqueIds = Array.from(new Set(entries.map((entry) => entry.videoId)));
    const idValidationMap = new Map();

    for (const idBatch of chunk(uniqueIds, CONCURRENCY)) {
        const results = await Promise.all(idBatch.map(async (videoId) => ({
            videoId,
            valid: await validateWithOEmbed(videoId),
        })));
        for (const result of results) {
            idValidationMap.set(result.videoId, result.valid);
        }
    }

    const invalidOEmbedEntries = entries.filter((entry) => idValidationMap.get(entry.videoId) === false);
    const duplicateById = new Map();

    for (const entry of entries) {
        const names = duplicateById.get(entry.videoId) || [];
        names.push(entry.exerciseName);
        duplicateById.set(entry.videoId, names);
    }

    const duplicatedIds = Array.from(duplicateById.entries())
        .filter(([, names]) => names.length > 1)
        .map(([videoId, names]) => ({ videoId, names }));

    console.log('=== Auditoria de Exercise Media ===');
    console.log(`Archivo: ${MEDIA_FILE}`);
    console.log(`Total ejercicios mapeados: ${entries.length}`);
    console.log(`IDs unicos: ${uniqueIds.length}`);
    console.log(`IDs con formato invalido: ${invalidFormatEntries.length}`);
    console.log(`IDs con oEmbed invalido: ${new Set(invalidOEmbedEntries.map((entry) => entry.videoId)).size}`);
    console.log(`IDs repetidos (revision): ${duplicatedIds.length}`);
    console.log('');

    if (invalidFormatEntries.length > 0) {
        console.log('--- Formato de ID invalido ---');
        for (const entry of invalidFormatEntries) {
            console.log(`- ${entry.exerciseName}: ${entry.videoId}`);
        }
        console.log('');
    }

    if (invalidOEmbedEntries.length > 0) {
        console.log('--- oEmbed invalido ---');
        for (const entry of invalidOEmbedEntries) {
            console.log(`- ${entry.exerciseName}: ${entry.videoId}`);
        }
        console.log('');
    }

    if (duplicatedIds.length > 0) {
        console.log('--- IDs repetidos entre ejercicios ---');
        for (const duplicate of duplicatedIds) {
            console.log(`- ${duplicate.videoId}: ${duplicate.names.join(' | ')}`);
        }
        console.log('');
    }

    if (invalidFormatEntries.length > 0 || invalidOEmbedEntries.length > 0) {
        process.exitCode = 1;
    } else {
        console.log('Auditoria completa sin errores de formato/oEmbed.');
    }
};

void main();
