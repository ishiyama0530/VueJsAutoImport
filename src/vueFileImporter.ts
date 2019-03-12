'use strict'

import * as vscode from 'vscode'

export async function importVueFile(
  fileName: string,
  path: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor!
  const document = vscode.window.activeTextEditor!.document
  const text = document.getText()

  const scriptTagMatch = /<script/.exec(text)
  if (scriptTagMatch && scriptTagMatch.index > -1) {
    await insertImport(editor, fileName, path)
    await insertComponent(editor, fileName)
  }
}

async function insertImport(
  editor: vscode.TextEditor,
  fileName: string,
  path: string
): Promise<void> {
  const document = editor.document
  const text = document.getText()

  const match = /<script/.exec(text)
  if (match && match.index > -1) {
    const scriptTagPosition = document.positionAt(match.index)
    const insertPosition = new vscode.Position(scriptTagPosition.line + 1, 0)
    await editor.edit(edit => {
      edit.insert(
        insertPosition,
        `import ${fileName} from '${path}' ${getEolString(document.eol)}`
      )
    })
  }
}

async function insertComponent(
  editor: vscode.TextEditor,
  componentName: string
): Promise<void> {
  const document = editor.document
  const text = document.getText()
  
  const config = vscode.workspace.getConfiguration()
  const hasNewLine = config.get<boolean>('vuejsAutoImport.insertOneComponentPerLine')
  const indentationCount = config.get<boolean>('vuejsAutoImport.indentation')
  
  const newLine = getEolString(document.eol)
  const indent = ' '.repeat(indentationCount)             // todo: allow switching between tabs and spaces

  const match = /components( )*:( )*{[\s\S]*?(?=})/.exec(text)
  if (match && match.index > -1) {
    const insertIndex = match.index + match[0].length
    const insertPosition = document.positionAt(insertIndex)
    if (match[0].trim().endsWith('{') || match[0].trim().endsWith(',')) {
      // if no registed component (ex) components: {}
      await editor.edit(edit => 
        if (hasNewLine) {
          edit.insert(insertPosition, `${newLine}${indent}${componentName}{$newLine}`
        } else {
          edit.insert(insertPosition, componentName)
        }
      })
    } else {
      await editor.edit(edit => {
        if (hasNewLine) {
          edit.insert(insertPosition, `,${newLine}${indent}${componentName}`)
        } else {
          edit.insert(insertPosition, `,  ${componentName}`)
        }
      })
    }
  }
}

function getEolString(eol: vscode.EndOfLine): string {
  return eol === vscode.EndOfLine.LF ? `\n` : `\r\n`
}
