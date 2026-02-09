import type { ThemeMode } from "../view-model";

export interface SettingsRenderContext {
  showPassedPlugins: boolean;
  theme: ThemeMode;
}

export function renderSettings(ctx: SettingsRenderContext): string {
  const { showPassedPlugins, theme } = ctx;

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-settings-header">
        <span class="spoosh-settings-title">Settings</span>
      </div>
      <div class="spoosh-settings-content">
        <div class="spoosh-settings-section">
          <div class="spoosh-settings-section-title">Appearance</div>
          <div class="spoosh-settings-row">
            <span class="spoosh-settings-label">Theme</span>
            <select class="spoosh-settings-select" data-setting="theme">
              <option value="dark" ${theme === "dark" ? "selected" : ""}>Dark</option>
              <option value="light" ${theme === "light" ? "selected" : ""}>Light</option>
            </select>
          </div>
        </div>
        <div class="spoosh-settings-section">
          <div class="spoosh-settings-section-title">Display</div>
          <label class="spoosh-settings-toggle">
            <input type="checkbox" data-setting="showPassedPlugins" ${showPassedPlugins ? "checked" : ""} />
            <span class="spoosh-toggle-slider"></span>
            <span class="spoosh-settings-label">Show passed plugins in timeline</span>
          </label>
        </div>
      </div>
    </div>
  `;
}
