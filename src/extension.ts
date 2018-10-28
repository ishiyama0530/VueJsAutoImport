'use strict'

import * as vscode from 'vscode'
import * as voca from 'voca'
import * as path from 'path'
import { importVueFile } from './vueFileImporter'
import { grepAsync } from './lib/grep'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.vuejsAutoImport', async () => {
      const text: string = getText(
        vscode.window.activeTextEditor!.document,
        vscode.window.activeTextEditor!.selection.active
      )
      const rootPath = vscode.workspace.rootPath
        ? path.resolve(
            vscode.workspace.rootPath,
            vscode.workspace
              .getConfiguration()
              .get<string>('vuejsAutoImport.rootDirectory')!
          )
        : ''

      const lowerText = text.toLocaleLowerCase()
      const pathList: string[] = await grepAsync([
        path.join(rootPath, `**/${voca.camelCase(lowerText)}.vue`),
        path.join(rootPath, `**/${voca.kebabCase(lowerText)}.vue`),
        path.join(rootPath, `**/${voca.capitalize(lowerText)}.vue`)
      ])

      const importCore = (fullPath: string) => {
        const activeEditorPath = path.parse(
          vscode.window.activeTextEditor!.document.fileName
        )
        const parsedTargetFilePath = path.parse(fullPath)
        const relativeDir = path.relative(
          activeEditorPath.dir,
          parsedTargetFilePath.dir
        )
        const relativePath = path
          .join(relativeDir, parsedTargetFilePath.base)
          .replace(/\\/g, '/')

        importVueFile(parsedTargetFilePath.name, relativePath)
      }

      if (pathList.length === 1) {
        importCore(pathList[0])
      } else if (pathList.length > 1) {
        vscode.window.showQuickPick(pathList).then(selectedPath => {
          importCore(selectedPath!)
        })
      }
    })
  )
}

function getText(
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  const targetRange = document.getWordRangeAtPosition(
    position,
    /<.+?-?.+?(>| )/
  )
  const targetText = document.getText(targetRange)
  const formatedText = targetText
    .replace('<', '')
    .replace('>', '')
    .replace('/', '')
    .trim()
  return formatedText
}
