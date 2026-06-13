# Gogs Agent

**Claude Code 技能 + CLI 工具，用于操作 Gogs 仓库。**

`gogs-agent` 为 Claude Code 智能体（以及人类用户）提供了结构化、类型安全的 Gogs 操作能力 —— 通过统一的 CLI 接口创建和管理 Issue、Pull Request、评论和标签，输出标准 JSON。

> **版本：** 0.1.0 &emsp; **协议：** MIT &emsp; **运行时：** Node.js ≥ 18 &emsp; [English](README.md)

---

## 功能特性

- **16 个 CLI 命令** — 覆盖 Issue、PR、评论、标签和仓库元数据
- **3 种输出格式** — JSON（默认）、Markdown 表格、纯文本
- **多仓库支持** — 每条命令都可以用 `--repo` 指定目标仓库，支持环境变量兜底
- **自动生成 Claude Code 技能** — `skill.md` 从 CLI 元数据构建时自动生成，防止手动同步带来的漂移
- **零配置默认值** — 设置一次 `GOGS_DEFAULT_REPO`，之后无需每次输入 `--repo`
- **自动重试 + 退避** — HTTP 客户端在 429（限流）和 5xx（服务器错误）时自动重试
- **类型化错误** — 结构化 JSON 错误输出 + 退出码，脚本和智能体都能按错误类型分支处理

---

## 快速开始

### 1. 安装

```bash
npm install -g gogs-agent
```

### 2. 配置

创建 `.env` 文件（或直接设置环境变量）：

```bash
GOGS_API_KEY=你的_gogs_api_token
GOGS_BASE_URL=https://git.desiyi.com/api/v1
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
| **仓库** | `info` |

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

# 配置——任选一种
echo 'GOGS_API_KEY=你的_token' >> .env           # 项目 .env 文件
echo 'GOGS_DEFAULT_REPO=org/repo' >> .env        # 可选，省去每次敲 --repo
# 或者: export GOGS_API_KEY=你的_token            # shell 环境变量

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

把 `gogs-agent.skill` 文件放到你的项目目录下。Claude Code 下次启动时会自动发现并加载。

或者在你项目的 `CLAUDE.md` 中引用：

```markdown
> Gogs 操作使用 gogs-agent skill，skill 文件在 ./skills/gogs-agent.skill
```

加载后，Claude Code 智能体就可以直接操作你的 Gogs 仓库——创建 Issue、审查 PR、合并代码、管理标签——全部通过结构化 tool 调用完成。

Skill 的 tool schema 会在 `npm run build` 时**从 CLI 元数据自动生成**，永远不会跟实际 CLI 实现产生偏差。

### 配置参考

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `GOGS_API_KEY` | **是** | — | Gogs API Token（在 Settings → Applications 中生成） |
| `GOGS_BASE_URL` | 否 | `https://git.desiyi.com/api/v1` | 你的 Gogs 实例 API 地址 |
| `GOGS_DEFAULT_REPO` | 否 | — | 默认仓库，格式 `owner/repo` |

加载优先级：`CLI --flags` > `环境变量` > `.env 文件` > `内置默认值`

**获取 Token：** 登录你的 Gogs 实例 → Settings → Applications → 生成新 Token。

> 详见：[docs/configuration.md](docs/configuration.md)

---

## 开发

```bash
git clone https://git.desiyi.com/xing/gogs-agent.git
cd gogs-agent
npm install
npm test          # 77 条测试，约 11 秒
npm run build     # 编译 TypeScript + 生成 skill.md
```

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/commands.md](docs/commands.md) | 全部 16 条命令的完整参考（含每个参数的说明和示例） |
| [docs/configuration.md](docs/configuration.md) | 环境变量、`.env` 配置、优先级链 |
| [skill.md](skill.md) | 自动生成的 Claude Code Skill，含 JSON Schema 工具定义 |

---

## 设计理念

`gogs-agent` 遵循以下几个原则：

- **命令函数保持纯函数** — 每个命令接收 `(client, params)`，返回数据。不读环境变量、不写文件、不输出到控制台。
- **CLI 层负责所有副作用** — 仅 `cli.ts` 读取配置、调用命令、写入输出。
- **单一事实来源** — `scripts/generate-skill.ts` 读取 Commander CLI 树，在构建时生成 `skill.md`，彻底消除手动同步的漂移风险。
- **Node 18+ 标准库** — 除了 `fetch`、`commander`、`dotenv` 外，零外部 HTTP 依赖。

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
    └── repo.ts         # info
```
