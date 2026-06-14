import {test, expect} from '@playwright/test'
import {execSync} from 'node:child_process'
import path from 'node:path'

const backendDir = path.resolve(process.cwd(), 'backend')

function reseedDb() {
    execSync('php bin/console doctrine:migrations:migrate --no-interaction --env=test', {
        cwd: backendDir,
        stdio: 'pipe',
    })
    execSync('php bin/console doctrine:fixtures:load --no-interaction --env=test', {
        cwd: backendDir,
        stdio: 'pipe',
    })
}

test.describe('Visitor booking flow', () => {
    test.beforeEach(() => reseedDb())

    test('visitor books a slot and host sees it in dashboard', async ({page}) => {
        // Compute the first available slot: tomorrow at 09:00 AM UTC
        const slotDate = new Date()
        slotDate.setUTCDate(slotDate.getUTCDate() + 1)
        slotDate.setUTCHours(9, 0, 0, 0)
        const slotTime = slotDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
        })

        // ── Visitor flow ──

        await page.goto('/')
        await expect(page.getByRole('heading', {name: /book time/i})).toBeVisible()

        await page.getByRole('button', {name: /book now/i}).click()
        await expect(page).toHaveURL('/book')

        await expect(page.getByText('Loading...')).not.toBeVisible({timeout: 15000})

        // Select first booking type
        await page.locator('button:has-text("Select")').first().click()

        // Select the slot we know exists (tomorrow 09:00 AM)
        await page.getByRole('button', {name: new RegExp(slotTime)}).first().click()

        // Fill visitor details
        await page.getByLabel('Name').fill('Test Visitor')
        await page.getByLabel('Email').fill('test@example.com')

        // Submit
        await page.getByRole('button', {name: /confirm booking/i}).click()

        await expect(page.getByText('Booked!', {exact: true})).toBeVisible({timeout: 10000})
        await expect(page).toHaveURL('/')

        // ── Host flow ──

        await page.goto('/host')
        await expect(page.getByRole('heading', {name: /host dashboard/i})).toBeVisible()

        await page.getByPlaceholder('Host token').fill('calendai-host-secret')
        await page.getByRole('button', {name: /login/i}).click()

        // Verify booking appears in the Bookings tab
        await expect(page.getByRole('tab', {name: /bookings/i})).toBeVisible()
        await expect(page.getByText('Test Visitor')).toBeVisible({timeout: 10000})
        await expect(page.getByText('test@example.com')).toBeVisible()
    })
})
