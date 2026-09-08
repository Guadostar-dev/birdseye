export function isHtmlWriteup(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function writeupToHtml(writeup: string): string {
  const value = writeup ?? "";
  if (!value.trim()) return "";
  if (isHtmlWriteup(value)) return value;
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function writeupPlainText(writeup: string): string {
  return (writeup || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
