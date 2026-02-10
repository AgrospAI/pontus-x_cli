import fs from "node:fs";
import YAML from "yaml";

function getPathSegments(key: string): string[] {
  return key.split(".").filter(Boolean);
}

export function setKeyInYaml(
  filePath: string,
  key: string = "metadata.did",
  value: unknown,
): void {
  const source = fs.readFileSync(filePath, "utf8");
  const doc = YAML.parseDocument(source);

  const segments = getPathSegments(key);

  let current: any = doc;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    let next = current.get?.(segment, true);

    if (isLast) {
      // Create or update (UPSERT)
      current.set(segment, value);
      break;
    }

    if (!next || !YAML.isMap(next)) {
      next = doc.createNode({});
      current.set(segment, next);
    }

    current = next;
  }

  fs.writeFileSync(filePath, doc.toString());
}

export function deleteKeyFromYaml(
  filePath: string,
  key: string = "metadata.did",
): void {
  const source = fs.readFileSync(filePath, "utf8");
  const doc = YAML.parseDocument(source);

  const segments = getPathSegments(key);

  let current: any = doc;

  for (let i = 0; i < segments.length - 1; i++) {
    current = current.get?.(segments[i], true);

    if (!current || !YAML.isMap(current)) {
      // Path does not exist → nothing to delete
      return;
    }
  }

  const lastSegment = segments.at(-1);
  current.delete?.(lastSegment);

  fs.writeFileSync(filePath, doc.toString());
}
