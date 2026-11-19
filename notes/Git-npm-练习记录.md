# 从一个空仓库搭建可发布的 npm 包

> 环境：Node 24.16 / npm 11.13 / git 2.52 / TypeScript 7.0.2，npm 源为镜像 `npmmirror`。
> 目标：把原本只用来练 Git 的 `demo` 仓库，改造成有源码、能编译、有测试、能打包的 npm 包，并走通"装到别的项目里能用"这条链路。

---

## 怎么用这份文档

按目的挑章节，不必从头读到尾：

| 想做什么 | 看哪几章 |
| --- | --- |
| 第一次用 Git，想知道基本操作 | 0 → 1 |
| 学怎么把项目配成 npm 包、怎么构建测试 | 2 → 3 → 4 |
| 学打包、验证"别人装得上" | 5 |
| 学分支和合并冲突 | 6 |
| 撤销改动、撤销提交、找回丢掉的提交 | 7 |
| 准备发版 | 8 → 9 |

每一节都是"一句话说明 + 命令 + 会看到什么"。**命令要自己敲一遍**，光看没用；敲完对不上输出时，先看那一节末尾有没有提到对应的坑。

---

## 0. 开始之前

### 0.1 前置准备（从零开始时才需要）

装好 Node（选 LTS 版即可）和 Git，然后第一次用 Git 得先告诉它你是谁，否则提交会失败或者记成奇怪的作者：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
git config --global --list
```

`--global` 表示对这台机器上所有仓库生效；想给某个仓库单独设置就去掉它，在仓库目录里执行。`--list` 用来确认写进去了。

仓库来源有两种，按你的情况选：

```bash
# 情况一：GitHub 上已有仓库，拉到本地
git clone https://github.com/用户名/仓库名.git

# 情况二：本地目录从零开始
cd 你的目录
git init
git remote add origin https://github.com/用户名/仓库名.git
```

`git init` 在当前目录建一个 Git 仓库（生成 `.git/` 目录），之后这个目录的改动才归 Git 管；`git remote add origin <地址>` 是给远程仓库起个别名叫 `origin`，后续 `push`、`pull` 都靠这个名字。

这次练习用的仓库是早就建好的，所以下文直接从"确认环境"开始；你如果是从零起步，先做完上面这几条。

### 0.2 确认环境

```bash
node -v && npm -v && git --version
npm config get registry
```

Node 版本决定能用哪些内置能力（比如 `node --test`），registry 决定装包快慢和能不能发包。本机是镜像源，记住一条：**装包可以走镜像，发包必须回官方源**。

### 0.3 看清仓库现状

```bash
cd /d/temp-dir/demo
git status -sb
git log --oneline --decorate -5
git branch -vv
git remote -v
```

`status -sb` 给出最精简的局面：当前分支、有没有脏东西。`log` 那行带 `--decorate`，能把 `HEAD -> main`、`origin/main`、`tag: v0.2.5` 的指向一次看清。

两个容易误会的点先记下来：`origin/main` 不是另一个分支，它是远程分支在本地的一份只读快照，只有 `fetch` 才更新；而 `v0.2.5` 只是个 Git 标签，跟 npm 上有没有这个版本没有任何关系。

---

## 1. 建立工作分支

### 1.1 切出功能分支

```bash
git switch -c docs/npm-package-practice
```

`main` 要保持随时可用，所以改动都在分支上做。`switch` 负责切分支，`-c` 是 `--create`，合起来是"新建一条并切过去"。老写法 `git checkout -b 分支名` 效果相同，`-b` 也是这个意思；现在更推荐 `switch`，因为 `checkout` 还兼着恢复文件，语义太杂。

### 1.2 改文件、看差异、暂存

```bash
git status -sb
git diff -- README.md
git add README.md
git diff --cached -- README.md
```

`status -sb` 的两列要会读：第一列管暂存区，第二列管工作区。刚改完是 ` M README.md`（前空后 M，改动还在工作区），`git add` 之后变成 `M  README.md`（前 M 后空，已经进暂存区）——内容一个字没变，变的是它站在哪个区域。

`git diff` 看还留在工作区的改动，`--cached` 看已经暂存的；`--` 后面的一律当路径处理，不当选项。提交前过一遍差异，是最便宜的省返工办法。

### 1.3 提交

```bash
git commit -m "docs: 更新项目练习说明"
git log --stat -1
```

提交完立刻用 `--stat` 确认动了哪些文件。消息按 Conventional Commits 写：`type: 说明`，`feat` 新功能、`fix` 修 bug、`docs` 文档、`chore` 配置杂务。

### 1.4 推送分支

```bash
git push -u origin docs/npm-package-practice
```

远程还没这条分支，所以要显式指明推到哪里。`-u` 是 `--set-upstream`，顺手记下"以后这个分支默认推到哪"，之后直接 `git push` 就行。推完 `git branch -vv` 里会出现 `[origin/docs/npm-package-practice]`，跟踪关系就建立好了。

这一步只上传分支，远程 `main` 一个字没动，也没创建 PR——推分支和合进主线是两件事。

---

## 2. 初始化 npm 项目

### 2.1 生成 package.json

```bash
npm init -y
```

`-y` 表示所有问题用默认答案，不弹交互。生成出来的 `name`、`version`、`author` 基本都要改，`main` 还指着一个不存在的 `index.js`。

### 2.2 先加上"私有"这道保险

```bash
npm pkg set private=true --json
npm pkg get name version private
```

`npm pkg set` 不用手改 JSON 就能改字段，`--json` 让值按 JSON 类型解析。

这里有个真实的坑：**不加 `--json`，`private=true` 会被写成字符串 `"true"`**，而不是布尔 `true`。npm 判断时字符串也算"真"，但语义已经错了，工具校验容易出问题。

### 2.3 建立 .gitignore

```gitignore
node_modules/
lib/
dist/
*.tgz
*.log
.env
.env.*
!.env.example
```

依赖几十 MB 且能重建；`lib/`、`dist/` 是构建产物，别人 clone 后自己 build；`*.tgz` 是本地打的包；`.env` 是密钥，误提交等于泄漏。`!.env.example` 的感叹号是"例外"，示例文件允许提交。

限制要记住：`.gitignore` **只对还没被跟踪的文件生效**，已经提交过的文件，事后加规则照样被跟踪。

### 2.4 安装 TypeScript

```bash
npm install -D typescript
npm ls --depth=0
npm view typescript version
npm outdated
```

`-D` 是 `--save-dev`，写进 `devDependencies`，意思是只在开发和构建时用，**别人安装你的包时不会装它**。`npm ls --depth=0` 只看直接依赖；`npm view` 是查 registry 上的发布信息，不安装。

会多出 `package-lock.json`，这个要提交——它锁死精确版本，保证 CI 和本机装出同一棵依赖树。`node_modules` 永远不进仓库。

---

## 3. 源码结构与配置

### 3.1 目录划分

| 位置 | 作用 |
| --- | --- |
| `src/` | TypeScript 源码 |
| `test/` | 测试，不参与发布 |
| `lib/` | 编译产物，被 git 忽略，被 `files` 收录 |
| `tsconfig.json` | 编译配置 |

### 3.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "lib",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`rootDir`/`outDir` 把源码和产物分开；`declaration: true` 生成 `.d.ts`，别人用 TypeScript 时才有类型提示；`strict` 打开严格检查；`include` 限定只编译 `src`。

### 3.3 src/index.ts

三个导出函数，都带 JSDoc：

- `slugify`：把文本转成 URL 友好的 slug，保留中文；
- `wordCount`：中英文计词，汉字按字计；
- `truncate`：按显示长度截断，超出补省略号。

```ts
export function truncate(input: string, maxLength: number, ellipsis = "…"): string {
  if (maxLength < 0) throw new RangeError("maxLength 不能是负数");
  const chars = [...input];
  if (chars.length <= maxLength) return input;
  const keep = Math.max(0, maxLength - [...ellipsis].length);
  return chars.slice(0, keep).join("") + ellipsis;
}
```

### 3.4 test/index.test.js

用 Node 内置的 `node:test` + `node:assert/strict`，不引额外依赖：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../lib/index.js";

test("slugify: 转小写并用连字符连接", () => {
  assert.equal(slugify("Hello World"), "hello-world");
});
```

注意它 import 的是 `../lib/index.js`——**测的是编译产物而不是源码**，顺带验证了编译出来的 ESM 能被正常加载，更接近使用者拿到手的东西。

### 3.5 package.json 的关键字段

```json
{
  "version": "0.1.0",
  "type": "module",
  "main": "./lib/index.js",
  "types": "./lib/index.d.ts",
  "exports": { ".": { "types": "./lib/index.d.ts", "import": "./lib/index.js" } },
  "files": ["lib"],
  "scripts": {
    "build": "tsc -p .",
    "test": "npm run build && node --test"
  },
  "engines": { "node": ">=20" },
  "private": true
}
```

`exports` 是现代入口声明，优先于 `main`，子路径必须显式写才允许被 import；`files` 是白名单，只有列出的内容会进包；`engines` 声明 Node 版本要求；`private` 是临时保险，发版前必须删掉。

---

## 4. 构建与测试

### 4.1 构建

```bash
npm run build
ls lib
```

`run build` 执行的是 `"build": "tsc -p ."`。`tsc` 是 TypeScript 编译器，`-p .` 表示"用当前目录的 tsconfig 编译这个项目"。跑完 `lib/` 里有 `index.js`、`index.d.ts` 和两个 `.map`。

### 4.2 测试

```bash
npm test
```

`test`、`start` 这类脚本名可以省掉 `run`。脚本内容是 `npm run build && node --test`，`&&` 保证前一条成功才跑后面，所以测的一定是最新产物。

踩过的坑：写成 `node --test test/` 会报 `MODULE_NOT_FOUND`，因为那个目录被当成模块入口加载了。正确写法就是 `node --test`，它会自己去 `test/` 下找 `*.test.js`。

### 4.3 测试抓到的真问题

`truncate("abcdef", 4)` 第一版返回 `abcd…`（长度 5），测试期望 `abc…`（长度 4）。原因是实现只截 4 个字符再补省略号，省略号没算进总长度；改成 `keep = maxLength - 省略号长度` 才对，并在文档里写明"省略号计入总长度"。

实现和预期打架时，最先该怀疑的是自己的定义没说清楚。

### 4.4 提交

```bash
git add package.json tsconfig.json src/ test/
git commit -m "feat: 添加文本工具函数与构建测试流程"
```

故意点名添加，没用 `git add -A`——`-A` 会把所有改动连删除带未跟踪文件一把收进去，容易捎带临时文件和 `.env`。提交后 `git status` 里看不到 `lib/`，被 `.gitignore` 挡住了，这是对的。

---

## 5. 打包预演

### 5.1 只算清单不生成文件

```bash
npm pack --dry-run
```

这是发包前最值钱的一步。`npm pack` 产出的 `.tgz` 跟 `npm publish` 上传的内容完全一样，发之前看清楚，比发出去再想办法删强得多。

当时的清单是 7 个文件、约 2.6 kB，只有 `lib/`、`README.md`、`LICENSE`、`package.json`。`src/`、`test/`、`tsconfig.json`、`demo.py` 全没进去，因为 `files` 白名单只写了 `["lib"]`；而 `package.json`、`README.md`、`LICENSE` 会出现，是 npm 强制自动带的，不算白名单漏了。

### 5.2 真的打一个包

```bash
npm pack
tar -tzf demo-0.1.0.tgz
```

文件名规则固定是 `<name>-<version>.tgz`。`tar` 的 `-t` 列内容、`-z` 是 gzip、`-f` 指定文件，会看到所有东西都在 `package/` 前缀下。

### 5.3 装进"别人的项目"验证

自己仓库里 import 能跑，不代表打出去的包能跑，所以另开一个完全独立的小项目：

```powershell
mkdir D:\temp-dir\pkg-try
cd D:\temp-dir\pkg-try
npm init -y
npm install D:\temp-dir\demo\demo-0.1.0.tgz
npm ls --depth=0
```

用本地 tarball 路径当包源，npm 会解压装进 `node_modules`，`package.json` 里记成 `"demo": "file:../demo/demo-0.1.0.tgz"`。

写一个三行的使用脚本：

```js
import { slugify, wordCount, truncate } from "demo";
```

```powershell
node use.mjs
```

输出 `hello-npm-world`、`8`、`这是一段很…`，说明按包名导入、ESM 入口解析、运行时加载全都通。再看 `node_modules/demo/` 里只有 `LICENSE`、`README.md`、`lib/`、`package.json`，跟 dry-run 的清单对得上。

---

## 6. 分支冲突演练

### 6.1 制造一次冲突

```bash
git switch -c practice/conflict-a
# 把 notes/git-notes.md 改成 A 版本
git add notes/git-notes.md
git commit -m "docs(practice): 分支 A 改写练习笔记"

git switch docs/npm-package-practice
git switch -c practice/conflict-b
# 把同一个文件改成 B 版本
git add notes/git-notes.md
git commit -m "docs(practice): 分支 B 改写练习笔记"
```

两条分支从同一个祖先出发，改的又是同一行，注定冲突。

顺带一个容易懵的行为：`git switch` 切分支时工作区文件会被**自动替换成目标分支的版本**，切回来发现内容变了不是你改错了，是分支本来就那样。

### 6.2 合并

```bash
git switch practice/conflict-a
git merge practice/conflict-b
git status
```

`merge` 做的是三方合并：找到共同祖先，分别比较"祖先→A"和"祖先→B"的改动，不同位置自动合上，同一行就停下来交给人决定。

输出 `CONFLICT (content)`，`git status` 里出现 `Unmerged paths`。**这不是报错**，是 Git 在说"这事得你定"。想放弃就用 `git merge --abort` 退回合并前。

### 6.3 解决冲突

文件里会出现三组标记：

```
<<<<<<< HEAD                   ← 当前分支 A 的内容
=======                        ← 分隔线
>>>>>>> practice/conflict-b    ← 被合进来分支 B 的内容
```

解决就是把文件改成最终要的样子，并且把三组标记删干净：

```bash
grep -n '<<<<<<<' notes/git-notes.md
git add notes/git-notes.md
git status -sb
git commit -m "merge: 合并练习分支并解决笔记冲突"
```

`git add` 就是"标记已解决"，Git 不检查内容，只认你有没有 add 过。所以标记没删干净也能提交，代码里就会留下 `=======`，而 Git 一声不响——提交前扫一眼这个习惯值得养成。

`status` 从 `Unmerged paths` 变成 `Changes to be committed`，说明可以提交了。

### 6.4 查看历史

```bash
git log --graph --oneline --all --decorate
git show --stat HEAD
```

这四个参数建议记成一条组合：`--graph` 画分叉合并的线，`--oneline` 一条提交压一行，`--all` 显示所有分支，`--decorate` 标出分支和标签。你会看到两条线从同一祖先分开，最后汇到一个**有两个父提交**的合并提交上。

### 6.5 清理分支

```bash
git branch --merged
git branch -d practice/conflict-b
git switch docs/npm-package-practice
git branch -d practice/conflict-a
git branch -D practice/conflict-a
```

`-d` 会先检查分支是否已合并，没合过就拒绝；`-D` 跳过检查直接删。不能删除自己当前所在的分支，所以要先切走。

这次演练的合并提交 `60a556f` 就是被 `-D` 删掉分支之后的状态：`git log` 里再也看不见，但 `git reflog` 还查得到——它没消失，只是没有分支指着它了。

---

## 7. 撤销与回退

这一节练"改坏了怎么办"。得先分两种情况：改动还没提交，还是已经提交了。两者用的工具完全不同，混着用会出事。

### 7.1 没提交的改动：git restore

改到一半发现方向错了，想回到上次提交的样子：

```bash
git restore notes/undo-drill.md
git diff
```

第一句把工作区里这个文件的修改丢掉，第二句验证，应该什么都看不到。注意这是**真丢**，Git 从没记录过这些内容，回收站里也没有。

如果只是 `git add` 了想反悔，但内容还想留着：

```bash
git add notes/undo-drill.md
git restore --staged notes/undo-drill.md
git status -sb
```

`--staged` 只把文件从暂存区拿出来，退回"已修改未暂存"，文件内容一个字没动。记一句话就够：**不带 `--staged` 丢内容，带 `--staged` 只丢位置。**

### 7.2 已提交的：reset 三个开关

提交已经生成、想撤掉，用 `git reset`。它的动作是"把分支指针往回挪"，区别在于改动往哪退：

```bash
git reset --soft HEAD~1    # 提交没了，改动回到暂存区
git reset --mixed HEAD~1   # 提交没了，改动回到工作区（默认）
git reset --hard HEAD~1    # 提交没了，改动也一起没了
```

三档一层比一层狠：`--soft` 只挪指针；`--mixed` 顺手把暂存区也清空；`--hard` 连工作区一起重置。

`status` 的表现也跟着变：`--soft` 之后是 `M `（已暂存），`--mixed` 之后是 ` M`（未暂存），`--hard` 之后完全干净。

实际怎么选：提交信息写错、想把改动重新组织一遍，用 `--soft`；这次提交干脆不要了，用 `--hard`。**`--hard` 是唯一会真丢东西的开关**，敲之前先 `git status` 看看有没有还没提交的活儿。

`HEAD~1` 是往回退一格，`~2` 就是退两格。

### 7.3 撤错了：git reflog

`--hard` 之后才发现退错了，别慌，Git 还记着：

```bash
git reflog -6
git reset --hard HEAD@{1}
```

`reflog` 记的不是提交，而是 **HEAD 自己挪动过的每一步**。`HEAD@{0}` 是当前，`HEAD@{1}` 是上一次挪动之前的位置，所以退回去就是回到 `HEAD@{1}`。

被 `--hard` 扔掉的提交、被删掉的分支，都能这样找回来，默认保留 90 天。

还有个工程上的事实：**reflog 只存在本地**，不会跟着 push 走，所以"能找回"这件事只在你自己的机器上成立。

### 7.4 踩到的坑：reset 只做了一半

练习时撞到过一次报错：

```
error: update_ref failed for ref 'HEAD': cannot lock ref 'HEAD':
Unable to create '.../refs/heads/practice/undo.lock': Permission denied
```

紧接着 `git status` 显示 `MM notes/undo-drill.md`，看着很懵。

原因是 `reset` 分两步走：先改索引，再挪分支指针。第二步因为权限不足失败，第一步已经生效，于是暂存区和工作区都偏离了当前提交，就成了 `MM`——**左 M 表示暂存区有改动，右 M 表示工作区又有改动**。

权限问题本身来自 `.git` 里有 34 个文件属主变成了 root，也就是两个身份轮流操作了同一个仓库。`chown -R admin:admin` 统一属主之后，重跑命令就正常了。

教训是：看到 `MM` 这种异常组合，先想想是不是某条命令只跑了一半。

### 7.5 已推送的提交别用 reset

`reset` 会改写历史。如果这个提交已经推给别人了，你一 reset 再强推，别人的历史就跟你对不上。那种情况用 `git revert`——它不删提交，而是生成一个"把改动反向抵消"的新提交，历史只增不改。这条还没练，等做到发布那一步再说。

---

## 8. 版本号与 Git 标签

> 这一章和下一章是紧接着要执行的流程，**还没在本机跑完**。命令和判断依据都按 npm 官方行为写的，实际跑的时候如果撞到新坑，回来改。

### 8.1 版本号该怎么涨

版本号是 `主.次.修订` 三段，对应 `major.minor.patch`：

- 修 bug、改文档、不改变用法的调整 → 涨修订位，`0.1.0 → 0.1.1`；
- 加了新功能但老用法还能用 → 涨次位，`0.1.1 → 0.2.0`；
- 有不兼容的改动（删了导出、改了参数含义）→ 涨主位，`0.2.0 → 1.0.0`；
- 预发布版本用后缀，比如 `0.2.0-rc.0`。

`0.x` 阶段表示"还在试探，接口可能会变"，所以练习包从 `0.1.0` 起步比较诚实。

一条硬规矩：**发布过的版本号不能复用**，哪怕你把包删了，那个号也回不来，只能往上加。

### 8.2 用 npm version 改版本号

```bash
npm version patch
```

它会做三件事：改 `package.json` 的 `version`、把这处改动自动 commit、打一个 `v0.1.1` 的 Git 标签。方便，但"偷偷帮你提交"这点很多人不适应，而且要求当前工作区必须是干净的。

只想改文件、提交和标签自己来：

```bash
npm version patch --no-git-tag-version
npm pkg get version
```

`--no-git-tag-version` 拆开看就是"不要 commit、不要 tag"。手动发版一般用这个，因为你想自己控制提交消息和标签落在哪。

### 8.3 打 Git 标签

标签是给某个提交贴的固定外号，它不改代码、不产生新提交：

```bash
git tag -a v0.1.1 -m "0.1.1：修正 truncate 长度计算"
git tag -n
git show v0.1.1
```

`-a` 创建附注标签（带作者、时间、说明），`-m` 是说明文字；不加 `-a` 的轻量标签只是个名字书签，发版推荐用附注的。`git tag -n` 列出标签和说明，`git show` 能看到它具体指向哪个提交。

### 8.4 推送标签

```bash
git push origin v0.1.1
git push --tags
```

**标签不会跟着 `git push` 自动上传**，必须单独推。单推一个用第一种，一次推全部用 `--tags`。这条也是 CI 自动发版的触发器，后面配了 workflow 就靠推标签来发版。

### 8.5 标签和版本号的关系

| 东西 | 管什么 |
| --- | --- |
| `package.json` 的 `version` | npm 上发的版本号，npm 和安装器读它 |
| Git 标签 `vX.Y.Z` | 标记"这次发布对应哪个提交"，人和 CI 读它 |

两者**没有程序绑定**，全靠约定：标签名就是 `v` 加上 `version`。手动发版的顺序是"先改版本 → 提交 → 在同一个提交上打标签 → 推标签"。

---

## 9. 发布到 npm

> 同样属于还没实操的部分。发布是不可逆的（版本号不能复用），所以下面每一步都先确认再执行。

### 9.1 发布前自查

```bash
npm run build && npm test
npm pack --dry-run
npm whoami
npm view demo version
```

四条分别确认：代码能构建能测、包里内容干净、当前登录的是谁、这个包名有没有被占用。`npm view` 返回 `E404` 说明名字可用；返回版本号说明已被占用，得换名。

名字还没定死，正式发布前记得把 `package.json` 的 `name` 改成没人用的，用 `npm view <名字>` 验证。

### 9.2 切到官方源并登录

装包用镜像没事，**发包必须走官方源**，否则会得到 `401` 或 `404`：

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

`npm login` 会交互问用户名、密码、邮箱，账号开了双因子还要一次性验证码。`whoami` 是确认身份，回显用户名就对了。

不想每次敲 `--registry`，可以只在发包时指定，或者在 `package.json` 里固定：

```json
"publishConfig": { "registry": "https://registry.npmjs.org/", "access": "public" }
```

### 9.3 先演练一次

```bash
npm publish --dry-run
```

`--dry-run` 只打印会发什么、不真的发。清单应该和 `npm pack --dry-run` 一致。

还有一个坑得提前知道：`package.json` 里的 `"private": true` 会让发布直接失败，**发之前必须删掉**（`npm pkg delete private`）。这是当初防止误发布上的保险，现在得自己拆。

### 9.4 正式发布

```bash
npm publish --access public
```

`--access public` 是给带 scope 的包用的（`@用户名/包名` 默认是私有的，不加这个别人装不到）；不带 scope 的普通包名可以省略。账号开了双因子的还要加 `--otp=123456`。

### 9.5 发布后核对

```bash
npm view demo version
npm view demo dist-tags
npm view demo dist.tarball
```

第一条看最新版本是不是你刚发的，第二条看 `latest` 指向哪个版本，第三条是实际下载地址。想更彻底，去一个空目录 `npm install demo` 装一遍跑跑看——这跟当初用 tarball 验证是同一个思路。

### 9.6 发错了怎么办

| 情况 | 做法 |
| --- | --- |
| 版本有问题但能装 | `npm deprecate demo@0.1.1 "有 bug，请升到 0.1.2"`，被弃用的版本仍能装，只是有警告 |
| 想撤某个版本 | `npm unpublish demo@0.1.1`，72 小时内且没人依赖才可能成功 |
| 发错了一个文件 | 只能升版本重发，已发布的版本内容不可修改 |

原则很硬：**能 deprecate 就不要 unpublish**。撤包会让别人的 lock 文件失效、CI 直接挂。

---

## 10. 后续待办

1. 按第 8、9 章把版本、标签、发布真正跑一遍。
2. `git revert` 撤销已推送的提交。
3. `git stash` 临时收起改动去干别的。
4. 第二账号协作：fork → 推分支 → 提 PR → review → 合并。
5. 进阶：GitHub Actions + Trusted Publishing，推标签自动发版，不用存 token。

---

## 附录 A：当前文件清单

| 文件 | 状态 |
| --- | --- |
| `README.md` | 已跟踪，项目说明 |
| `demo.py` | 已跟踪，早期练手文件 |
| `package.json` | 已跟踪，包配置 |
| `package-lock.json` | 已跟踪，依赖锁定 |
| `tsconfig.json` | 已跟踪，编译配置 |
| `src/index.ts` | 已跟踪，源码 |
| `test/index.test.js` | 已跟踪，测试 |
| `LICENSE` | 已跟踪，MIT |
| `notes/git-notes.md` | 已跟踪，合并演练用 |
| `notes/Git-npm-练习记录.md` | 已跟踪，本文档 |
| `lib/` | 忽略（构建产物） |
| `node_modules/` | 忽略 |
| `demo-0.1.0.tgz` | 忽略（本地打包产物） |

## 附录 B：常用命令速记
```bash
# 看状态与历史
git status -sb
git diff
git diff --cached
git log --graph --oneline --all --decorate

# 提交
git add <具体文件>
git commit -m "feat: 做了什么"

# 分支
git switch -c feature/xxx
git switch main
git merge feature/xxx
git branch -d feature/xxx

# 撤销
git restore <文件>              # 丢掉未提交的改动
git restore --staged <文件>      # 只取消暂存，内容保留
git reset --soft HEAD~1         # 退提交，改动留在暂存区
git reset --mixed HEAD~1        # 退提交，改动留在工作区（默认）
git reset --hard HEAD~1         # 退提交，改动一起清掉
git reflog                      # 撤错了来这里找
git reset --hard HEAD@{1}       # 回到上一次挪动之前

# 远程
git push -u origin feature/xxx
git push
git fetch / git pull

# npm 日常
npm install / npm install -D <pkg>
npm ls --depth=0 / npm outdated
npm run <script>

# npm 发版前
npm run build && npm test
npm pack --dry-run
npm version patch --no-git-tag-version
npm publish --registry=https://registry.npmjs.org/
npm view <pkg> version dist-tags
```

---

## 附录 C：新手最容易卡的地方

**`git commit` 报 "Please tell me who you are"**
没配身份。跑一次 `git config --global user.name "…"` 和 `user.email "…"` 就好。

**`git push` 报 no upstream branch**
这条分支还没和远程建立关系，第一次要 `git push -u origin 分支名`。

**改完文件 `git status` 看不到 `lib/`**
被 `.gitignore` 挡了，正常，构建产物不该进仓库。

**`npm publish` 报 404 或 401**
多半是 registry 指到了镜像站，发包必须显式用 `--registry=https://registry.npmjs.org/`。

**`npm publish` 报 "cannot publish over" / `EPUBLISHCONFLICT`**
这个版本号已经发过了。版本号不能复用，涨一位再发。

**`npm publish` 报 private 相关错误**
`package.json` 里还挂着 `"private": true`，删掉再发。

**装包特别慢或者超时**
换镜像 `npm config set registry https://registry.npmmirror.com`，发包前记得换回来。

**`npm ci` 报 lock 文件与 package.json 不一致**
有人改了 `package.json` 没更新 lock。本地 `npm install` 重新生成 lock 再提交。

**切分支后代码"变了"**
正常，工作区文件会切换成目标分支的版本，切回来就恢复。

**合并后代码里出现 `=======`**
冲突标记没清干净就提交了。`grep -n '<<<<<<<' 文件` 扫一遍，改完再提交。

**删了分支，提交不见了**
`git reflog` 找到那次提交的哈希，`git switch -c 新分支名 哈希` 就能捞回来。

**`git reset --hard` 把改动弄没了**
`--hard` 连工作区一起重置，未提交的改动直接没。不确定时先用 `git stash`，或者只用 `--soft`/`--mixed`。
