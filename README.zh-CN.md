# Gogs Agent

**在命令行操作 Gogs 仓库，也能作为 Claude Code 技能使用。**

`gogs-agent` 是 Gogs 自托管 Git 服务的 CLI 工具。Issue、PR、评论、标签 —— GitHub 上能做的事，在自己的 Gogs 实例上也能做。所有命令输出 JSON，人和 Claude Code 智能体都能直接解析。

> **版本：** 0.1.0 &emsp; **协议：** MIT &emsp; **运行时：** Node.js ≥ 18 &emsp; [English](README.md)

---

## 功能特性

- **17 个 CLI 命令** — 覆盖 Issue、PR、评论、标签和仓库管理（含创建仓库）
- **3 种输出格式：** JSON（默认）、Markdown 表格、纯文本
- **多仓库支持：** 每条命令都可以用 `--repo` 指定目标仓库，支持环境变量兜底
- **自动生成 Claude Code 技能：** `skill.md` 从 CLI 元数据构建时自动生成，不用手动同步
- **零配置默认值：** 设置一次 `GOGS_DEFAULT_REPO`，之后不用每次敲 `--repo`
- **自动重试 + 退避：** HTTP 客户端在 429（限流）和 5xx（服务器错误）时自动重试
- **类型化错误：** 结构化 JSON 错误输出 + 退出码，脚本和智能体都能按错误类型分支处理

---

## 快速开始

### 1. 安装

```bash
npm install -g gogs-agent
```

### 2. 配置

**一次性设置** — 创建 `~/.gogs/config.json`：

```json
{
  "apiKey": "你的_gogs_api_token",
  "baseUrl": "https://git.desiyi.com/api/v1"
}
```

这些是个人设置，基本不会变。配置一次，所有项目自动继承，不用在每个项目里重复写 `.env`。

**按项目覆盖** — 如果某个项目需要不同的值，放一个 `.env` 文件即可覆盖：

```bash
GOGS_DEFAULT_REPO=你的组织/你的仓库    # 可选——设置后不用每次输 --repo
```

> 全部配置项和优先级规则见 [docs/configuration.md](docs/configuration.md)。

### 3. 使用

```bash
# 查看未关闭的 Issue
gogs issue list --repo myorg/myrepo --state open

# 创建 Issue
gogs issue create --repo myorg/myrepo --title "Bug: 登录崩溃" --labels "bug,紧急"

# 创建 PR
gogs pr create --repo myorg/myrepo --title "修复: 登录问题" --head fix-branch --base main

# 获取 PR 的 diff
gogs pr diff --repo myorg/myrepo --number 42

# 合并 PR
gogs pr merge --repo myorg/myrepo --number 42 --strategy squash

# 创建仓库
gogs repo create --name my-project --description "新项目" --private

# 添加评论
gogs comment create --repo myorg/myrepo --type issue --number 5 --body "LGTM！"
```

> 全部命令及参数详见 [docs/commands.md](docs/commands.md)。

---

## 命令概览

| 分组 | 命令 |
|------|------|
| **Issue** | `list` · `get` · `create` · `update` · `close` · `reopen` |
| **Pull Request** | `list` · `get` · `create` · `merge` · `diff` |
| **评论** | `list` · `create` |
| **标签** | `list` · `create` |
| **仓库** | `info` · `create` |

所有命令格式：`gogs <资源> <操作> [--参数]`

---

## 输出约定

每条命令向 stdout 输出结构化 JSON：

**成功：**
```json
{ "ok": true, "data": { ... } }
```

**失败：**
```json
{ "ok": false, "error": "...", "code": "API_ERROR", "status": 404 }
```

**退出码：** `0` 成功 · `1` 配置/验证错误 · `2` API 错误 · `3` 网络错误

使用 `--format markdown` 输出可读的表格，使用 `--output path/to/file.json` 将结果直接写入文件。

---

## 在别的项目中使用

### 纯 CLI 使用

```bash
# 安装
npm install -g gogs-agent

# 配置——一次性设置 ~/.gogs/config.json（推荐）
# 详见上方"快速开始 → 配置"，然后用 .env 设置项目特有项：
echo 'GOGS_DEFAULT_REPO=org/repo' >> .env        # 可选，省去每次敲 --repo

# 使用
gogs issue list --state open                      # 如果配置了 GOGS_DEFAULT_REPO，无需 --repo
gogs pr diff --number 42
```

如果同时操作多个仓库，不设 `GOGS_DEFAULT_REPO`，每次显式指定 `--repo`：

```bash
gogs issue list --repo org/frontend --state open
gogs pr list --repo org/backend --state open
gogs pr list --repo org/docs --state open
```

### 配合 Claude Code Skill 使用

CLI 本身就能用。但 `gogs-agent` 存在的真正原因是 Claude Code。加载 skill 之后，你用中文跟 Claude 聊仓库的事就行——Claude 自己会选对命令、填好参数。Tool schema 在构建时从 CLI 元数据生成，永远跟实现同步。

#### 工作原理

`skills/gogs-agent/skill.md` 里定义了 17 个 tool，每个对应一条 CLI 命令，带 JSON Schema 描述参数。Claude 根据你的意图选 tool、填参数、跑 `gogs` 命令，拿到 JSON 结果后告诉你发生了什么。

```
你（自然语言）→ Claude（选择 tool + 填写参数）→ gogs CLI → Gogs API → JSON 返回 → Claude 格式化呈现
```

#### 配置步骤

1. **全局安装 CLI：**
   ```bash
   npm install -g gogs-agent
   ```

2. **配置凭据：**
   ```bash
   # 推荐：一次性写入 ~/.gogs/config.json（见上方"快速开始 → 配置"）
   # 或者用环境变量：
   export GOGS_API_KEY=你的_gogs_api_token              # 必填——在 Gogs → Settings → Applications 中生成
   export GOGS_DEFAULT_REPO=你的组织/你的仓库             # 可选——设了之后不用每次传 --repo
   ```

3. **让 Claude Code 发现 Skill**——二选一：

   **方式 A（自动发现）：** skill 文件已在本项目的 `skills/` 目录下，Claude Code 启动时会自动发现 `skills/` 目录中的 skill。

   **方式 B（显式引用）：** 在项目的 `CLAUDE.md` 中添加：
   ```markdown
   > Gogs 操作使用 gogs-agent skill，skill 文件在 ./skills/gogs-agent.skill
   ```

#### 使用方式——用自然语言对话即可

Skill 加载后，你不需要记忆任何 CLI 命令，直接用自然语言跟 Claude 对话：

| 你说的话 | Claude 实际执行 |
|---------|---------------|
| "帮我看看有哪些 open 的 issue" | `gogs issue list --state open` |
| "创建一个 issue：iOS 端登录崩溃" | `gogs issue create --title "iOS 端登录崩溃" --body "..."` |
| "42 号 PR 的内容是什么？" | `gogs pr get --number 42` |
| "用 squash 方式合并 42 号 PR" | `gogs pr merge --number 42 --strategy squash` |
| "看看 42 号 PR 的 diff" | `gogs pr diff --number 42` |
| "5 号 issue 下面有哪些评论？" | `gogs comment list --type issue --number 5` |
| "在 5 号 issue 下回复 LGTM" | `gogs comment create --type issue --number 5 --body "LGTM"` |
| "列出这个仓库的所有标签" | `gogs label list` |
| "创建一个红色的 bug 标签" | `gogs label create --name bug --color ee0701` |
| "把 3 号 issue 关掉" | `gogs issue close --number 3` |
| "查看仓库信息" | `gogs repo info` |
| "创建一个叫 backend 的新仓库" | `gogs repo create --name backend --private` |
| "把 7 号 issue 的标题改成「v2 已修复」" | `gogs issue update --number 7 --title "v2 已修复"` |

#### 完整开发流程示例

一个真实例子——从发现 bug 到修完关闭：

```
你："我发现一个 bug——iOS 上登录页崩溃了。帮我建个 issue。"
Claude：[创建 issue #23] "已创建 issue #23：Bug: iOS 端登录崩溃"

你："看看这个 issue，加一些调试分析。"
Claude：[读取 issue #23，添加分析评论]

你："我在 fix/ios-login 分支上修好了，创建 PR。"
Claude：[创建 PR #47，从 fix/ios-login 合并到 main]

你："审查一下 PR diff，看看有没有问题。"
Claude：[获取 diff，分析代码] "代码看起来没问题。有一个建议：..."

你："没问题，squash 合并然后关掉 issue。"
Claude：[squash 合并 PR #47，关闭 issue #23] "完成。PR #47 已合并，issue #23 已关闭。"
```

#### 前置条件检查

- [ ] Node.js 18+ 已安装
- [ ] `gogs-agent` 已全局安装（`npm install -g gogs-agent`）
- [ ] `GOGS_API_KEY` 环境变量已设置为有效的 Gogs API token
- [ ] `GOGS_BASE_URL` 已设置（或使用默认值 `https://git.desiyi.com/api/v1`）
- [ ] Skill 文件在项目中（已自带在 `skills/` 目录下）
- [ ] 添加 skill 后重启了 Claude Code

### 配置参考

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `GOGS_API_KEY` | **是** | — | Gogs API Token（在 Settings → Applications 中生成） |
| `GOGS_BASE_URL` | 否 | `https://git.desiyi.com/api/v1` | 你的 Gogs 实例 API 地址 |
| `GOGS_DEFAULT_REPO` | 否 | — | 默认仓库，格式 `owner/repo` |

加载优先级：`CLI --flags` > `环境变量` > `项目 .env` > `用户 ~/.gogs/config.json` > `内置默认值`

**获取 Token：** 登录你的 Gogs 实例 → Settings → Applications → 生成新 Token。

> 详见：[docs/configuration.md](docs/configuration.md)

---

## 开发

```bash
git clone https://git.desiyi.com/xing/gogs-agent.git
cd gogs-agent
npm install
npm test          # 83 条测试，约 11 秒
npm run build     # 编译 TypeScript + 生成 skill.md
```

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/commands.md](docs/commands.md) | 全部 17 条命令的完整参考（含每个参数的说明和示例） |
| [docs/configuration.md](docs/configuration.md) | 环境变量、`.env` 配置、优先级链 |
| [skill.md](skill.md) | 自动生成的 Claude Code Skill，含 JSON Schema 工具定义 |

---

## 设计理念

`gogs-agent` 遵循以下几个原则：

- 命令是纯函数：`(client, params) → data`。不碰环境变量、不写文件、不打日志。
- 副作用全在 `cli.ts` 一个文件里：读配置、调命令、写输出。其他所有代码都是可测试的。
- Skill 文件从 Commander CLI 树构建时生成。没人手工维护它，所以不会出现跟实现对不上的情况。
- 只依赖 `commander`、`dotenv` 和 Node.js 标准库。HTTP 请求直接用 `fetch`，没引入第三方 HTTP 库。

```
src/
├── cli.ts              # Commander.js 入口
├── client.ts           # Gogs API HTTP 客户端（鉴权、重试、分页）
├── config.ts           # 配置加载器
├── types.ts            # 共享 TypeScript 类型
├── errors.ts           # 类型化错误类
├── formatters.ts       # JSON / Markdown / 文本输出格式化
├── labels.ts           # 标签辅助函数（查找 + 自动创建）
├── output.ts           # 文件输出 + 扩展名推断格式
└── commands/
    ├── issue.ts        # list, get, create, update, close, reopen
    ├── pr.ts           # list, get, create, merge, diff
    ├── comment.ts      # list, create
    ├── label.ts        # list, create
    └── repo.ts         # info, create
```
