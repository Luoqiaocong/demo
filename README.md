# demo

一个极简的文本工具库：把文本转成 slug、统计词数、按长度截断。用来练 Node.js 包的构建、测试、打包与发布。

## 安装

```bash
npm install demo
```

## 用法

```js
import { slugify, wordCount, truncate } from "demo";

slugify("Hello World");          // "hello-world"
slugify("  前端/工程 笔记  ");    // "前端工程-笔记"

wordCount("hello world");        // 2
wordCount("你好 world");          // 3

truncate("abcdef", 4);           // "abc…"
truncate("abc", 4);              // "abc"
```

## API

| 函数 | 作用 |
| --- | --- |
| `slugify(input)` | 转成 URL 友好的 slug，保留中文，去掉标点 |
| `wordCount(input)` | 计词：英文按单词、汉字按字 |
| `truncate(input, maxLength, ellipsis?)` | 按显示长度截断，省略号计入总长度 |

## 开发

```bash
npm install      # 装依赖
npm run build    # 编译到 lib/
npm test         # 构建 + 跑测试
```

## 许可证

MIT
