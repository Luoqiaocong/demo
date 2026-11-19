/**
 * 把任意文本整理成 URL 友好的 slug。
 *
 * @example
 * slugify("Hello World")        // => "hello-world"
 * slugify("  前端/工程 笔记  ")   // => "前端工程-笔记"
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 统计文本里的单词数量。中文按“每个汉字算一个词”处理。
 *
 * @example
 * wordCount("hello world")  // => 2
 * wordCount("你好 world")    // => 3
 */
export function wordCount(input: string): number {
  const latinWords = input.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) ?? [];
  const cjkChars = input.match(/[\u4e00-\u9fff]/g) ?? [];
  return latinWords.length + cjkChars.length;
}

/**
 * 把文本截断到指定长度，超长时补省略号（省略号计入总长度）。
 *
 * @example
 * truncate("abcdef", 4)        // => "abc…"
 * truncate("abc", 4)           // => "abc"
 */
export function truncate(input: string, maxLength: number, ellipsis = "…"): string {
  if (maxLength < 0) {
    throw new RangeError("maxLength 不能是负数");
  }
  const chars = [...input];
  if (chars.length <= maxLength) {
    return input;
  }
  const keep = Math.max(0, maxLength - [...ellipsis].length);
  return chars.slice(0, keep).join("") + ellipsis;
}
