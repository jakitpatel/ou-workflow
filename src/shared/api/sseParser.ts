// SSE fields can span arbitrary UTF-8 chunks and use CR, LF, or CRLF lines.
export function createSSEParser(
  onMessage: (data: string) => void,
  onId: (id: string) => void,
  onRetry: (milliseconds: number) => void,
) {
  let line = ''
  let skipLF = false
  let data: string[] = []
  let event = ''
  function consumeLine() {
    if (line === '') {
      if (data.length && (!event || event === 'message')) onMessage(data.join('\n'))
      data = []
      event = ''
    } else if (!line.startsWith(':')) {
      const colon = line.indexOf(':')
      const field = colon < 0 ? line : line.slice(0, colon)
      let value = colon < 0 ? '' : line.slice(colon + 1)
      if (value.startsWith(' ')) value = value.slice(1)
      if (field === 'data') data.push(value)
      if (field === 'event') event = value
      if (field === 'id' && !value.includes('\0')) onId(value)
      if (field === 'retry' && /^\d+$/.test(value)) onRetry(Number(value))
    }
    line = ''
  }
  return (chunk: string) => {
    for (const character of chunk) {
      if (skipLF && character === '\n') {
        skipLF = false
        continue
      }
      skipLF = false
      if (character === '\r' || character === '\n') {
        consumeLine()
        skipLF = character === '\r'
      } else line += character
    }
  }
}
