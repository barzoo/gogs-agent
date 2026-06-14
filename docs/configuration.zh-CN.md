# 配置指南

`gogs-agent` 会从多个地方加载配置，按优先级合并。个人的全局设置配一次就好，项目有特殊需要时再单独覆盖，临时变动用 CLI 参数。

## 配置是怎么生效的

```
CLI --参数  >  环境变量  >  项目 .env  >  用户 ~/.gogs/config.json  >  内置默认值
```

越靠左优先级越高。打个比方：你在 `~/.gogs/config.json` 里配了 API token，同时在命令行传了 `--repo`，那 `--repo` 用命令行的值，API token 还是走用户配置。每个配置项是独立判定的，互不干扰。

这种分层设计的实际效果是：

- **一次配好**——把 API token 和服务器地址写在 `~/.gogs/config.json`，之后就不用管了
- **按项目覆盖**——某个项目需要不同的值？放个 `.env` 文件就行
- **临时变动**——比如偶尔想看 Markdown 格式输出，加个 `--format markdown` 即可

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `GOGS_API_KEY` | **是** | — | Gogs API token，在 `https://<你的gogs>/user/settings/applications` 生成 |
| `GOGS_BASE_URL` | 否 | `https://git.desiyi.com/api/v1` | Gogs 实例的 API 地址 |
| `GOGS_DEFAULT_REPO` | 否 | — | 默认仓库，格式 `owner/repo`。设了之后不用每次都敲 `--repo` |
| `GOGS_TIMEOUT` | 否 | `30000` | HTTP 请求超时时间（毫秒） |
| `GOGS_VERBOSE` | 否 | `false` | 设为 `true` 时会在 stderr 输出诊断日志 |
| `GOGS_OUTPUT` | 否 | — | 默认输出文件路径，可以用命令行的 `--output` 覆盖 |

---

## 用户配置（`~/.gogs/config.json`）

API token 和服务器地址这些东西是你个人的，跟项目无关，所以最适合放在用户级配置文件里——一次配好，所有项目通用：

```json
{
  "apiKey": "你的_gogs_api_token",
  "baseUrl": "https://git.desiyi.com/api/v1"
}
```

文件位置：`~/.gogs/config.json`。`~` 就是你的用户主目录，Windows、macOS、Linux 都一样。

**为什么要这样设计？** `GOGS_API_KEY` 和 `GOGS_BASE_URL` 是你个人的 credential，不会因为换了项目就变。在这里配一次，就不用每个项目里都放 `.env` 文件了。项目特有的设置（比如 `GOGS_DEFAULT_REPO`）放在项目的 `.env` 文件里就好——它们的优先级比用户配置高。

| 字段 | 类型 | 说明 |
|------|------|------|
| `apiKey` | string | Gogs API token |
| `baseUrl` | string | Gogs 实例的 API 地址 |

两个字段都是可选的——没写的项会自动落到下一优先级。

---

## 项目 `.env` 文件

在项目目录下放个 `.env` 文件，用来配置项目特有的设置：

```bash
GOGS_DEFAULT_REPO=你的组织/你的仓库
# 需要的话也能在这里覆盖 token 或服务器地址：
# GOGS_API_KEY=这个项目专用的_token
# GOGS_BASE_URL=https://另一台-gogs.example.com/api/v1
```

新项目可以从模板开始：

```bash
cp .env.example .env
# 编辑 .env，填上你的值
```

`.env` 里的值会覆盖 `~/.gogs/config.json`，但可以被环境变量和 CLI 参数进一步覆盖。

---

## CLI 参数

下面这些参数在所有命令里都能用：

| 参数 | 说明 |
|------|------|
| `--repo <owner/repo>` | 目标仓库（覆盖 `GOGS_DEFAULT_REPO`） |
| `--format <fmt>` | 输出格式：`json`（默认）、`markdown` 或 `text` |
| `--output <path>` | 把输出写到文件，而不是打印到终端 |
| `--verbose` | 在 stderr 输出诊断日志 |

`--repo` 参数的格式是 `owner/repo`，比如 `xing/gogs-agent` 或 `myorg/backend`。

---

## 输出格式自动推断

用 `--output` 指定输出文件时，格式会**根据文件扩展名自动判断**：

| 扩展名 | 输出格式 |
|--------|----------|
| `.json` | `json` |
| `.md`、`.markdown` | `markdown` |
| `.txt`、`.text` | `text` |
| （其他） | 回退到 `--format` 或默认的 `json` |

注意扩展名的优先级比 `--format` 高。如果你这样写：

```bash
gogs issue list --repo myorg/myrepo --format json --output issues.md
```

`issues.md` 文件里会是 Markdown——因为 `.md` 扩展名赢了 `--format json`。

---

## 启动校验

`gogs-agent` 启动时会检查两件事：

- **缺少 `GOGS_API_KEY`** → 退出码 1：`"GOGS_API_KEY is required. Set it via ~/.gogs/config.json, project .env, or environment variable."`
- **缺少 `--repo` 且没设 `GOGS_DEFAULT_REPO`** → 退出码 1：`"--repo <owner/repo> is required."`

---

## 退出码

| 退出码 | 含义 |
|--------|------|
| `0` | 成功 |
| `1` | 配置或参数校验错误 |
| `2` | Gogs API 错误（HTTP 非 2xx 响应） |
| `3` | 网络错误（超时、DNS 解析失败、连接被拒） |

写脚本时记得检查退出码：

```bash
if gogs issue list --repo myorg/myrepo --state open > issues.json; then
    echo "OK"
else
    echo "失败 (退出码 $?)"
fi
```

---

## API 鉴权

`gogs-agent` 通过 Gogs API token 鉴权：

1. 登录你的 Gogs 实例
2. 进入 **Settings → Applications**
3. 生成新 token，赋予读写权限以使用完整功能
4. 通过以下任一种方式设置：`~/.gogs/config.json`、环境变量、或项目 `.env`

每次 API 请求都会带上 `Authorization: token <apiKey>` 请求头。

---

## API 兼容性

`gogs-agent` 面向 **Gogs REST API v1**，该 API 从 Gogs v0.12 起稳定。如果你在用较新版本的 Gogs（v0.12 及以上，直到[最新版本](https://github.com/gogs/gogs/releases)），所有功能都能正常工作。

| 项目 | 版本 |
|------|------|
| [Gogs](https://gogs.io)（[GitHub](https://github.com/gogs/gogs)） | ≥ v0.12（API v1 稳定） |
| API 路径前缀 | `/api/v1`（通过 `GOGS_BASE_URL` 配置） |
| 本工具测试环境 | Gogs v0.13+ |

如果你在用更早的 Gogs（v0.12 之前），部分接口可能不存在或行为不同。API v1 在 Gogs v0.11 引入，但到 v0.12 才完全稳定——遇到意外错误时，建议先检查 Gogs 版本。

---

## HTTP 客户端行为

底层 HTTP 客户端自动处理了一些事：

- **超时：** 通过 `GOGS_TIMEOUT` 配置（默认 30 秒）。超时的请求会作为 `NetworkError` 中止。
- **重试：** GET 请求遇到临时性错误会自动重试：
  - `429 Too Many Requests`——指数退避（1s、2s、4s），最多重试 3 次
  - `5xx 服务器错误`——等 1 秒后重试一次
  - `4xx 客户端错误`（429 除外）——不重试，立即报错
- **分页：** 客户端会读取响应头中的 `X-Total` 和 `X-Page`，通过 `GogsResponse.pagination` 暴露出来。
- **日志：** 开启 `--verbose` 后，每次请求的方法、路径、状态码和耗时都会打印到 stderr。
