// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Guards the server → client boundary, which jsdom component tests cannot see.
 *
 * In the RSC graph every export of a `'use client'` module is a client
 * reference, not a value: a server module may render a component from it, but
 * an array, object, string or function it uses on the server is a reference
 * object there (`creatorPageTabs.find is not a function` on `/creators/:id`,
 * 2026-11-22). This walks the server graph from every non-client file under
 * `src/app` through non-client modules, and fails when a server module imports
 * or re-exports anything but a component (PascalCase), a default export or a
 * type from a client module. Move such values to a module without the
 * directive and import it from both sides.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const EXTENSIONS = ['.ts', '.tsx']

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)
      ? [path]
      : []
  })
}

const parsed = new Map<string, ts.SourceFile>()
function parse(file: string): ts.SourceFile {
  let source = parsed.get(file)
  if (!source) {
    source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      false,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )
    parsed.set(file, source)
  }
  return source
}

/** Whether the module's directive prologue holds `'use client'`. */
function isClientModule(file: string): boolean {
  for (const statement of parse(file).statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      return false
    if (statement.expression.text === 'use client') return true
  }
  return false
}

/** Resolves `@/…` and relative specifiers to a source file; packages → null. */
function resolveImport(from: string, specifier: string): string | null {
  let base: string
  if (specifier.startsWith('@/')) base = join(SRC, specifier.slice(2))
  else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier)
  else return null
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => join(base, 'index' + ext)),
  ]
  return (
    candidates.find((path) => existsSync(path) && statSync(path).isFile()) ??
    null
  )
}

/** A component reference is safe to pass across: PascalCase, not CONSTANT. */
const isComponentName = (name: string) => /^[A-Z](?=.*[a-z])/.test(name)

type Edge = { target: string; values: string[] }

/** The value names a module imports or re-exports from each local module. */
function edges(file: string): Edge[] {
  const result: Edge[] = []
  for (const statement of parse(file).statements) {
    if (
      (!ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue
    const target = resolveImport(file, statement.moduleSpecifier.text)
    if (!target) continue
    const values: string[] = []
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      if (clause && !clause.isTypeOnly) {
        const bindings = clause.namedBindings
        if (bindings && ts.isNamespaceImport(bindings)) values.push('* as')
        if (bindings && ts.isNamedImports(bindings))
          for (const element of bindings.elements)
            if (!element.isTypeOnly)
              values.push((element.propertyName ?? element.name).text)
      }
    } else if (!statement.isTypeOnly) {
      const clause = statement.exportClause
      if (!clause) values.push('*')
      else if (ts.isNamespaceExport(clause)) values.push('* as')
      else
        for (const element of clause.elements)
          if (!element.isTypeOnly)
            values.push((element.propertyName ?? element.name).text)
    }
    result.push({ target, values })
  }
  return result
}

function findViolations(): string[] {
  const queue = walk(join(SRC, 'app')).filter((file) => !isClientModule(file))
  const seen = new Set(queue)
  const violations: string[] = []
  while (queue.length > 0) {
    const file = queue.shift() as string
    for (const { target, values } of edges(file)) {
      if (isClientModule(target)) {
        for (const name of values)
          if (name !== 'default' && !isComponentName(name))
            violations.push(
              `${relative(ROOT, file)} imports \`${name}\` from client module ${relative(ROOT, target)}`
            )
      } else if (!seen.has(target)) {
        seen.add(target)
        queue.push(target)
      }
    }
  }
  return violations
}

describe('server → client module boundary', () => {
  it('server modules take only components and types from client modules', () => {
    expect(findViolations()).toEqual([])
  })

  it('detects the directive and component names it relies on', () => {
    expect(
      isClientModule(
        join(SRC, 'features/creator-page/components/creator-tabs.tsx')
      )
    ).toBe(true)
    expect(isClientModule(join(SRC, 'features/creator-page/lib/tabs.ts'))).toBe(
      false
    )
    expect(isComponentName('CreatorTabs')).toBe(true)
    expect(isComponentName('CREATOR_TABS_ID')).toBe(false)
    expect(isComponentName('creatorPageTabs')).toBe(false)
  })
})
