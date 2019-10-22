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
  const hasFileExtension = !config.get<boolean>(
    'vuejsAutoImport.hideFileExtension'
  )
  const forcePascalCase = config.get<boolean>(
    'vuejsAutoImport.forcePascalCase'
  )

  // rookie-proofing for people who don't follow the convention and name their components
  // using snake_case or kebab-case
  if (forcePascalCase) {
    fileName = toPascalCase(fileName)
  }
  // remove .vue extension if user doesn't want it
  if (!hasFileExtension) {
    // normally, a simple path.split('.vue')[0] should do it, but we're user-proofing it
    // for people who don't follow conventions. path.split('.vue') would return incorrect
    // results if someone had a component inside a folder with a name like this:
    //
    //         /src/components/example.vue/ActualComponent.vue
    //
    // path.split('.vue') would return: '/src/components/example'
    //
    // and that wouldn't be cool. Instead, we split the array with '.vue', remove the
    // last element of the array (but only if it's an empty string, which it should be
    // if user didn't mess something up). If the last array element is not an empty
    // string, then user messed something up. No need for us to make an even bigger
    // mess.
    //
    // Though to be fair, I absolutely agree that even this implementation is too 
    // paranoid.
    const tempArray = path.split('.vue')
    if (tempArray[tempArray.length - 1] === '') {
      tempArray.pop();
    }
    path = tempArray.join('.vue');
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
  const forcePascalCase = config.get<boolean>(
    'vuejsAutoImport.forcePascalCase'
  )
  const indentScriptTag = config.get<boolean>(
    'vuejsAutoImport.indentScriptTag'
  )
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

      // this is needed in order to avoid pointless newlines 
      if (hasNewLine) {
        componentString = `${newLine}${indent}${componentName}${hasTrailingComma ? ',' : ''}`
        if (!endsWithEmptyNewline(match[0])) {
          componentString += `${newLine}`
        }
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
    const syntax = await vscode.window.showQuickPick([
      { label: 'JavaScript', detail: 'use default script tag.', id: 'js' },
      { label: 'TypeScript', detail: 'use lang="ts" script tag.', id: 'ts' },
      {
        label: 'TypeScript / class-style component syntax',
        detail: 'use @Component decolater.',
        id: 'tsclass'
      }
    ])

    // let's handle the case where components{} property is missing on the component
    let match2: RegExpExecArray | null = null
    if (syntax!.id === 'js') {
      match2 = /export[\s]*default[\s]*\{/.exec(text)
    } else if (syntax!.id === 'ts') {
      match2 = /export[\s]*default.+\.extend[\s]*\(\{/.exec(text)
    } else if (syntax!.id === 'tsclass') {
      match2 = /\@Component/.exec(text)
    }

    if (match2 && match2.index > -1) {
      let insertIndex = match2.index + match2[0].length

      const propIndent = indentBase.repeat(indentScriptTag ? 2 : 1)
      const trailingComma = hasTrailingComma ? ',' : ''
      let componentString = ''

      if (hasNewLine) {
        componentString = `${newLine}${propIndent}components: {${newLine}${indent}${componentName}${trailingComma}${newLine}${propIndent}}${trailingComma}${newLine}`
      } else {
        componentString = `${newLine}${propIndent}components: { ${componentName}${trailingComma} }${trailingComma}${newLine}`
      }

      const position = document.positionAt(insertIndex)

      if (syntax!.id === 'tsclass') {
        componentString = `@Component({${componentString}})`
        await editor.edit(edit => {
          const line = new vscode.Range(position.line, 0, position.line, 500)
          edit.delete(line)
        })
      }

      await editor.edit(edit => {
        edit.insert(position, componentString)
      })
    } else {
      vscode.window.showWarningMessage('')
    }
  }
}

function endsWithEmptyNewline(string: string): boolean {
  return new RegExp(/\n[^S\r\n]*$/).test(string);
}

function toPascalCase(string: string): string {
  string = string.charAt(0).toUpperCase() + string.slice(1)
  return string.replace(/[-_]([a-z])/g, (g: string) => g[1].toUpperCase())
}

function getEolString(eol: vscode.EndOfLine): string {
  return eol === vscode.EndOfLine.LF ? `\n` : `\r\n`
}
