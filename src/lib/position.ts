'use strict'

import * as vscode from 'vscode'

export function getFirstMatchedPostion(
  document: vscode.TextDocument,
  regex: RegExp,
  startPosition: vscode.Position,
  endRegex?: RegExp
): vscode.Position | undefined {
  let result: vscode.Position | undefined = undefined
  let i = 0
  while (!result) {
    let currentLine = startPosition.line + i
    const start = startPosition.with(currentLine)
    const end = startPosition.with(currentLine + 1)
    const range = new vscode.Range(start, end)
    const pickedText = document.getText(range)
    const matchedResult = regex.exec(pickedText)
    if (matchedResult && matchedResult.index > -1) {
      result = start.with(start.line - 1) // for include to regex
    } else {
      if (endRegex) {
        const endMatched = endRegex.exec(pickedText)
        if (endMatched && endMatched.index > -1) {
          break
        }
      }
      if (document.lineCount < i) {
        break
      }
      i++
    }
  }
  return result
}
