export function createFeedbackTemplate(date: string): string {
  return `# 学习反馈\n\n日期：${date}\n\n## 1. 原计划是什么？\n\n## 2. 实际发生了什么？\n\n## 3. 哪些地方与预期不一致？\n\n## 4. 我认为原因是什么？\n\n## 5. 哪些内容应该继续保持？\n\n## 6. 哪些地方需要调整？\n\n## 7. 是否需要修改项目书？\n\n- [ ] 不需要\n- [ ] 需要\n\n## 8. 下一步准备怎么做？\n`;
}

export function feedbackRequestsAdjustment(markdown: string): boolean {
  return /-\s*\[[xX]\]\s*需要(?:\s|$)/.test(markdown);
}

