# obshare-cli

一个将 Obsidian Markdown 文档上传到飞书云文档的工作流，推荐形态是 `obshare-cli` 命令行与仓库自带的 Obsidian 配套插件联合使用。

`V0.2.0` 开始，Obsidian 配套插件成为主分享界面：你可以直接从命令面板、文件右键菜单或 Ribbon 按钮触发分享，而 `obshare-cli` 仍然负责真正的上传执行。

[![PyPI version](https://badge.fury.io/py/obshare-cli.svg)](https://badge.fury.io/py/obshare-cli)
[![Python](https://img.shields.io/pypi/pyversions/obshare-cli.svg)](https://pypi.org/project/obshare-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [English README](./README.md)
>
> `mermaid-cli` 渲染链路已经移除。当前受支持的 Mermaid 方案只有 `obshare-cli` -> Obsidian CLI -> `obsidian-plugins` bridge -> PNG 上传。

![pip-install-obshare-cli](./assets/obshare-cli.gif)

## 推荐安装形态

当前仓库可以理解成 3 层能力：

- `obshare-cli`：负责上传 Markdown、管理权限、查询历史，以及输出 JSON 结果
- `obsidian-plugins/`：必装的桌面配套插件，负责笔记直连分享、运行时绑定、共享配置/历史，以及 Mermaid 渲染
- Claude Code plugin skills：给 Claude Code 提供可调用技能，把同一条 Obsidian 发布链路智能体化

如果你希望按项目当前受支持的方式使用，请把 CLI 和 Obsidian 插件一起安装。

## 5 分钟快速开始

### 1. 创建推荐的 `obsd` conda 环境

```bash
conda create -n obsd python -y
conda run -n obsd python -m pip install --upgrade pip
conda run -n obsd python -m pip install --upgrade obshare-cli
conda run -n obsd obshare-cli --version
```

### 2. 安装 Obsidian 配套插件

1. 将 [`obsidian-plugins/`](./obsidian-plugins/) 复制到你的 Vault 插件目录，目标路径为 `.obsidian/plugins/obshare-cli/`
2. 在 Obsidian 中启用 `obshare-cli`
3. 在测试 CLI bridge 之前，先将 Obsidian 更新到最新安装器版本
4. 进入 `设置 -> 关于 -> 高级`，开启 `命令行界面`
5. 点击 `注册`，将 `obsidian` 命令注册到 PATH，确保终端里可以直接调用
6. 打开插件设置
7. 在 `Environment Configuration` 中选择 `conda (obsd)` 运行时
8. 设置一个 Obsidian 与 `obshare-cli` 都能访问到的共享 bridge 目录

可参考下面两张界面截图：

![Obsidian 关于 高级 命令行界面](./assets/obsidian-cli-%E5%85%B3%E4%BA%8E-%E9%AB%98%E7%BA%A7-%E5%91%BD%E4%BB%A4%E8%A1%8C%E7%95%8C%E9%9D%A2.png)

![Obsidian CLI 注册环境变量](./assets/obsidian-cli-%E6%B3%A8%E5%86%8C%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F.png)

插件界面的更多说明见 [`obsidian-plugins/README.md`](./obsidian-plugins/README.md)。

### 3. 在 CLI 中配置飞书凭证

你需要先从飞书开放平台应用和目标文件夹中拿到这些值。

> [飞书配置指南](./assets/feishu_config.png)

```bash
conda run -n obsd obshare-cli config set-app-id "cli_xxx"
conda run -n obsd obshare-cli config set-app-secret "xxx"
conda run -n obsd obshare-cli config set-user-id "ou_xxx"
conda run -n obsd obshare-cli config set-folder "fldcnxxx"
```

### 4. 在 CLI 侧补全 Obsidian bridge 配置

这里的 bridge 目录必须与插件设置里填写的目录一致。

```bash
conda run -n obsd obshare-cli config set-obsidian-cli obsidian
conda run -n obsd obshare-cli config set-obsidian-bridge-dir /path/to/shared/bridge
conda run -n obsd obshare-cli config set-obsidian-command-id obshare-cli:process-render-request
conda run -n obsd obshare-cli config show
conda run -n obsd obshare-cli config test
```

### 5. 上传第一篇笔记

```bash
conda run -n obsd obshare-cli upload note.md
conda run -n obsd obshare-cli --json upload note.md
```

如果笔记里包含 Mermaid 代码块，`obshare-cli` 会把渲染请求写入 bridge 目录，调用 `obsidian command id=obshare-cli:process-render-request`，等待插件返回 PNG，再继续把最终文档上传到飞书。

### 6. 直接在 Obsidian 中分享

当飞书配置和 bridge 设置完成后，`V0.2.0` 支持直接在 Obsidian 内分享当前笔记。

可用入口：

- 命令面板：`Share Current Note To Feishu`
- 文件右键菜单：`Share To Feishu`
- Ribbon 按钮：`Share To Feishu`

分享行为：

- 如果当前笔记有未保存修改，插件会先阻断流程并提示你保存。
- 上传前会先确认分享权限。
- 上传过程中会显示阶段性进度条。
- 成功后会展示飞书链接，并支持复制或浏览器打开。
- 失败后会展示错误摘要，并支持把 `.log` 日志导出到你选择的文件夹。

## 命令速查

`--json` 是全局参数，必须放在子命令前面，例如 `obshare-cli --json upload note.md`。

| 命令 | 作用 |
|------|------|
| `obshare-cli config set-app-id <app_id>` | 保存飞书 App ID |
| `obshare-cli config set-app-secret <app_secret>` | 保存飞书 App Secret |
| `obshare-cli config set-user-id <user_id>` | 保存飞书用户 ID |
| `obshare-cli config set-folder <folder_token>` | 保存目标飞书文件夹 |
| `obshare-cli config set-obsidian-cli <command>` | 保存 Obsidian CLI 命令名或绝对路径 |
| `obshare-cli config set-obsidian-bridge-dir <dir>` | 保存共享 bridge 目录 |
| `obshare-cli config set-obsidian-command-id <id>` | 保存渲染命令 ID |
| `obshare-cli config show` | 查看当前配置，敏感值会被遮罩 |
| `obshare-cli config test` | 测试飞书连接 |
| `obshare-cli upload <file>` | 上传单个 Markdown 笔记 |
| `obshare-cli list history` | 查看本地上传历史 |
| `obshare-cli permission set <token> ...` | 更新分享权限 |
| `obshare-cli delete <token>` | 删除飞书文档 |

常用后续命令：

```bash
conda run -n obsd obshare-cli list history
conda run -n obsd obshare-cli --json list history
conda run -n obsd obshare-cli permission set <token> --public --allow-copy --allow-download
conda run -n obsd obshare-cli delete <token>
```

## 共享状态与 Mermaid Bridge

CLI 与 Obsidian 插件共享同一套本地状态：

- `~/.obshare/config.json`：保存飞书凭证与 Obsidian bridge 设置
- `~/.obshare/history.json`：保存上传历史，CLI 与插件界面都会读取

当前代码里的 Mermaid 渲染链路只有 bridge 这一条：

1. `obshare-cli` 识别 Markdown 中的 Mermaid 代码块
2. CLI 在共享 bridge 目录中写入 `*.request.json`
3. CLI 通过 Obsidian CLI 触发 `obshare-cli:process-render-request`
4. Obsidian 插件完成渲染并写回 `*.result.json` 和 PNG
5. CLI 将渲染后的 PNG 与正文一起上传到飞书

## Obsidian 配套插件

仓库中的 Obsidian 插件是 `obshare-cli` 的桌面配套外壳，也是主直连分享界面，不是另一套独立的飞书实现。

它提供：

- 直接从 Obsidian 分享当前笔记到飞书
- `Environment Configuration`：探测 `conda`、`obsd`、Python、pip、Obsidian CLI 与 `obshare-cli`
- `Upload Configuration`：直接编辑共享 CLI 配置并执行连接测试
- `Document Management`：读取上传历史，并通过 CLI 分发删除/权限更新
- `About`：显示插件与 CLI 版本、语言切换与升级提示

插件细节请看 [`obsidian-plugins/README.md`](./obsidian-plugins/README.md)。

## Claude Code Plugin Skills

仓库还自带 Claude Code plugin，入口在 [`.claude-plugin/`](./.claude-plugin/) 与 [`skills/`](./skills/)。它的定位不是替代 CLI，而是把同一套 `obshare-cli + Obsidian 插件` 工作流暴露为 Claude 可调用的技能，让 Obsidian 发布流程具备智能体能力。

### 从 marketplace 安装

```bash
/plugin marketplace add SuShuHeng/obshare-cli
/plugin install obshare-cli
```

### 可用技能

| Skill | 调用方式 | 适用场景 |
|-------|----------|----------|
| 主技能 | `/obshare-cli:obshare-cli` | 初始化 `obsd`、了解命令面并决定下一步 |
| 配置 | `/obshare-cli:config` | 配置飞书凭证与 Obsidian bridge |
| 上传 | `/obshare-cli:upload` | 上传笔记到飞书 |
| 列表 | `/obshare-cli:list` | 查看本地上传历史 |
| 权限 | `/obshare-cli:permission` | 更新文档分享权限 |
| 删除 | `/obshare-cli:delete` | 根据 token 删除飞书文档 |

### 在 Claude Code 中使用

```bash
/obshare-cli:obshare-cli
/obshare-cli:config
/obshare-cli:upload note.md
/obshare-cli:list
```

这些 skills 适合把你的 Obsidian 发布流程接入 Claude Code 智能体，但底层仍然复用同一套 `obshare-cli` 命令、共享配置、共享历史与 Obsidian bridge。

### 本地开发

```bash
claude --plugin-dir /path/to/obshare-cli
```

## 系统要求

- Python 3.8+
- Conda，推荐环境名为 `obsd`
- Obsidian 桌面端，以及可调用的 `obsidian` CLI 命令，或通过 `set-obsidian-cli` 配置其绝对路径
- 飞书开放平台凭证与目标文件夹 Token

## 开发

```bash
git clone https://github.com/SuShuHeng/obshare-cli.git
cd obshare-cli
pip install -e ".[dev]"
pytest
python -m build
```

## 许可证

MIT License，详见 [LICENSE](LICENSE)。

## 作者

苏书恒 (code.sushuheng@gmail.com)

## 致谢

- [Obsidian](https://obsidian.md)
- [飞书开放平台](https://open.feishu.cn)
- [ObShare](https://github.com/xigua222/ObShare)

## 链接

- [ObShare 配置文档](https://itlueqqx8t.feishu.cn/docx/XUJmdxbf7octOFx3Vt0c3KJ3nWe)
- [GitHub 仓库](https://github.com/SuShuHeng/obshare-cli)
- [PyPI 包](https://pypi.org/project/obshare-cli/)
- [问题反馈](https://github.com/SuShuHeng/obshare-cli/issues)
