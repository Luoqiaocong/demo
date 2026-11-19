import test from "node:test";
import assert from "node:assert/strict";

import { slugify, wordCount, truncate } from "../lib/index.js";

test("slugify: 转小写并用连字符连接", () => {
  assert.equal(slugify("Hello World"), "hello-world");
});

test("slugify: 去掉标点，中文保留", () => {
  assert.equal(slugify("  前端/工程 笔记  "), "前端工程-笔记");
});

test("slugify: 空串返回空串", () => {
  assert.equal(slugify("   "), "");
});

test("wordCount: 英文按空格分词", () => {
  assert.equal(wordCount("hello world"), 2);
});

test("wordCount: 汉字逐字计数", () => {
  assert.equal(wordCount("你好 world"), 3);
});

test("truncate: 超长时截断并补省略号", () => {
  assert.equal(truncate("abcdef", 4), "abc…");
});

test("truncate: 未超长时原样返回", () => {
  assert.equal(truncate("abc", 4), "abc");
});

test("truncate: 负数长度抛 RangeError", () => {
  assert.throws(() => truncate("abc", -1), RangeError);
});
