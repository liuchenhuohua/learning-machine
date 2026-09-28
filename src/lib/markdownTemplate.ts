export function appendMarkdownTemplate(content: string, template: string): string {
  const existing = content.trimEnd();
  const inserted = template.trim();
  if (!inserted) return content;
  return existing ? `${existing}\n\n${inserted}\n` : `${inserted}\n`;
}
