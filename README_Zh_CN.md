# obshare-cli

一个将 Obsidian Markdown 文档上传到飞书云文档的命令行工具。

[![PyPI version](https://badge.fury.io/py/obshare-cli.svg)](https://badge.fury.io/py/obshare-cli)
[![Python](https://img.shields.io/pypi/pyversions/obshare-cli.svg)](https://pypi.org/project/obshare-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 安装

![pip-install-obshare-cli](./assets/obshare-cli.gif)

如果需要配合 `obsidian-plugins` 使用，推荐将 `obshare-cli` 安装到名为 `obsd` 的独立 conda 环境中。

```bash
conda create -n obsd python -y
conda run -n obsd python -m pip install --upgrade pip
conda run -n obsd python -m pip install --upgrade obshare-cli
```

### 可选：Mermaid 图表支持

`obshare-cli` 支持两种 Mermaid 渲染方式：

1. 本地 Mermaid CLI 渲染：

```bash
npm install -g @mermaid-js/mermaid-cli
```

2. 通过 `obsidian-plugins/` 中附带的 Obsidian 配套插件进行桥接渲染。

Obsidian 插件必须与 `obshare-cli` 配合使用。它不会替代 CLI 的上传流程，而是提供可视化环境配置、文档与配置管理，以及在真实 Obsidian 环境中的 Mermaid 渲染能力。

## 配置

首先，配置你的飞书凭证：

你可以通过以下指南获取这些令牌：

> [飞书配置指南](./assets/feishu_config.png)

```bash
# 设置 App ID
conda run -n obsd obshare-cli config set-app-id "cli_xxx"

# 设置 App Secret
conda run -n obsd obshare-cli config set-app-secret "xxx"

# 设置 User ID
conda run -n obsd obshare-cli config set-user-id "xxx"

# 设置文件夹 Token
conda run -n obsd obshare-cli config set-folder "xxxxxxx"

# 查看当前配置
conda run -n obsd obshare-cli config show

# 测试连接
conda run -n obsd obshare-cli config test
```

## Obsidian 配套插件

`obsidian-plugins` 是 `obshare-cli` 的 Obsidian 桌面配套插件，设计目标是与 `obshare-cli` 共同使用，而不是作为独立上传器单独运行。

它提供：

- 简单的可视化环境配置
- 共享的文档与配置管理
- Mermaid 渲染桥接能力，可让 `obshare-cli` 调用 Obsidian 返回 Mermaid PNG 图片

### 快速开始

1. 创建推荐的 conda 环境并安装 `obshare-cli`：

```bash
conda create -n obsd python -y
conda run -n obsd python -m pip install --upgrade pip
conda run -n obsd python -m pip install --upgrade obshare-cli
```

2. 将 `obsidian-plugins/` 复制到你的 Vault 插件目录：`.obsidian/plugins/obshare-cli/`
3. 在 Obsidian 中启用该插件
4. 在插件设置中选择 `conda (obsd)` 运行时，并设置共享 bridge 目录
5. 在 `obshare-cli` 中配置相同的 Obsidian 桥接参数：

```bash
conda run -n obsd obshare-cli config set-obsidian-cli obsidian
conda run -n obsd obshare-cli config set-obsidian-bridge-dir /path/to/shared/bridge
conda run -n obsd obshare-cli config set-obsidian-command-id obshare-cli:process-render-request
```

完成后，继续使用正常的 CLI 上传流程：

```bash
conda run -n obsd obshare-cli upload document.md
```

当文档中检测到 Mermaid 代码块时，`obshare-cli` 就可以通过 Obsidian 插件桥接完成图片渲染，并继续后续上传流程。

## 使用方法

### 上传文档

```bash
# 基本上传
conda run -n obsd obshare-cli upload document.md

# 以 JSON 格式输出（适用于 AI 代理）
conda run -n obsd obshare-cli upload document.md --json

# 上传并设置权限
conda run -n obsd obshare-cli upload document.md --public --allow-copy --allow-download
```

### 查看上传历史

```bash
conda run -n obsd obshare-cli list history
conda run -n obsd obshare-cli list history --json
```

### 设置文档权限

```bash
conda run -n obsd obshare-cli permission set <token> --public --allow-copy --allow-download
```

### 删除文档

```bash
conda run -n obsd obshare-cli delete <token>
```

## JSON 输出示例

```json
{
  "success": true,
  "document": {
    "title": "我的笔记",
    "token": "doxcnAbcDefGhi",
    "url": "https://feishu.cn/docx/doxcnAbcDefGhi"
  },
  "permissions": {
    "isPublic": false,
    "allowCopy": false,
    "allowCreateCopy": false
  },
  "uploadTime": "2024-01-15T10:30:00Z"
}
```

## 功能特性

- 将 Markdown 文档上传到飞书
- 支持 YAML frontmatter
- 支持 Obsidian Callouts（标注块）
- 支持 Mermaid 图表（转换为图片）
- 可选的 Obsidian 配套插件，提供可视化配置和 Mermaid 桥接渲染
- 支持嵌入图片（Obsidian `![[image.png]]` 和 Markdown `![](image.png)` 格式）
- 可配置的文档权限
- 上传历史记录追踪
- JSON 输出模式，便于 AI/CLI 集成

## Claude Code 插件

本项目包含 Claude Code 插件，支持 AI 辅助使用。插件提供环境设置、配置、上传笔记、管理权限和查看上传历史等技能。

### 安装插件

```bash
# 第一步：添加 marketplace
/plugin marketplace add SuShuHeng/obshare-cli

# 第二步：安装插件
/plugin install obshare-cli
```

### 可用技能

| Skill | 调用方式 | 描述 |
|-------|----------|------|
| 主技能 | `/obshare-cli:obshare-cli` | 环境设置和 CLI 概述 |
| 配置 | `/obshare-cli:config` | 管理飞书配置 |
| 上传 | `/obshare-cli:upload` | 上传文档到飞书 |
| 权限 | `/obshare-cli:permission` | 管理文档权限 |
| 列表 | `/obshare-cli:list` | 查询上传历史 |
| 删除 | `/obshare-cli:delete` | 删除飞书文档 |

### 在 Claude Code 中使用

```bash
# 在 Claude Code 中，使用插件命名空间调用技能
/obshare-cli:obshare-cli     # 获取环境设置指南
/obshare-cli:config          # 配置飞书凭证
/obshare-cli:upload note.md  # 上传文档
/obshare-cli:list            # 查看上传历史
```

### 本地开发

本地测试插件：

```bash
claude --plugin-dir /path/to/obshare-cli
```

## 系统要求

- Python 3.8+
- Node.js >= 16（可选，用于 Mermaid 渲染）

## 开发

```bash
# 克隆仓库
git clone https://github.com/SuShuHeng/obshare-cli.git
cd obshare-cli

# 以开发模式安装
pip install -e ".[dev]"

# 运行测试
pytest

# 构建包
python -m build
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE)。

## 作者

苏书恒 (code.sushuheng@gmail.com)

## 致谢

- [Obsidian](https://obsidian.md) - 最好的 AI 驱动笔记软件

- [飞书开放平台](https://open.feishu.cn) - 提供技术平台支持
- [ObShare](https://github.com/xigua222/ObShare) - 本项目的重要参考来源，感谢！

## 链接

- [ObShare 配置文档](https://itlueqqx8t.feishu.cn/docx/XUJmdxbf7octOFx3Vt0c3KJ3nWe)

- [GitHub 仓库](https://github.com/SuShuHeng/obshare-cli)
- [PyPI 包](https://pypi.org/project/obshare-cli/)
- [问题反馈](https://github.com/SuShuHeng/obshare-cli/issues)
