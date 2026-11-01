import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const requiredFiles = [
  'README.md',
  'LICENSE',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/CODE_STANDARDS.md',
  'docs/DECISIONS.md',
  'docs/PRIVACY.md',
  'docs/RELEASE.md',
  'docs/VALIDATION.md',
  'schemas/signpack.v1.schema.json',
]
const errors = []

for (const file of requiredFiles) {
  try {
    await access(resolve(root, file))
  } catch {
    errors.push(`missing ${file}`)
  }
}

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
for (const script of ['build', 'lint', 'typecheck', 'test:unit', 'test:e2e', 'verify']) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json is missing the ${script} script`)
}
if (packageJson.private !== true) errors.push('package.json must remain private')

if (errors.length) {
  console.error(`Repository contract failed (${errors.length})`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(
  `Repository contract passed: ${requiredFiles.length} required files and scripts present`,
)
