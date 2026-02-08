let styleElement: HTMLStyleElement | null = null;

export function injectStyles(css: string): void {
  if (typeof document === "undefined") return;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "spoosh-devtool-styles";
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
}

export function removeStyles(): void {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
}
