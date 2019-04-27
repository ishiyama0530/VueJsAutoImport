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

  const config = vscode.workspace.getConfiguration()
  const importWithSemicolon = config.get<boolean>(
    'vuejsAutoImport.importWithSemicolon'
  )
  const forcePascalCase = config.get<boolean>('vuejsAutoImport.forcePascalCase')

  // rookie-proofing for people who don't follow the convention and name their components
  // using snake_case or kebab-case
  if (forcePascalCase) {
    fileName = toPascalCase(fileName)
  }

  const match = /<script/.exec(text)
  if (match && match.index > -1) {
    const scriptTagPosition = document.positionAt(match.index)
    const insertPosition = new vscode.Position(scriptTagPosition.line + 1, 0)
    await editor.edit(edit => {
      edit.insert(
        insertPosition,
        `import ${fileName} from '${path}'${
          importWithSemicolon ? ';' : ''
        }${getEolString(document.eol)}`
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
  const hasNewLine = config.get<boolean>(
    'vuejsAutoImport.insertOneComponentPerLine'
  )
  const hasTrailingComma = config.get<boolean>(
    'vuejsAutoImport.hasTrailingComma'
  )
  const forcePascalCase = config.get<boolean>('vuejsAutoImport.forcePascalCase')

  const indentScriptTag = config.get<boolean>('vuejsAutoImport.indentScriptTag')
  const indentBase = editor.options.insertSpaces
    ? ' '.repeat(editor.options.tabSize as number)
    : '\t'
  const indent = indentBase.repeat(indentScriptTag ? 3 : 2)

  const newLine = getEolString(document.eol)

  const match = /components( )*:( )*{[\s\S]*?(?=})/.exec(text)

  // rookie-proofing for people who don't follow the convention and name their components
  // using snake_case or kebab-case
  if (forcePascalCase) {
    componentName = toPascalCase(componentName)
  }

  if (match && match.index > -1) {
    // insertIndex — place in document where our line gets inserted
    // matchInsertIndex — place of insertIndex relative to the match
    let matchInsertIndex = match[0].length - 1

    // We don't match by lastIndexOf(',') even if hasTrailingComma is set to true,
    // in case someone accidentally removed a trailing comma at some point in time.
    // we would get wrong results. We could detect whether trailing comma is present
    // like we do later down the line, but that would waste even more resources

    // prettier-ignore
    do {
      if (/[\S]/.test(match[0].charAt(matchInsertIndex))) {
        // if character is not a whitespace, we found the correct place to insert
        // fix the insert index and exit the loop
        matchInsertIndex++
        break
      }
    } while (matchInsertIndex --> 0)

    // we can't simply do `match.index + match[0].length`, because it screws up the 'one component per line' usecase
    const insertIndex = match.index + matchInsertIndex
    const insertPosition = document.positionAt(insertIndex)

    // compute the string we're insterting
    let componentString = ''

    if (match[0].trim().endsWith('{')) {
      // if no registed component (ex) components: {}
      if (hasNewLine) {
        componentString = `${newLine}${indent}${componentName}${
          hasTrailingComma ? ',' : ''
        }${newLine}`
      } else {
        componentString = ` ${componentName}${hasTrailingComma ? ', ' : ''}`
      }
    } else {
      // Detect if there's a trailing comma. We only add  a comma if we don't detect
      // a trailing comma.
      const trailingCommaPresent = match[0].trim().endsWith(',')

      if (hasNewLine) {
        componentString = `${
          trailingCommaPresent ? '' : ','
        }${newLine}${indent}${componentName}${hasTrailingComma ? ',' : ''}`
      } else {
        componentString = `${
          trailingCommaPresent ? ' ' : ', '
        }${componentName}${hasTrailingComma ? ',' : ''}`
      }
    }

    await editor.edit(edit => {
      edit.insert(insertPosition, componentString)
    })
  } else {
    // let's handle the case where components{} property is missing on the component
    const match2 = /export[\s]*default[\s]*\{/.exec(text)
    if (match2 && match2.index > -1) {
      const insertIndex = match2.index + match2[0].length

      const propIndent = indentBase.repeat(indentScriptTag ? 2 : 1)
      let componentString = ''

      if (hasNewLine) {
        componentString = `${newLine}${propIndent}components: {${newLine}${indent}${componentName}${
          hasTrailingComma ? ',' : ''
        }${newLine}${propIndent}},`
      } else {
        componentString = `${newLine}${propIndent}components: { ${componentName}${
          hasTrailingComma ? ',' : ''
        } },`
      }

      const position = document.positionAt(insertIndex)
      await editor.edit(edit => {
        edit.insert(position, componentString)
      })
    }
  }
}

function toPascalCase(string: string): string {
  string = string.charAt(0).toUpperCase() + string.slice(1)
  return string.replace(/[-_]([a-z])/g, (g: string) => g[1].toUpperCase())
}

function getEolString(eol: vscode.EndOfLine): string {
  return eol === vscode.EndOfLine.LF ? `\n` : `\r\n`
}
