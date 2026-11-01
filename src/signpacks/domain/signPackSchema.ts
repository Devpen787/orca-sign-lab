import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import signPackSchema from '../../../schemas/signpack.v1.schema.json'

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validate = ajv.compile(signPackSchema)

function displayPath(instancePath: string) {
  return instancePath ? instancePath.replace(/^\//, '').replaceAll('/', '.') : 'Sign Pack'
}

export function validateSignPackSchema(value: unknown) {
  if (validate(value)) return []
  const messages = (validate.errors ?? []).map((error) => {
    const path = displayPath(error.instancePath)
    if (path.startsWith('referenceUrls')) {
      return 'referenceUrls must contain 1–10 HTTPS URLs.'
    }
    if (path.startsWith('sourcePhrases')) {
      return 'sourcePhrases must contain 1–20 unique, non-empty phrases.'
    }
    if (error.keyword === 'additionalProperties') {
      return `${path} contains an unsupported property.`
    }
    return `${path} ${error.message ?? 'is invalid'}.`
  })
  return [...new Set(messages)]
}
