# 命令参考

所有命令格式：`gogs <资源> <操作> [--参数]`

## 全局参数

以下参数在所有命令中都能用：

| 参数 | 说明 |
|------|------|
| `--repo <owner/repo>` | 目标仓库——覆盖 `GOGS_DEFAULT_REPO` |
| `--format json\|markdown\|text` | 输出格式（默认 `json`） |
| `--output <path>` | 把结果写到文件，而不是打印到终端 |
| `--verbose` | 在 stderr 输出诊断日志 |

---

## Issue 命令

### `gogs issue list`

列出仓库的 issue，支持筛选。

```bash
gogs issue list --repo <owner/repo> [--state open|closed|all] [--labels a,b] [--limit 20] [--page 1]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--state` | string | 否 | 按状态筛选：`open`（开启）、`closed`（已关闭）、`all`（全部） |
| `--labels` | string | 否 | 按标签筛选，英文逗号分隔，比如 `bug,紧急` |
| `--limit` | integer | 否 | 每页数量 |
| `--page` | integer | 否 | 页码 |

**示例：**

```bash
gogs issue list --repo xing/gogs-agent --state open --labels bug --limit 10
```

### `gogs issue get`

查看某个 issue 的详情。

```bash
gogs issue get --repo <owner/repo> --number <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | Issue 编号 |

**示例：**

```bash
gogs issue get --repo xing/gogs-agent --number 42
```

### `gogs issue create`

创建 issue。标签写名字就行，不用记 ID——CLI 会自动查找，找不到的标签还会帮你创建。

```bash
gogs issue create --repo <owner/repo> --title "..." [--body "..."] [--labels a,b] [--assignee user] [--milestone id]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--title` | string | **是** | Issue 标题 |
| `--body` | string | 否 | Issue 正文（支持 Markdown） |
| `--labels` | string | 否 | 标签名，英文逗号分隔——自动查找 ID，不存在的自动创建 |
| `--assignee` | string | 否 | 指派给谁（填用户名） |
| `--milestone` | integer | 否 | 里程碑 ID |

**示例：**

```bash
gogs issue create \
  --repo xing/gogs-agent \
  --title "feat: 支持 webhook" \
  --body "## 背景\n\nCI 集成需要 webhook 事件通知。" \
  --labels "增强功能,二期" \
  --assignee xing
```

### `gogs issue update`

更新 issue。只改你传了的字段，没传的保持原样。

```bash
gogs issue update --repo <owner/repo> --number <n> [--title "..."] [--body "..."] [--state open|closed] [--assignee user] [--milestone id] [--labels a,b]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | Issue 编号 |
| `--title` | string | 否 | 新标题 |
| `--body` | string | 否 | 新正文 |
| `--state` | string | 否 | 新状态：`open` 或 `closed` |
| `--assignee` | string | 否 | 新指派人 |
| `--milestone` | integer | 否 | 新里程碑 ID |
| `--labels` | string | 否 | 标签名（英文逗号分隔，会替换全部现有标签） |

至少传一个字段，一个都不传会报参数校验错误。

**示例：**

```bash
gogs issue update --repo xing/gogs-agent --number 42 --title "v2 已修复" --state closed
```

### `gogs issue close`

关闭 issue。

```bash
gogs issue close --repo <owner/repo> --number <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | Issue 编号 |

### `gogs issue reopen`

重新打开之前关闭的 issue。

```bash
gogs issue reopen --repo <owner/repo> --number <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | Issue 编号 |

---

## Pull Request 命令

### `gogs pr list`

列出仓库的 PR。

```bash
gogs pr list --repo <owner/repo> [--state open|closed|all] [--limit 20] [--page 1]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--state` | string | 否 | 按状态筛选 |
| `--limit` | integer | 否 | 每页数量 |
| `--page` | integer | 否 | 页码 |

### `gogs pr get`

查看某个 PR 的详情。

```bash
gogs pr get --repo <owner/repo> --number <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | PR 编号 |

### `gogs pr create`

创建 PR。

```bash
gogs pr create --repo <owner/repo> --title "..." --head <branch> --base <branch> [--body "..."] [--assignee user]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--title` | string | **是** | PR 标题 |
| `--head` | string | **是** | 源分支（你的改动在这个分支上） |
| `--base` | string | **是** | 目标分支（要合到哪个分支） |
| `--body` | string | 否 | PR 描述（支持 Markdown） |
| `--assignee` | string | 否 | 指派给谁 |

**示例：**

```bash
gogs pr create \
  --repo xing/gogs-agent \
  --title "feat: 标签管理功能" \
  --head feature/labels \
  --base main \
  --body "Closes #42"
```

### `gogs pr merge`

合并 PR。

```bash
gogs pr merge --repo <owner/repo> --number <n> [--strategy merge|rebase|squash]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | PR 编号 |
| `--strategy` | string | 否 | 合并策略：`merge`（默认）、`rebase`、`squash` |

**示例：**

```bash
gogs pr merge --repo xing/gogs-agent --number 99 --strategy squash
```

### `gogs pr diff`

查看 PR 的 diff。

```bash
gogs pr diff --repo <owner/repo> --number <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--number` | integer | **是** | PR 编号 |

返回的是 unified diff 格式的文本。可以用 `--output` 保存到文件：

```bash
gogs pr diff --repo xing/gogs-agent --number 99 --output pr-99.diff
```

---

## 评论命令

评论功能对 issue 和 PR 都适用。Gogs 内部把 PR 当作一种特殊的 issue，所以它们共用同一套评论 API。

### `gogs comment list`

查看 issue 或 PR 下的评论列表。

```bash
gogs comment list --repo <owner/repo> --type issue|pr --number <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--type` | string | **是** | `issue` 或 `pr` |
| `--number` | integer | **是** | Issue 或 PR 编号 |

### `gogs comment create`

在 issue 或 PR 下添加评论。

```bash
gogs comment create --repo <owner/repo> --type issue|pr --number <n> --body "..."
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--type` | string | **是** | `issue` 或 `pr` |
| `--number` | integer | **是** | Issue 或 PR 编号 |
| `--body` | string | **是** | 评论内容（支持 Markdown） |

**示例：**

```bash
gogs comment create \
  --repo xing/gogs-agent \
  --type pr \
  --number 99 \
  --body "## Review\n\n- [x] 代码没问题\n- [ ] 补一下测试"
```

---

## 标签命令

### `gogs label list`

列出仓库的所有标签。

```bash
gogs label list --repo <owner/repo>
```

没有额外参数。

**示例：**

```bash
gogs label list --repo xing/gogs-agent --format markdown
```

### `gogs label get`

按 ID 获取单个标签的详情。

```bash
gogs label get --repo <owner/repo> --id <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | integer | **是** | 标签 ID |

**示例：**

```bash
gogs label get --repo xing/gogs-agent --id 5
```

### `gogs label create`

创建新标签。不指定颜色的话会从预设色板里自动挑一个。

```bash
gogs label create --repo <owner/repo> --name "..." [--color hex]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--name` | string | **是** | 标签名 |
| `--color` | string | 否 | 十六进制颜色（如 `#ee0701`），不填则从预设色板中自动选取 |

**示例：**

```bash
gogs label create --repo xing/gogs-agent --name "二期" --color "#0e8a16"
```

### `gogs label update`

更新标签的名字或颜色。`--name` 和 `--color` 至少填一个。

```bash
gogs label update --repo <owner/repo> --id <n> [--name "..."] [--color hex]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | integer | **是** | 标签 ID |
| `--name` | string | 否 | 新名字 |
| `--color` | string | 否 | 新颜色 |

**示例：**

```bash
# 只改名
gogs label update --repo xing/gogs-agent --id 3 --name "严重"

# 只改色
gogs label update --repo xing/gogs-agent --id 3 --color "#ee0701"

# 同时改名改色
gogs label update --repo xing/gogs-agent --id 3 --name "紧急" --color "#d93f0b"
```

### `gogs label delete`

按 ID 删除标签。

```bash
gogs label delete --repo <owner/repo> --id <n>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | integer | **是** | 标签 ID |

**示例：**

```bash
gogs label delete --repo xing/gogs-agent --id 8
```

---

## 仓库命令

### `gogs repo info`

查看仓库信息——名字、描述、默认分支、克隆地址等等。

```bash
gogs repo info --repo <owner/repo>
```

没有额外参数。

**示例：**

```bash
gogs repo info --repo xing/gogs-agent
```

### `gogs repo create`

在你的账户下创建新仓库，会自动初始化 README。

```bash
gogs repo create --name <name> [--description "..."] [--private]
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--name` | string | **是** | 仓库名（创建在你的用户名下） |
| `--description` | string | 否 | 仓库描述 |
| `--private` | flag | 否 | 设为私有仓库（默认公开） |

**示例：**

```bash
gogs repo create --name my-new-project --description "新的开始" --private
```

---

## 输出格式

### JSON（默认格式）

结构化的单行 JSON，适合程序解析。

```json
{"ok":true,"data":{"id":1,"number":42,"title":"修复登录 bug","state":"open",...}}
```

### Markdown

人类可读的表格和链接。列表类结果（issue 列表、PR 列表等）会渲染成表格，后面附带一个可折叠的 JSON 块。单个实体则显示关键字段加 JSON 块。

```markdown
**Status**: ✅ Success

| # | Title | State | Labels | Comments |
|---|-------|-------|--------|----------|
| 42 | [修复登录 bug](https://...) | open | bug, 紧急 | 3 |

```json
[...]
```
```

### Text

带缩进的格式化 JSON，2 空格缩进。

```json
{
  "ok": true,
  "data": {
    ...
  }
}
```

---

## 完整工作流示例

从发现 bug 到修完合并的全流程：

```bash
# 1. 给 bug 建 issue
gogs issue create \
  --repo xing/gogs-agent \
  --title "Bug: 空输入导致崩溃" \
  --body "复现步骤：..." \
  --labels "bug"

# 2. 讨论
gogs comment create --repo xing/gogs-agent --type issue --number 42 --body "我能复现这个问题。"

# 3. 创建修复分支（这是 git 操作，不是 gogs）
git checkout -b fix/empty-input main

# 4. 提交 PR
gogs pr create \
  --repo xing/gogs-agent \
  --title "Fix: 对空输入做防护" \
  --head fix/empty-input \
  --base main

# 5. 审查 diff
gogs pr diff --repo xing/gogs-agent --number 99

# 6. 评论通过
gogs comment create --repo xing/gogs-agent --type pr --number 99 --body "LGTM！"

# 7. 合并
gogs pr merge --repo xing/gogs-agent --number 99 --strategy squash

# 8. 关闭 issue
gogs issue close --repo xing/gogs-agent --number 42
```

---

## 错误码参考

| 错误码 | HTTP 状态 | 含义 |
|--------|-----------|------|
| `CONFIG_ERROR` | — | 配置缺失或无效（没配 API key、没指定仓库） |
| `VALIDATION_ERROR` | — | 命令参数不合法 |
| `API_ERROR` | 400 | 请求格式有误——检查输入 |
| `API_ERROR` | 401/403 | API token 无效或已过期 |
| `API_ERROR` | 404 | 资源不存在——仓库名、issue 或 PR 编号写错了 |
| `API_ERROR` | 409 | 冲突——合并冲突、标签名重复等 |
| `API_ERROR` | 422 | 无法处理——Gogs 端校验失败 |
| `API_ERROR` | 429 | 请求太频繁——客户端会自动重试最多 3 次 |
| `API_ERROR` | 5xx | 服务器错误——客户端重试一次后报错 |
| `NETWORK_ERROR` | — | 网络错误——超时、DNS 解析失败、连接被拒 |
| `INTERNAL_ERROR` | — | 意外错误——欢迎提 issue 报告 |
