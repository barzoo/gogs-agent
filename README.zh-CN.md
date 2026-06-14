# Gogs Agent

**在命令行里操作 Gogs 仓库，也能当 Claude Code 技能用。**

`gogs-agent` 是 [Gogs](https://gogs.io)（[github.com/gogs/gogs](https://github.com/gogs/gogs)）自托管 Git 服务的 CLI 工具。Issue、PR、评论、标签——GitHub 上能干的事，在自己的 Gogs 实例上一样能做。所有命令都输出 JSON，人和 Claude Code 智能体都能直接读懂。

> **版本：** 0.2.2 &emsp; **协议：** MIT &emsp; **运行时：** Node.js ≥ 18 &emsp; **Gogs API：** v1（Gogs ≥ v0.12） &emsp; [English](README.md)

---

## 能做什么

- **17 个 CLI 命令**——覆盖 Issue、PR、评论、标签和仓库管理
- **3 种输出格式：** JSON（默认）、Markdown 表格、纯文本——还能用 `--output` 直接写到文件
- **多仓库切换：** 每条命令都能用 `--repo` 指定仓库，也支持 `GOGS_DEFAULT_REPO` 环境变量兜底
- **自动生成 Claude Code 技能：** `skill.md` 每次构建时从 CLI 元数据重新生成，永远不会跟实现脱节
- **智能标签解析：** 直接用人类可读的名字，比如 `--labels "bug,紧急"`——CLI 会自动查 ID，不存在的标签还会帮你创建
- **自动重试：** 碰到 429（限流）和 5xx（服务器错误）会自动重试，带退避策略
- **类型化错误：** 结构化的 JSON 错误加退出码，脚本能按错误类型走不同分支

---

## 快速开始

### 1. 安装

```bash
npm install -g gogs-agent
```

### 2. 配置

创建 `~/.gogs/config.json`，把 API token 写进去（一次性设置，之后所有项目都能用）：

```json
{
  "apiKey": "你的_gogs_api_token",
  "baseUrl": "https://git.desiyi.com/api/v1"
}
```

Token 在哪生成：登录你的 Gogs → **Settings → Applications**。

还可以设个默认仓库，省去每次都敲 `--repo`：

```bash
export GOGS_DEFAULT_REPO=你的组织/你的仓库
```

> 完整配置指南：[docs/configuration.zh-CN.md](docs/configuration.zh-CN.md)

### 3. 试试看

```bash
# Issue
gogs issue list --repo myorg/myrepo --state open
gogs issue create --repo myorg/myrepo --title "Bug: 登录崩溃" --labels "bug,紧急"

# PR
gogs pr create --repo myorg/myrepo --title "修复: 登录问题" --head fix-branch --base main
gogs pr merge --repo myorg/myrepo --number 42 --strategy squash

# 评论
gogs comment create --repo myorg/myrepo --type issue --number 5 --body "LGTM！"

# 标签
gogs label list --repo myorg/myrepo
gogs label create --repo myorg/myrepo --name "优先级-高" --color "#ee0701"
```

> 全部命令及参数：[docs/commands.zh-CN.md](docs/commands.zh-CN.md)

---

## 命令一览

| 分组 | 命令 |
|-------|----------|
| **Issue** | `list` · `get` · `create` · `update` · `close` · `reopen` |
| **PR** | `list` · `get` · `create` · `merge` · `diff` |
| **评论** | `list` · `create` |
| **标签** | `list` · `get` · `create` · `update` · `delete` |
| **仓库** | `info` · `create` |

所有命令格式：`gogs <资源> <操作> [--参数]`

---

## Claude Code 技能

除了当纯 CLI 用，`gogs-agent` 自带 Claude Code 技能。加载之后，你用中文跟 Claude 聊仓库的事就行——Claude 自己会选对命令、填好参数，把结果整理给你看。

```
你（说人话）→ Claude（选工具 + 填参数）→ gogs CLI → Gogs API → 返回 JSON → Claude 格式化呈现
```

技能文件在 `skills/gogs-agent/skill.md`，每次构建自动生成，永远跟 CLI 实现保持同步。

**怎么配：**
1. 全局安装 CLI：`npm install -g gogs-agent`
2. 配好 `GOGS_API_KEY`（和可选的 `GOGS_DEFAULT_REPO`）环境变量
3. Claude Code 启动时自动发现 `skills/` 目录下的技能

**随便聊聊就能干活：**
| 你说的话 | Claude 实际执行 |
|---------|---------------|
| "帮我看看有哪些 open 的 issue" | `gogs issue list --state open` |
| "建个 issue：iOS 端登录崩溃" | `gogs issue create --title "iOS 端登录崩溃" --body "..."` |
| "用 squash 合并 42 号 PR" | `gogs pr merge --number 42 --strategy squash` |
| "5 号 issue 下面有哪些评论？" | `gogs comment list --type issue --number 5` |
| "把 3 号标签改名为 critical" | `gogs label update --id 3 --name critical` |

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/configuration.zh-CN.md](docs/configuration.zh-CN.md) | 全部配置项：环境变量、`~/.gogs/config.json`、`.env`、CLI 参数、优先级规则 |
| [docs/commands.zh-CN.md](docs/commands.zh-CN.md) | 完整命令参考——17 条命令的每一个参数和示例 |
| [skill.md](skill.md) | 自动生成的 Claude Code 技能，含 JSON Schema 工具定义 |

---

## 开发

```bash
git clone https://git.desiyi.com/xing/gogs-agent.git
cd gogs-agent
npm install
npm test          # 83 条测试，约 11 秒
npm run build     # 编译 TypeScript + 生成 skill.md
```

### 设计理念

命令函数是纯函数：`(client, params) → data`。副作用全收敛在 `cli.ts` 一个文件里。技能文件从 Commander CLI 树构建时自动生成，没人手工维护。运行时只依赖 `commander`、`dotenv` 和 Node.js 标准库。

```
src/
├── cli.ts              # Commander.js 入口（所有副作用集中于此）
├── client.ts           # Gogs API HTTP 客户端（鉴权、重试、分页）
├── config.ts           # 配置加载器（CLI > env > .env > 用户配置 > 默认值）
├── types.ts            # 共享 TypeScript 类型
├── errors.ts           # 类型化错误类
├── formatters.ts       # JSON / Markdown / 文本输出
├── labels.ts           # 标签名→ID 解析 + 自动创建
├── output.ts           # 文件输出 + 扩展名推断格式
└── commands/
    ├── issue.ts        # list, get, create, update, close, reopen
    ├── pr.ts           # list, get, create, merge, diff
    ├── comment.ts      # list, create
    ├── label.ts        # list, get, create, update, delete
    └── repo.ts         # info, create
```
