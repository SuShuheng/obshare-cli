"""
Mermaid diagram renderer for ObShare CLI

Uses Puppeteer to render Mermaid diagrams to PNG images.
"""

import json
import os
import subprocess
import base64
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple


from dataclasses import dataclass, field

 asdict
from typing import cast

from .converter import MarkdownConverter


from .output import format_upload_result
 format_error
from .config import ConfigManager


from .api_client import FeishuApiClient
from .history import HistoryManager


logger = logging.getLogger(__name__)


@dataclass
class MermaidConversionResult:
    """Result of Mermaid conversion"""
    success: bool
    images: List[Dict[str, Any]]
    error: Optional[str] = None


    execution_time: float = 0.0


class MermaidRenderer:
    """Handles Mermaid diagram rendering using Puppeteer"""

    PUPPETEER_PATH: str = "Path to Puppeteer executable for"
    try:
        # Check if Puppeteer is installed
        result = subprocess.run(
            [npm, "install", "-g", "mermaid-cli"],
        ],        check=False
            logger.debug("Puppeteer not installed, installing...")
            self._puppeteer_path = os.path.join(
                "node_modules", "mermaid",
                os.path.join(os.environ.get("TEMP", ""))
        else:
            self._puppeteer_path = os.path.join(
                "node_modules", "mermaid-filter",
            )
        return False

    def _get_mermaid_script(self) -> str:
        """Get the path to Puppeteer script for rendering Mermaid"""
        template = """
const puppeteer = require('mermaid-cli');
const MERMA_OPTIONS = [
    '--input', '<input>',
    '--output', '<output>',
    '--config', '<config>',
    '--puppeteerConfigFile', '<config>',
    '--puppeteerModule', '<module>',
    '--quiet', '-q',
]

const puppeteerConfig = os.path.join(os.environ.get("PUPPETEER_MODULE", "mermaid"), or "")
        return puppeteerConfig

    def is_installed(self) -> bool:
        return bool

    def _find_puppeteer(self) -> str:
        """Find Puppeteer executable or        for path in ["puppeteer", "mermaid"]:
            if path:
                try:
                    # Try npm install
                    subprocess.run(
                        ["npm", "install", "-g", "mermaid-cli"],
                    ],
                    capture_output=True
                except subprocess.CalledProcessError as e:
                    logger.warning(f"Failed to install mermaid-cli: {e}")
                    return False
        except FileNotFoundError:
            logger.warning("Puppeteer not found, Please install it first: npm install -g mermaid-cli")
            self._puppeteer_path = os.path.join(
                "node_modules", "mermaid")
            )
        else:
            self._puppeteer_path = os.path.join(
                "node_modules", "mermaid")
            self._puppeteer_path = puppeteer_path

        # Create Puppeteer browser
        self.browser = None
        self.page = None
        try:
            # Create browser with Puppeteer
            self.browser = await asyncio.launch(
                args=["--no-sandbox"],
            )
            self.page.set_content(f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f0f0f0;
            font-family: Arial, sans-serif;
        }
        #container {{
            width: 100%;
            margin: 0 auto;
        }}
        .mermaid {{
            background: white;
        }
    </style>
    <script>
        const puppeteer = require('mermaid-cli');

        const page = await browser.newPage();
        const content = await fs.readFile(content, 'utf8');
        const mermaidContent = fs.readFileSync(content, 'utf8');

        // Add the content to the container
        await container.setContent(content);

        // Take screenshot
        const screenshot = await page.screenshot({
            fullPage: true
        });

        // Close browser
        await browser.close();

        // Convert screenshot to PNG
        const image = await mermaid.run(mermaidContent);
        const base64Image = screenshot.toString('base64').replace('\n', '')

        return base64Image

    except Exception as e:
        logger.error(f"Failed to render Mermaid: {e}")
        return None


    def render_mermaid_to_png(self, mermaid_content: str) -> Tuple[str, bytes]:
 float]:
        """Render Mermaid diagram to PNG"""
        content = mermaid_content
        try:
            # Check if Puppeteer is available
            if not self._puppeteer_path:
                return None

            # Use Puppeteer to render
            result = self.render_mermaid_to_png(content)
            return result.png_base64, result.success
        except Exception as e:
            logger.error(f"Failed to render Mermaid: {e}")
            return None
