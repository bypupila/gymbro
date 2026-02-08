import fs from 'fs';

const filePath = 'c:\\0. BY PUPILA - Proyectos\\Gymbro\\src\\components\\ActiveWorkout.tsx';
const content = fs.readFileSync(filePath); // Buffer

// Print first 500 bytes as hex and text to see what we have
console.log('Hex first 100 bytes:', content.subarray(0, 100).toString('hex'));
console.log('Text (utf8):', content.subarray(0, 500).toString('utf8'));
console.log('Text (latin1):', content.subarray(0, 500).toString('latin1'));

// Look for the "Fire" emoji location or context "Calentamiento"
const index = content.indexOf('Calentamiento');
if (index !== -1) {
    console.log('Found "Calentamiento" at', index);
    console.log('Surrounding bytes (hex):', content.subarray(index - 50, index + 50).toString('hex'));
    console.log('Surrounding text (utf8):', content.subarray(index - 50, index + 50).toString('utf8'));
}
