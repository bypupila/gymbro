import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import process from 'node:process';
import { parseArgs } from './lib/cli.mjs';

function resolveRepoSlug(repoArg) {
    if (repoArg && typeof repoArg === 'string') {
        return repoArg.trim();
    }

    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const sshMatch = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/i);
    if (sshMatch) {
        return `${sshMatch[1]}/${sshMatch[2]}`.replace(/\.git$/i, '');
    }

    throw new Error(`No se pudo resolver repo desde origin: ${remoteUrl}`);
}

function hasGhAuth() {
    try {
        execSync('gh auth status -h github.com', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function readServiceAccountJson() {
    const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (fromEnv) {
        JSON.parse(fromEnv);
        return fromEnv;
    }

    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath) {
        return null;
    }

    const resolved = path.resolve(keyPath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`No existe FIREBASE_SERVICE_ACCOUNT_KEY_PATH: ${resolved}`);
    }

    const content = fs.readFileSync(resolved, 'utf8');
    JSON.parse(content);
    return content;
}

function buildSecretsMap() {
    const map = new Map();
    const optionalEnvSecrets = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
        'GYMBRO_EMAIL',
        'GYMBRO_PASSWORD',
        'GYMBRO_EMAIL_2',
        'GYMBRO_PASSWORD_2',
        'GYMBRO_BASE_URL',
    ];

    for (const key of optionalEnvSecrets) {
        const value = process.env[key];
        if (value && typeof value === 'string' && value.trim()) {
            map.set(key, value);
        }
    }

    const serviceAccountJson = readServiceAccountJson();
    if (serviceAccountJson) {
        map.set('FIREBASE_SERVICE_ACCOUNT_JSON', serviceAccountJson);
    }

    return map;
}

function setSecret(repo, name, value) {
    const result = spawnSync('gh', ['secret', 'set', name, '--repo', repo], {
        input: value,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.status !== 0) {
        const stderr = result.stderr || '';
        throw new Error(`Fallo al guardar secret ${name}: ${stderr.trim()}`);
    }
}

function printUsage() {
    console.log(`
Uso:
  npm run admin:push:github-secrets -- --repo=owner/repo
  npm run admin:push:github-secrets -- --repo=owner/repo --dry-run

Si no pasas --repo, se usa el remote origin actual.
`);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || args.h) {
        printUsage();
        return;
    }

    const repo = resolveRepoSlug(args.repo);
    const dryRun = Boolean(args['dry-run']);
    const secretsMap = buildSecretsMap();

    if (secretsMap.size === 0) {
        throw new Error('No hay secrets para subir (revisa .env).');
    }

    console.log(`Repo objetivo: ${repo}`);
    console.log(`Secrets detectados: ${Array.from(secretsMap.keys()).join(', ')}`);

    if (dryRun) {
        console.log('Dry run: no se envio ningun secret.');
        return;
    }

    if (!hasGhAuth()) {
        throw new Error('GitHub CLI no autenticado. Ejecuta: gh auth login');
    }

    for (const [name, value] of secretsMap.entries()) {
        setSecret(repo, name, value);
        console.log(`Secret actualizado: ${name}`);
    }

    console.log('Secrets de CI/CD actualizados correctamente.');
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
