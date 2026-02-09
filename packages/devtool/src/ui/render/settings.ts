export function renderSettings(showPassedPlugins: boolean): string {
  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-settings-header">
        <span class="spoosh-settings-title">Settings</span>
      </div>
      <div class="spoosh-settings-content">
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
