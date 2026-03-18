const { Plugin, Notice, MarkdownRenderer, Component, PluginSettingTab, Setting } = require("obsidian");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_SETTINGS = {
  bridgeDir: "",
  renderTimeoutMs: 10000,
  scale: 2,
  backgroundColor: "#ffffff",
};

class ObShareBridgeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Bridge directory")
      .setDesc("Shared directory readable by both obshare-cli and this Obsidian plugin.")
      .addText((text) =>
        text
          .setPlaceholder("/path/to/obshare-bridge")
          .setValue(this.plugin.settings.bridgeDir)
          .onChange(async (value) => {
            this.plugin.settings.bridgeDir = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Render timeout")
      .setDesc("Maximum time to wait for Mermaid SVG output.")
      .addText((text) =>
        text
          .setPlaceholder("10000")
          .setValue(String(this.plugin.settings.renderTimeoutMs))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
              this.plugin.settings.renderTimeoutMs = parsed;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}

module.exports = class ObShareCliPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.addSettingTab(new ObShareBridgeSettingTab(this.app, this));

    this.addCommand({
      id: "process-render-request",
      name: "Process next obshare-cli Mermaid render request",
      callback: async () => {
        await this.processNextRequest();
      },
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async processNextRequest() {
    if (!this.settings.bridgeDir) {
      new Notice("ObShare bridge directory is not configured.");
      throw new Error("Bridge directory is not configured.");
    }

    const requestPath = await this.findNextRequestPath();
    if (!requestPath) {
      new Notice("No pending ObShare render request found.");
      return;
    }

    const request = JSON.parse(await fs.readFile(requestPath, "utf8"));
    try {
      const renderResult = await this.renderMermaidToPng(request.mermaid);
      await fs.mkdir(path.dirname(request.outputPngPath), { recursive: true });
      await fs.writeFile(
        request.outputPngPath,
        Buffer.from(renderResult.pngBase64, "base64")
      );
      await fs.writeFile(
        request.resultPath,
        JSON.stringify(
          {
            status: "success",
            pngPath: request.outputPngPath,
            width: renderResult.originalWidth,
            height: renderResult.originalHeight,
          },
          null,
          2
        ),
        "utf8"
      );
    } catch (error) {
      await fs.writeFile(
        request.resultPath,
        JSON.stringify(
          {
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        ),
        "utf8"
      );
      throw error;
    } finally {
      await fs.rm(requestPath, { force: true });
    }
  }

  async findNextRequestPath() {
    const entries = await fs.readdir(this.settings.bridgeDir);
    const requestNames = entries
      .filter((name) => name.endsWith(".request.json"))
      .sort();
    if (!requestNames.length) {
      return null;
    }
    return path.join(this.settings.bridgeDir, requestNames[0]);
  }

  async renderMermaidToPng(mermaidContent) {
    let tempContainer = null;
    let component = null;
    try {
      tempContainer = document.createElement("div");
      tempContainer.classList.add("obshare-mermaid-temp-container");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-10000px";
      tempContainer.style.top = "0";
      tempContainer.style.opacity = "0";
      document.body.appendChild(tempContainer);

      component = new Component();
      const markdownContent = `\`\`\`mermaid\n${mermaidContent}\n\`\`\``;
      await MarkdownRenderer.render(
        this.app,
        markdownContent,
        tempContainer,
        "",
        component
      );
      await this.waitForMermaidRender(tempContainer);

      const svgElement = tempContainer.querySelector("svg");
      if (!svgElement) {
        throw new Error("Rendered Mermaid SVG not found.");
      }

      const size = this.measureSvg(svgElement);
      const pngBase64 = await this.svgElementToPng(svgElement, size);
      return {
        pngBase64,
        originalWidth: Math.round(size.width),
        originalHeight: Math.round(size.height),
      };
    } finally {
      if (component) {
        component.unload();
      }
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  }

  waitForMermaidRender(container) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkRender = () => {
        const svgElement = container.querySelector("svg");
        if (svgElement) {
          setTimeout(resolve, 100);
          return;
        }
        if (Date.now() - startTime > this.settings.renderTimeoutMs) {
          reject(new Error("Mermaid render timed out."));
          return;
        }
        setTimeout(checkRender, 50);
      };
      checkRender();
    });
  }

  measureSvg(svgElement) {
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");
    if (
      widthAttr &&
      heightAttr &&
      !widthAttr.includes("%") &&
      !heightAttr.includes("%")
    ) {
      return {
        width: Math.max(parseFloat(widthAttr), 100),
        height: Math.max(parseFloat(heightAttr), 100),
      };
    }

    const rect = svgElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        width: Math.max(rect.width, 100),
        height: Math.max(rect.height, 100),
      };
    }

    try {
      const bbox = svgElement.getBBox();
      return {
        width: Math.max(bbox.width || svgElement.clientWidth || 800, 100),
        height: Math.max(bbox.height || svgElement.clientHeight || 600, 100),
      };
    } catch (_) {
      return {
        width: Math.max(svgElement.clientWidth || 800, 100),
        height: Math.max(svgElement.clientHeight || 600, 100),
      };
    }
  }

  async svgElementToPng(svgElement, size) {
    const scale = this.settings.scale || DEFAULT_SETTINGS.scale;
    const targetWidth = Math.round(size.width * scale);
    const targetHeight = Math.round(size.height * scale);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas context.");
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.fillStyle = this.settings.backgroundColor || DEFAULT_SETTINGS.backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const clonedNode = svgElement.cloneNode(true);
    if (!(clonedNode instanceof SVGSVGElement)) {
      throw new Error("Failed to clone Mermaid SVG.");
    }

    clonedNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedNode.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clonedNode.setAttribute("width", String(size.width));
    clonedNode.setAttribute("height", String(size.height));
    clonedNode.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    this.inlineStyles(clonedNode);

    const svgData = new XMLSerializer().serializeToString(clonedNode);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
    const img = new Image();

    return await new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const pngDataUrl = canvas.toDataURL("image/png", 1);
          const base64Data = pngDataUrl.split(",")[1];
          if (!base64Data) {
            reject(new Error("Failed to encode Mermaid PNG."));
            return;
          }
          resolve(base64Data);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      img.onerror = () => reject(new Error("Failed to load Mermaid SVG into image."));
      img.src = svgDataUrl;
    });
  }

  inlineStyles(svgElement) {
    try {
      const allElements = svgElement.querySelectorAll("*");
      const importantStyles = [
        "fill",
        "stroke",
        "stroke-width",
        "stroke-dasharray",
        "stroke-linecap",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "text-anchor",
        "dominant-baseline",
        "alignment-baseline",
        "opacity",
        "visibility",
        "display",
      ];
      allElements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        importantStyles.forEach((prop) => {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== "initial" && value !== "inherit") {
            element.setAttribute(prop, value.trim());
          }
        });
      });
    } catch (error) {
      console.warn("[obshare-render-bridge] Failed to inline SVG styles", error);
    }
  }
};
