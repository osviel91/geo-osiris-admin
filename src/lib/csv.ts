const BOM = "\uFEFF";

export function parseCsvHeaders(text: string): string[] {
  const source = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  return firstRecord(source).map((header) => header.trim());
}

function firstRecord(text: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      break;
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}
