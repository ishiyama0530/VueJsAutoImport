'use strict'

import * as globby from 'globby'
import * as path from 'path'
import * as vscode from 'vscode'

export function getRootPath(): string {
  return vscode.workspace.rootPath
    ? path.resolve(
        vscode.workspace.rootPath,
        vscode.workspace
          .getConfiguration()
          .get<string>('vuejsPeek.rootDirectory')!
      )
    : ''
}

export async function grepAsync(
  patterns: string | string[],
  option: { absolute: boolean } = {
    absolute: false
  }
): Promise<string[]> {
  const rootPath = getRootPath()
  return globby(patterns, {
    cwd: rootPath,
    case: false,
    followSymlinkedDirectories: false,
    absolute: option.absolute,
    ignore: ['**/node_modules/**']
  })
}

export function grepSync(
  patterns: string | string[],
  option: { absolute: boolean } = {
    absolute: false
  }
): string[] {
  const rootPath = getRootPath()
  return globby.sync(patterns, {
    cwd: rootPath,
    case: false,
    followSymlinkedDirectories: false,
    absolute: option.absolute,
    ignore: ['**/node_modules/**']
  })
}
