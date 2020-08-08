'use strict'

import * as vscode from 'vscode'

export function getMatchedRange(
  start: RegExp,
  end: RegExp,
  document: vscode.TextDocument,
): vscode.Range | undefined {
  const text = document.getText()
  const startMatch = start.exec(text)
  const endMatch = end.exec(text)

  if (startMatch && startMatch.index > -1 && endMatch && endMatch.index > -1) {
    const startPosition = document.positionAt(startMatch.index)
    const endPostion = document.positionAt(endMatch.index)

    return new vscode.Range(startPosition, endPostion.with(endPostion.line + 1))
  }
}
