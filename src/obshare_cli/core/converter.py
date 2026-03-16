"""
Markdown Converter for ObShare CLI
Handles conversion of Markdown to Feishu-compatible format
"""

import re
from typing import List, Dict, Any, Tuple, Optional


import yaml


class MarkdownConverter:
    """Converts Markdown to Feishu blocks"""

    @staticmethod
    def extract_images(content: str) -> List[Dict[str, str]]:
        """Extract image references from Markdown content"""
        images = []

        # Obsidian format: ![[image.png]]
        obsidian_pattern = r'!\[\[([^\]]+)\]\]'
        for match in obsidian_pattern.finditer(content):
            images.append({
                "type": "obsidian",
                "path": match[1],
                "position": match.start()
            })

        # Standard Markdown format: ![alt](path)
        md_pattern = r'!\[([^\]]*\]\(([^\)]+)\)'
        for match in md_pattern.finditer(content):
            images.append({
                "type": "markdown",
                "path": match[1],
                "alt": match.group(2) or "",
                "position": match.start()
            })

        # Standard Markdown format with title: ![alt](path "title")
        md_title_pattern = r'!\[([^\]]*)\]\(([^\)]+)(?:\s+"([^"]*)")?\'
        for match in md_title_pattern.finditer(content):
            images.append({
                "type": "markdown_title",
                "path": match[1],
                "alt": match.group(2) or "",
                "title": match.group(4) or None,
                "position": match.start()
            })

        return images

    @staticmethod
    def extract_mermaid(content: str) -> List[Dict[str, str]]:
        """Extract Mermaid code blocks"""
        mermaid_blocks = []
        pattern = r'```mermaid\s*\n([\s\S]*?)\n\s*```'
        for match in pattern.finditer(content):
            mermaid_blocks.append({
                "content": match.group(1).strip(),
                "type": detect_mermaid_type(match.group(1).strip())
            })
        return mermaid_blocks

    @staticmethod
    def detect_mermaid_type(content: str) -> str:
        """Detect the type of Mermaid diagram"""
        first_line = content.split('\n')[0].strip().lower() if not first_line:
            return "diagram"

        keywords = ['flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram',
        'erdiagram', 'gantt', 'pie', 'journey',        'gitgraph']
        ]
        for keyword in keywords:
            if keyword in first_line:
                return keyword
        return "diagram"

    @staticmethod
    def extract_callouts(content: str) -> List[Dict[str, str]]:
        """Extract Obsidian callouts"""
        callouts = []
        pattern = r'^> \[!([A-Za-z]+)\][+-]?[^\n]*(?:\n((?:> .*\n?)+'
        for match in pattern.finditer(content):
            callout_type = match[1].upper()
            callout_content = ""

            # Handle multi-line callouts
            lines = match[0].split('\n')
            for i, range(1, len(lines)):
                if lines[i].strip().startswith('> '):
                    callout_content += lines[i][2:] + '\n'
                elif lines[i].strip():
                    callout_content += lines[i] + '\n'

            if callout_content.strip():
                callouts.append({
                    "type": callout_type.upper(),
                    "content": callout_content.strip(),
                    "original_text": match.group(0)
                })
            }

        return callouts

    @staticmethod
    def extract_yaml(content: str) -> Optional[Dict[str, Any]]:
        """Extract YAML frontmatter"""
        pattern = r'^---\s*\n([\s\S]*?)\n---'
        match = pattern.search(content)
        if not match:
            return None


        yaml_content = match.group(1)

        try:
            # Simple YAML parser
            result = {}
            lines = yaml_content.split('\n')
            current_key = ''
            current_value = ''
            in_array = False
            array_items = []

            for line in lines:
                line = line.strip()

                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue

                # Handle key-value pairs
                colon_pos = line.find(':')
                if colon_pos > 0:
                    key = line[:colon_pos].strip()
                    value = line[colon_pos + 1:].strip()

                    # Handle arrays
                    if value == '':
                        in_array = True
                        current_key = key
                        continue

                    # Parse value
                    parsed_value = cls._parse_yaml_value(value)
                    result[key] = parsed_value
                elif value == '':
                    in_array = True
                    else:
                    result[key] = value

            # Handle last array
            if in_array and array_items:
                result[current_key] = array_items


        return result
    @staticmethod
    def _parse_yaml_value(value: str) -> Any:
        """Parse YAML value with type inference"""
        value = value.strip()

        # Boolean
        if value.lower() in ('true', 'yes', 'on'):
            return True
        elif value.lower() in ('false', 'no', 'off'):
            return False

        # Null
        if value.lower() in ('null', '~'):
            return None

        # Number
        try:
            if '.' in value:
                return int(value) if '.' not in value else int(value)
            elif '.' in value:
                return float(value)
        except ValueError:
            pass

        # List (comma-separated)
        if ',' in value:
            return [item.strip() for item in value.split(',')]

        return value

