import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// fe7: every API write must prove it happened. A `fetchWithAuth` call that writes (non-GET, or one of the
// GET routes that create/delete applications) needs `expectBody`, or an entry below saying how its caller
// validates the answer. A new write without either fails here, so an empty 2xx can't pass as "saved" again.
const SRC = resolve(__dirname, '../..')

const MUTATING_GET = /\/(createApplication|deleteApplication|createSubmissionApplication|deleteSubmissionApplication)\b/

/** `file` + a snippet of the call -> why it needs no `expectBody`. */
const VALIDATED_BY_CALLER: Array<{ file: string; snippet: string; reason: string }> = [
  { file: 'features/tasks/api/index.ts', snippet: "'/assignRole'", reason: 'readAssignRoleConfirmation (fe4a)' },
  { file: 'features/tasks/api/index.ts', snippet: "'/complete_task'", reason: 'readCompleteTaskConfirmation (fe6a)' },
  { file: 'features/tasks/api/index.ts', snippet: "'/undoTask'", reason: 'readCompleteTaskConfirmation (fe6a)' },
  { file: 'features/tasks/api/index.ts', snippet: '/api/TaskInstance/', reason: 'readWrittenRecord (fe6a), own messages' },
  { file: 'features/tasks/api/index.ts', snippet: "'/api/WFApplicationMessage'", reason: 'createTaskNote requires the created id (fe6a)' },
  { file: 'features/tasks/api/index.ts', snippet: '/api/WFApplicationMessage/', reason: 'readWrittenRecord (fe6a)' },
  { file: 'features/applications/api/assignApplicationRc.ts', snippet: "'/assignRole'", reason: 'readAssignRoleConfirmation' },
  { file: 'features/applications/api/index.ts', snippet: "'/generateInvoice'", reason: 'requires an invoice id' },
  { file: 'features/applications/api/index.ts', snippet: "'/generatePackage'", reason: 'requires a package PDF URL' },
  { file: 'features/applications/api/index.ts', snippet: "'/api/ScheduleIngredient'", reason: 'Add Row: readWrittenRecord in useScheduleAIngredients (fe6a)' },
  { file: 'features/applications/api/index.ts', snippet: "'/api/ScheduleProduct'", reason: 'Add Row: readWrittenRecord in useScheduleBProducts (fe6a)' },
  { file: 'features/prelim/api/index.ts', snippet: "'/resolve_company'", reason: 'PrelimResolutionDrawer requires the confirmed company_id' },
  { file: 'features/prelim/api/index.ts', snippet: "'/resolve_plant'", reason: 'PrelimResolutionDrawer requires the confirmed plant_id' },
  { file: 'features/profile/api/index.ts', snippet: "'/auth/exchange-cognito-token'", reason: 'read (token exchange), not a write' },
]

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : []
  })

/** The `{...}` options object passed to each `fetchWithAuth(` / `fetchWithAuth<T>(` call. */
const fetchCalls = (source: string): string[] => {
  const calls: string[] = []
  const pattern = /fetchWithAuth(?:<[^(]*?>)?\(\s*\{/g
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    let depth = 0
    const start = match.index + match[0].length - 1
    for (let i = start; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}' && (depth -= 1) === 0) {
        calls.push(source.slice(start, i + 1))
        break
      }
    }
  }
  return calls
}

const writes = sourceFiles(SRC).flatMap((path) => {
  // Exemptions use '/': normalise Windows separators so the inventory matches on every OS.
  const file = relative(SRC, path).split('\\').join('/')
  return fetchCalls(readFileSync(path, 'utf8'))
    .filter((call) => /method:\s*['"](POST|PATCH|PUT|DELETE)['"]/.test(call) || MUTATING_GET.test(call))
    .map((call) => ({ file, call }))
})

describe('API write inventory', () => {
  it('finds the writes', () => {
    expect(writes.length).toBeGreaterThan(30)
  })

  it('every write checks its success body', () => {
    const unchecked = writes
      .filter(({ call }) => !/\bexpectBody\b/.test(call))
      .filter(({ file, call }) => !VALIDATED_BY_CALLER.some((entry) => entry.file === file && call.includes(entry.snippet)))
      .map(({ file, call }) => `${file}: ${call.replace(/\s+/g, ' ').slice(0, 120)}`)
    expect(unchecked).toEqual([])
  })

  it('has no stale exemptions', () => {
    const stale = VALIDATED_BY_CALLER.filter(
      (entry) => !writes.some(({ file, call }) => file === entry.file && call.includes(entry.snippet) && !/\bexpectBody\b/.test(call)),
    )
    expect(stale).toEqual([])
  })

  it('raw upload requests read their body through readSuccessBody', () => {
    const source = readFileSync(join(SRC, 'features/applications/api/index.ts'), 'utf8')
    for (const route of ['/upload_files', '/ingredient_file_upload']) {
      expect(source).toMatch(new RegExp(`readSuccessBody\\(response, \\{\\s*method: 'POST',\\s*path: '${route}',\\s*expectBody:`))
    }
  })
})
