import fs from 'fs';

const filePath = 'c:\\0. BY PUPILA - Proyectos\\Gymbro\\src\\components\\ActiveWorkout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Define replacements
const replacements = [
    { original: 'ðŸ”¥', replacement: '🔥' },
    { original: 'ðŸ’ª', replacement: '💪' },
    { original: 'ðŸ“‹', replacement: '📋' },
    { original: 'ðŸ ƒâ€ â™‚ï¸ ', replacement: '🏃‍♂️' },
    { original: 'ðŸ Ž', replacement: '🏃‍♂️' }, // Just in case
    { original: 'Ã¡', replacement: 'á' },
    { original: 'Ã©', replacement: 'é' },
    { original: 'Ã­', replacement: 'í' },
    { original: 'Ã³', replacement: 'ó' },
    { original: 'Ãº', replacement: 'ú' },
    { original: 'Ã±', replacement: 'ñ' },
    { original: 'Â¿', replacement: '¿' }
];

let changed = false;
for (const { original, replacement } of replacements) {
    if (content.includes(original)) {
        console.log(`Found ${original}, replacing with ${replacement}`);
        content = content.split(original).join(replacement);
        changed = true;
    }
}

if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('File updated successfully.');
} else {
    console.log('No changes needed.');
}
