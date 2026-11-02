import { describe, expect, it } from 'vitest'
import { parsePythonLiteral, parseStatusDetailsValue } from './pythonLiteral'

describe('parsePythonLiteral', () => {
  it('reads the repr the API stored for a Schedule A savedState, including quotes in keys and notes', () => {
    const repr = `{'savedState': {'flags': {'application-15-1-Ingredient <b>x</b> \\' " ;--': {'flagged': True, 'note': "supplier's LOC"}}, 'rounds': [], 'scheduleAReady': False, 'username': None, 'n': -1.5}}`
    expect(parsePythonLiteral(repr)).toEqual({
      savedState: {
        flags: { 'application-15-1-Ingredient <b>x</b> \' " ;--': { flagged: true, note: "supplier's LOC" } },
        rounds: [],
        scheduleAReady: false,
        username: null,
        n: -1.5,
      },
    })
  })

  it('decodes escapes and rejects malformed input', () => {
    expect(parsePythonLiteral(`{'a': 'line\\nnext \\u00e9', 'b': (1, 2)}`)).toEqual({ a: 'line\nnext é', b: [1, 2] })
    expect(parsePythonLiteral(`{'a': }`)).toBeUndefined()
    expect(parsePythonLiteral(`{'a': 1} trailing`)).toBeUndefined()
  })
})

describe('parseStatusDetailsValue', () => {
  it('accepts objects, JSON and Python reprs', () => {
    expect(parseStatusDetailsValue({ a: 1 })).toEqual({ a: 1 })
    expect(parseStatusDetailsValue('{"a": true}')).toEqual({ a: true })
    expect(parseStatusDetailsValue("{'a': True}")).toEqual({ a: true })
    expect(parseStatusDetailsValue('  ')).toBeUndefined()
  })
})
