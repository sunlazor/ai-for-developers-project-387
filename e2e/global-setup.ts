import {execSync} from 'node:child_process'
import path from 'node:path'

const backendDir = path.resolve(process.cwd(), 'backend')

export default async function () {
    execSync('php bin/console doctrine:migrations:migrate --no-interaction --env=test', {
        cwd: backendDir,
        stdio: 'pipe',
    })
    execSync('php bin/console doctrine:fixtures:load --no-interaction --env=test', {
        cwd: backendDir,
        stdio: 'pipe',
    })
}
