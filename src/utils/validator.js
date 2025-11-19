export const isString = (value) => {
  return typeof value === 'string' || value instanceof String
}

export const normalizeString = (value, defaultValue = '') => {
  if (isString(value)) return value
  if (value === null || value === undefined) return defaultValue
  return String(value)
}

export const normalizeCodeData = (codeData) => {
  return {
    lang: normalizeString(codeData.lang, 'cpp'),
    std: normalizeString(codeData.std, 'c++17'),
    content: normalizeString(codeData.content, '')
  }
}