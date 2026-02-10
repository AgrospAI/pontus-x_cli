export function extractJson(output: string) {
  // find the first `{` and last `}` to extract JSON
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`No JSON found in output:\n${output}`);
  }

  return JSON.parse(output.slice(start, end + 1));
}
