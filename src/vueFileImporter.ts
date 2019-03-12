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
  const hasTrailingComma = config.get<boolean>('vuejsAutoImport.hasTrailingComma')
  const indentationCount = config.get<number>('vuejsAutoImport.indentation') || 4
  
  const newLine = getEolString(document.eol)
  const indent = ' '.repeat(indentationCount)             // todo: allow switching between tabs and spaces

  const match = /components( )*:( )*{[\s\S]*?(?=})/.exec(text)
  
  if (match && match.index > -1) {
    const insertIndex = match.index + match[0].length
    const insertPosition = document.positionAt(insertIndex)

    // compute the string we're insterting
    let componentString = '';

    if (match[0].trim().endsWith('{') ) {
      // if no registed component (ex) components: {}
      if (hasNewLine) {
        componentString = `${newLine}${indent}${componentName}${hasTrailingComma ? ',':''}${newLine}`
      } else {
        componentString = `${componentName}${hasTrailingComma?', ':''}`
      }
    } else {
      // Detect if there's a trailing comma. We only add  a comma if we don't detect
      // a trailing comma.
      const trailingCommaPresent = match[0].trim().endsWith(',');

      if (hasNewLine) {
        componentString = `${trailingCommaPresent?'':','}${newLine}${indent}${componentName}${hasTrailingComma ? ',':''}`
      } else {
        componentString = `${trailingCommaPresent?'':', '}${componentName}${hasTrailingComma ? ', ':''}`
      }
    }

    await editor.edit(edit => {
      edit.insert(insertPosition, componentString);
    });

  }
}

function getEolString(eol: vscode.EndOfLine): string {
  return eol === vscode.EndOfLine.LF ? `\n` : `\r\n`
}
