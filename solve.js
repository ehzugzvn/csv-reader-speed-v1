// csv-reader-speed v1: a fast drop-in for csv-reader 1.0.0.
// Single pass over the text with charCodeAt, fields extracted with slice instead of
// character-by-character concatenation. The control flow mirrors csv-reader 1.0.0's
// broken-row policy exactly, so the answer is the same for every input.

/**
 * csv-reader 1.0.0's answer for one case's input {text, header}:
 * {columns, rows, errors}.
 */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  // An empty text has no BOM to drop (charCodeAt(0) would be NaN there).
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  // The field just read, shared with the helpers below.
  let fVal = '';
  let fEnd = 0; // 0: comma, 1: line break, 2: end of text
  let fAdded = 0; // characters an unquoted read kept

  // Reads unquoted characters onto `init` up to the next comma or line break: a CR not
  // followed by LF is dropped (stray_cr). Sets fVal, fEnd and fAdded.
  function readUnquoted(init) {
    let val = init;
    let added = 0;
    let start = pos;
    let i = pos;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 44) { // ,
        fVal = val + text.slice(start, i);
        fAdded = added + (i - start);
        pos = i + 1;
        fEnd = 0;
        return;
      }
      if (c === 10) { // LF
        fVal = val + text.slice(start, i);
        fAdded = added + (i - start);
        pos = i + 1;
        line += 1;
        fEnd = 1;
        return;
      }
      if (c === 13) { // CR
        if (i + 1 < n && text.charCodeAt(i + 1) === 10) {
          fVal = val + text.slice(start, i);
          fAdded = added + (i - start);
          pos = i + 2;
          line += 1;
          fEnd = 1;
          return;
        }
        // A stray CR: keep what came before it, drop it, record the error, read on.
        val += text.slice(start, i);
        added += i - start;
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        i += 1;
        start = i;
        continue;
      }
      i += 1;
    }
    fVal = val + text.slice(start, n);
    fAdded = added + (n - start);
    pos = n;
    fEnd = 2;
  }
  // Reads a quoted field whose opening quote is at pos. Sets fVal and fEnd.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let val = '';
    let seg = pos + 1; // start of the current plain segment inside the quotes
    let i = seg;
    let closed = false;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) { // "
        if (i + 1 < n && text.charCodeAt(i + 1) === 34) {
          // A doubled quote is one quote in the value.
          val += text.slice(seg, i) + '"';
          i += 2;
          seg = i;
          continue;
        }
        val += text.slice(seg, i);
        i += 1;
        closed = true;
        break;
      }
      if (c === 13) { // CR inside quotes: CRLF and a lone CR are each one LF
        val += text.slice(seg, i) + '\n';
        line += 1;
        i += i + 1 < n && text.charCodeAt(i + 1) === 10 ? 2 : 1;
        seg = i;
        continue;
      }
      if (c === 10) line += 1;
      i += 1;
    }
    if (!closed) {
      // The quote never closes: it is a literal character, and the text after it is
      // read again as an unquoted field.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      readUnquoted('"');
      return;
    }
    pos = i;
    if (pos >= n) {
      fVal = val;
      fEnd = 2;
      return;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      fVal = val;
      fEnd = 0;
      return;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      fVal = val;
      fEnd = 1;
      return;
    }
    if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      fVal = val;
      fEnd = 1;
      return;
    }
    // What follows the closing quote is appended as it stands, up to the next comma
    // or line break (quote_junk, when anything was appended).
    readUnquoted(val);
    if (fAdded > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted();
      else readUnquoted('');
      fields.push(fVal);
    } while (fEnd === 0);

    // A line that held only stray CRs is left with no characters: no record (its
    // stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
