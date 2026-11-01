import { readFile, readdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { validateSignPack } from '../src/signpacks/domain/signPack'

const root = resolve(import.meta.dirname, '..')
const registryPath = resolve(root, 'public/signpacks/index.json')
const contributionDirectory = resolve(root, 'signpacks')
const fixtureDirectory = resolve(root, 'tests/fixtures/signpacks')
const errors: string[] = []

function displayPath(path: string) {
  return relative(root, path)
}

async function readJson(path: string) {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch (reason) {
    errors.push(
      `${displayPath(path)}: ${reason instanceof Error ? reason.message : String(reason)}`,
    )
    return undefined
  }
}

function validateExpected(value: unknown, label: string, expectedValid: boolean) {
  const result = validateSignPack(value)
  if (result.valid === expectedValid) return
  if (expectedValid) {
    errors.push(`${label}: ${result.errors.join(' ')}`)
    return
  }
  errors.push(`${label}: invalid fixture unexpectedly passed validation`)
}

const registry = await readJson(registryPath)
let approvedCount = 0
if (!Array.isArray(registry)) {
  errors.push(`${displayPath(registryPath)}: registry must be an array`)
} else {
  approvedCount = registry.length
  registry.forEach((pack, index) =>
    validateExpected(pack, `${displayPath(registryPath)}[${index}]`, true),
  )
}

const contributionFiles = (await readdir(contributionDirectory)).filter((file) =>
  file.endsWith('.signpack.json'),
)
for (const file of contributionFiles) {
  const path = resolve(contributionDirectory, file)
  const value = await readJson(path)
  if (value !== undefined) validateExpected(value, displayPath(path), true)
}

const fixtureFiles = (await readdir(fixtureDirectory)).filter((file) => file.endsWith('.json'))
const validFixtures = fixtureFiles.filter((file) => file.endsWith('.valid.signpack.json'))
const invalidFixtures = fixtureFiles.filter((file) => file.endsWith('.invalid.signpack.json'))
if (!validFixtures.length || !invalidFixtures.length) {
  errors.push('tests/fixtures/signpacks must contain at least one valid and one invalid fixture')
}
for (const file of fixtureFiles) {
  const path = resolve(fixtureDirectory, file)
  const value = await readJson(path)
  if (value === undefined) continue
  if (file.endsWith('.valid.signpack.json')) validateExpected(value, displayPath(path), true)
  else if (file.endsWith('.invalid.signpack.json'))
    validateExpected(value, displayPath(path), false)
  else errors.push(`${displayPath(path)}: fixture name must declare .valid or .invalid`)
}

if (errors.length) {
  console.error(`Sign Pack validation failed (${errors.length})`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(
  `Sign Pack validation passed: ${approvedCount} approved, ${contributionFiles.length} contribution file(s), ${validFixtures.length} valid fixture(s), ${invalidFixtures.length} invalid fixture(s)`,
)
