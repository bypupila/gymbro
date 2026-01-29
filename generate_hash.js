import crypto from 'crypto';

async function generateHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const keyLen = 64;
    const cost = 16384; // N
    const blockSize = 8; // r
    const parallelization = 1; // p
    const maxmem = 128 * cost * blockSize + 1024 * 1024; // Ensure enough memory

    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keyLen, { N: cost, r: blockSize, p: parallelization, maxmem }, (err, derivedKey) => {
            if (err) reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

import fs from 'fs';

generateHash('Gymbro2025!').then(hash => {
    fs.writeFileSync('hash.txt', hash);
    console.log('Hash written to hash.txt');
}).catch(console.error);
