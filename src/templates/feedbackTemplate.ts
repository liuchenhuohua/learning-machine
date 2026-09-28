export function createFeedbackTemplate(date: string): string {
  return `# 学习反馈\n\n日期：${date}\n\n## 实际发生了什么\n\n## 哪些判断发生了变化\n\n## 哪些内容值得保持\n\n## 下一步想改变什么\n`;
}

export function appendFeedbackTemplate(content: string, date: string): string {
  const template = createFeedbackTemplate(date);
  return content.trimEnd() ? `${content.trimEnd()}\n\n${template}` : template;
}

export function feedbackRequestsAdjustment(markdown: string): boolean {
  return /-\s*\[[xX]\]\s*需要(?:\s|$)/.test(markdown);
}
