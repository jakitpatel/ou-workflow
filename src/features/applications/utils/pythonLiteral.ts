// Strict reader for Python literal reprs (e.g. "{'a': True, 'b': [1, None]}").
// The API used to store objects sent to text columns with str(), so older StatusDetails rows
// are Python reprs; quote-swapping breaks as soon as a value contains ' or ".
export function parsePythonLiteral(text: string): unknown | undefined {
  let index = 0

  const fail = (): never => {
    throw new SyntaxError(`Invalid Python literal at ${index}`)
  }
  const skipWhitespace = () => {
    while (index < text.length && /\s/.test(text[index])) index += 1
  }
  const expect = (char: string) => {
    skipWhitespace()
    if (text[index] !== char) fail()
    index += 1
  }

  const ESCAPES: Record<string, string> = {
    n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '\\': '\\', "'": "'", '"': '"', '0': '\0',
  }

  const parseString = (): string => {
    const quote = text[index]
    index += 1
    let result = ''
    while (index < text.length && text[index] !== quote) {
      const char = text[index]
      if (char !== '\\') {
        result += char
        index += 1
        continue
      }
      const next = text[index + 1]
      if (next === 'x' || next === 'u' || next === 'U') {
        const length = next === 'x' ? 2 : next === 'u' ? 4 : 8
        const hex = text.slice(index + 2, index + 2 + length)
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== length) fail()
        result += String.fromCodePoint(parseInt(hex, 16))
        index += 2 + length
        continue
      }
      result += next in ESCAPES ? ESCAPES[next] : `\\${next}`
      index += 2
    }
    if (text[index] !== quote) fail()
    index += 1
    return result
  }

  const parseSequence = (close: string): unknown[] => {
    index += 1
    const items: unknown[] = []
    skipWhitespace()
    while (text[index] !== close) {
      items.push(parseValue())
      skipWhitespace()
      if (text[index] === ',') {
        index += 1
        skipWhitespace()
      } else if (text[index] !== close) {
        fail()
      }
    }
    index += 1
    return items
  }

  const parseDict = (): Record<string, unknown> => {
    index += 1
    const result: Record<string, unknown> = {}
    skipWhitespace()
    while (text[index] !== '}') {
      const key = parseValue()
      expect(':')
      result[String(key)] = parseValue()
      skipWhitespace()
      if (text[index] === ',') {
        index += 1
        skipWhitespace()
      } else if (text[index] !== '}') {
        fail()
      }
    }
    index += 1
    return result
  }

  function parseValue(): unknown {
    skipWhitespace()
    const char = text[index]
    if (char === '{') return parseDict()
    if (char === '[') return parseSequence(']')
    if (char === '(') return parseSequence(')')
    if (char === "'" || char === '"') return parseString()
    for (const [word, value] of [['True', true], ['False', false], ['None', null]] as const) {
      if (text.startsWith(word, index)) {
        index += word.length
        return value
      }
    }
    const number = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(index))
    if (number) {
      index += number[0].length
      return Number(number[0])
    }
    return fail()
  }

  try {
    const value = parseValue()
    skipWhitespace()
    return index === text.length ? value : undefined
  } catch {
    return undefined
  }
}

// Parses a StatusDetails value that may be an object, a JSON string or a Python repr string.
export function parseStatusDetailsValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return parsePythonLiteral(text)
  }
}
