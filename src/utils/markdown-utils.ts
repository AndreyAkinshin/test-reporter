export enum Align {
  Left = ':---',
  Center = ':---:',
  Right = '---:',
  None = '---'
}

export const Icon = {
  skip: '⚪', // ':white_circle:'
  success: '✅', // ':white_check_mark:'
  fail: '❌' // ':x:'
}

export function link(title: string, address: string): string {
  return `[${title}](${address})`
}

type ToString = string | number | boolean | Date
export function table(headers: ToString[], align: ToString[], ...rows: ToString[][]): string {
  const headerRow = `|${headers.map(tableEscape).join('|')}|`
  const alignRow = `|${align.join('|')}|`
  const contentRows = rows.map(row => `|${row.map(tableEscape).join('|')}|`).join('\n')
  return [headerRow, alignRow, contentRows].join('\n')
}

export function tableEscape(content: ToString): string {
  return content.toString().replace('|', '\\|')
}

export function fixEol(text?: string): string {
  return text?.replace(/\r/g, '') ?? ''
}

export function ellipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.substr(0, maxLength - 3) + '...'
}

export function formatTime(milliseconds: number): string {
  milliseconds = Math.max(1, Math.round(milliseconds));
  let ms = milliseconds % 1000;
  milliseconds = (milliseconds - ms) / 1000;
  let secs = milliseconds % 60;
  milliseconds = (milliseconds - secs) / 60;
  let mins = milliseconds % 60;
  let hrs = (milliseconds - mins) / 60;

  let result = "";

  if (hrs > 0) {
    result += hrs + "h ";
  }
  if (mins > 0 || result) {
    result += (result ? ("0" + mins).slice(-2) : mins) + "m ";
  }
  if (secs > 0 || result) {
    result += (result ? ("0" + secs).slice(-2) : secs) + "s ";
  }
  if (ms > 0 || result) {
    result += (result ? ("00" + ms).slice(-3) : ms) + "ms";
  }

  return result.trim();
}
