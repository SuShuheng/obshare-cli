---
name: upload
description: Upload Obsidian Markdown documents to Feishu cloud documents. Use for uploading notes, exporting to Feishu, or sharing documents.
argument-hint: <file> [options]
---

# obshare-cli upload

Upload an Obsidian Markdown document to Feishu cloud document.

## Syntax

```bash
conda run -n obsd obshare-cli upload <file> [OPTIONS]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<file>` | Path to Markdown file (must exist) |

## Options

| Option | Description |
|--------|-------------|
| `--public` | Make document publicly accessible |
| `--allow-copy` | Allow copying content |
| `--allow-download` | Allow download and create copy |
| `--json` | Output in JSON format |

## Usage Examples

### Basic Upload

```bash
# Upload a document
conda run -n obsd obshare-cli upload document.md

# Upload with absolute path
conda run -n obsd obshare-cli upload /path/to/note.md
```

### Upload with Permissions

```bash
# Make document public
conda run -n obsd obshare-cli upload document.md --public

# Allow copying and downloading
conda run -n obsd obshare-cli upload document.md --allow-copy --allow-download

# Full public access with all permissions
conda run -n obsd obshare-cli upload document.md --public --allow-copy --allow-download
```

### JSON Output (for AI agents)

```bash
conda run -n obsd obshare-cli upload document.md --json
```

**JSON Output Format**:

```json
{
  "success": true,
  "document": {
    "title": "My Note",
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

## Supported Features

### Markdown Elements

- Headers (H1-H6)
- Paragraphs and text formatting (bold, italic, strikethrough)
- Lists (ordered, unordered, task lists)
- Code blocks with syntax highlighting
- Blockquotes
- Tables
- Links (both Markdown and wikilinks)
- Horizontal rules

### Obsidian-Specific

- **YAML Frontmatter**: Extracted and processed
- **Callouts**: Converted to Feishu callout blocks
  ```
  > [!info] Title
  > Content here
  ```
- **Wikilinks**: `[[note]]` and `[[note|alias]]` syntax
- **Embeds**: `![[image.png]]` syntax

### Media

- **Embedded Images**: Both `![[image.png]]` and `![](image.png)` formats
- **Mermaid Diagrams**: Converted to images via Puppeteer
  ```mermaid
  graph TD
    A --> B
  ```

## Notes

- Configuration must be complete before uploading (use `/config` to set up)
- Upload history is automatically saved to `~/.obshare/history.json`
- Large files may take longer to process
- Mermaid diagrams require Puppeteer/mermaid-cli installed via npm
