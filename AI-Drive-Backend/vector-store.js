export function buildSearchContext(results) {
  return results
    .flatMap((result) => {
      const sourceName = result.attributes?.original_name || result.filename;
      return result.content
        .filter((item) => item.type === 'text' && item.text.trim())
        .map((item) => `--- Fragmento de ${sourceName} ---\n${item.text}`);
    })
    .join('\n\n');
}
