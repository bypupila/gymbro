import { spawn } from 'node:child_process';
import process from 'node:process';
import { chromium } from 'playwright';

const DEV_HOST = '127.0.0.1';
const DEV_PORT = 4173;
const DEV_URL = `http://${DEV_HOST}:${DEV_PORT}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cliArgs = new Set(process.argv.slice(2));
const shouldStartDevServer = !cliArgs.has('--no-dev-server');
const serverUrlArg = process.argv.find((arg) => arg.startsWith('--server-url='));
const targetServerUrl = serverUrlArg ? serverUrlArg.split('=')[1] : DEV_URL;

async function waitForServer(url, timeoutMs = 30000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            // Retry until timeout.
        }
        await wait(500);
    }
    throw new Error(`Dev server did not become ready within ${timeoutMs}ms`);
}

async function run() {
    let devServer = null;
    if (shouldStartDevServer) {
        const isWindows = process.platform === 'win32';
        const devCommand = isWindows ? 'cmd.exe' : 'npm';
        const devArgs = isWindows
            ? ['/d', '/s', '/c', `npm run dev -- --host ${DEV_HOST} --port ${DEV_PORT}`]
            : ['run', 'dev', '--', '--host', DEV_HOST, '--port', String(DEV_PORT)];

        devServer = spawn(devCommand, devArgs, {
            cwd: process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });

        devServer.stdout.on('data', (chunk) => {
            process.stdout.write(`[dev] ${chunk}`);
        });
        devServer.stderr.on('data', (chunk) => {
            process.stderr.write(`[dev:err] ${chunk}`);
        });
    }

    let browser;
    try {
        await waitForServer(targetServerUrl);

        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        context.setDefaultNavigationTimeout(60000);

        await context.addInitScript(() => {
            localStorage.setItem('__dev_bypass_auth', '1');
        });

        const page = await context.newPage();
        await page.goto(targetServerUrl, { waitUntil: 'domcontentloaded' });

        await page.evaluate(() => {
            window.__gymbroRenderMetrics = {};
        });

        const aggregatedMetrics = {};
        const collectMetrics = async () => {
            const metrics = await page.evaluate(() => window.__gymbroRenderMetrics ?? {});
            for (const [componentName, data] of Object.entries(metrics)) {
                const current = aggregatedMetrics[componentName] ?? { renders: 0, lastUpdatedAt: 0 };
                aggregatedMetrics[componentName] = {
                    renders: current.renders + (data?.renders ?? 0),
                    lastUpdatedAt: Math.max(current.lastUpdatedAt, data?.lastUpdatedAt ?? 0),
                };
            }
            await page.evaluate(() => {
                window.__gymbroRenderMetrics = {};
            });
        };

        const navigateSpa = async (path) => {
            await page.evaluate((nextPath) => {
                window.history.pushState({}, '', nextPath);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }, path);
            await page.waitForTimeout(700);
        };

        await navigateSpa('/');
        await collectMetrics();

        await navigateSpa('/profile');
        await collectMetrics();

        await page.evaluate(() => {
            const store = (window).__gymbroStore;
            if (!store) return;

            const current = store.getState();
            store.setState({
                userId: current.userId ?? 'dev-user',
                perfil: {
                    ...current.perfil,
                    onboardingCompletado: true,
                    usuario: {
                        ...current.perfil.usuario,
                        nombre: current.perfil.usuario?.nombre || 'Dev User',
                    },
                },
            });

            current.startSession(
                'Lunes',
                [
                    {
                        id: 'dev-ex-1',
                        nombre: 'Sentadilla',
                        series: 3,
                        repeticiones: '10',
                        descanso: 60,
                        categoria: 'maquina',
                    },
                ],
                'Rutina Dev'
            );
        });

        await navigateSpa('/train');
        await collectMetrics();

        console.log('\nRender metrics:');
        console.log(JSON.stringify(aggregatedMetrics, null, 2));

        await context.close();
    } finally {
        if (browser) {
            await browser.close();
        }

        if (devServer && !devServer.killed) {
            devServer.kill();
        }
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
