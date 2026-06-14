import {defineConfig} from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    retries: 0,
    globalSetup: './e2e/global-setup.ts',
    webServer: [
        {
            command: 'APP_ENV=test php -S localhost:9000 -t public/',
            cwd: './backend',
            port: 9000,
            reuseExistingServer: true,
        },
        {
            command: 'VITE_API_TARGET=http://localhost:9000 npm run dev',
            port: 3000,
            reuseExistingServer: true,
        },
    ],
    use: {
        baseURL: 'http://localhost:3000',
    },
})
