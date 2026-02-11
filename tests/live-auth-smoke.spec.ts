import { expect, test } from '@playwright/test';

const email = process.env.GYMBRO_EMAIL;
const password = process.env.GYMBRO_PASSWORD;
const baseUrl = process.env.GYMBRO_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Live auth smoke', () => {
    test.skip(!email || !password, 'GYMBRO_EMAIL and GYMBRO_PASSWORD are required.');

    test('login and core routes load without runtime errors', async ({ page }) => {
        test.setTimeout(120000);
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        const notFoundUrls = new Set<string>();

        page.on('console', (message) => {
            if (message.type() === 'error') {
                consoleErrors.push(message.text());
            }
        });

        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });

        page.on('response', (response) => {
            if (response.status() === 404) {
                const url = response.url();
                if (url.startsWith(baseUrl)) {
                    notFoundUrls.add(url);
                }
            }
        });

        await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
        await page.getByPlaceholder('Ej: TitanFit o usuario@email.com').fill(email as string);
        await page.getByPlaceholder('******').fill(password as string);
        await page.getByRole('button', { name: 'Entrar' }).click();

        await expect
            .poll(() => page.url().includes('/login'), { timeout: 45000 })
            .toBeFalsy();

        if (!page.url().includes('/onboarding')) {
            const routesToSmoke = ['/', '/train', '/progress', '/profile', '/routine', '/catalog', '/coach'];
            const mojibakeMarkers = ['�', 'Ã', 'Â', 'ï¿', 'ðŸ', 'â'];
            for (const route of routesToSmoke) {
                const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
                if (response) {
                    expect(response.ok(), `Route failed: ${route}`).toBeTruthy();
                }
                await expect(page.locator('body')).toBeVisible();
                const mainText = await page.locator('main').first().innerText().catch(() => '');
                if (mainText) {
                    const marker = mojibakeMarkers.find((candidate) => mainText.includes(candidate));
                    if (marker) {
                        const index = mainText.indexOf(marker);
                        const start = Math.max(0, index - 40);
                        const end = Math.min(mainText.length, index + 40);
                        const snippet = mainText.slice(start, end);
                        expect(
                            marker,
                            `Potential mojibake detected on route ${route}. Marker: ${marker}. Snippet: ${snippet}`
                        ).toBe('');
                    }
                }
                await page.waitForTimeout(700);
            }
        }

        const ignoredConsolePatterns = [
            /favicon/i,
            /ResizeObserver loop limit exceeded/i,
            /ERR_BLOCKED_BY_CLIENT/i,
            /Failed to load resource: the server responded with a status of 404/i,
        ];

        const blockingConsoleErrors = consoleErrors.filter(
            (line) => !ignoredConsolePatterns.some((pattern) => pattern.test(line))
        );

        expect(pageErrors, `Unexpected runtime page errors:\n${pageErrors.join('\n')}`).toEqual([]);
        expect(
            Array.from(notFoundUrls),
            `Unexpected 404 resources:\n${Array.from(notFoundUrls).join('\n')}`
        ).toEqual([]);
        expect(
            blockingConsoleErrors,
            `Unexpected console errors:\n${blockingConsoleErrors.join('\n')}`
        ).toEqual([]);
    });
});
