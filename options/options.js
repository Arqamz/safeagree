// SafeAgree Options Page Script

class SafeAgreeOptions {
  constructor() {
    this.settings = {};
    this.elements = {};
  }

  async init() {
    this.initializeElements();
    this.setupEventListeners();
    await this.loadSettings();
    this.updateUI();
  }

  initializeElements() {
    this.elements = {
      autoDetect: document.getElementById('autoDetect'),
      showNotifications: document.getElementById('showNotifications'),
      localProcessingOnly: document.getElementById('localProcessingOnly'),
      cacheDocuments: document.getElementById('cacheDocuments'),
      summarizationModel: document.getElementById('summarizationModel'),
      maxCacheSize: document.getElementById('maxCacheSize'),
      cacheSizeValue: document.getElementById('cacheSizeValue'),
      enableDebugLogging: document.getElementById('enableDebugLogging'),
      saveBtn: document.getElementById('saveBtn'),
      resetBtn: document.getElementById('resetBtn'),
      saveStatus: document.getElementById('saveStatus')
    };
  }

  setupEventListeners() {
    this.elements.saveBtn.addEventListener('click', () => this.saveSettings());
    this.elements.resetBtn.addEventListener('click', () => this.resetToDefaults());
    
    this.elements.maxCacheSize.addEventListener('input', (e) => {
      this.elements.cacheSizeValue.textContent = `${e.target.value} MB`;
    });
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get('safeagree_settings');
      const defaultSettings = {
        autoDetect: true,
        showNotifications: true,
        localProcessingOnly: true,
        cacheDocuments: true,
        summarizationModel: 'local',
        maxCacheSize: 50,
        enableDebugLogging: false
      };
      
      this.settings = { ...defaultSettings, ...(stored.safeagree_settings || {}) };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  updateUI() {
    this.elements.autoDetect.checked = this.settings.autoDetect;
    this.elements.showNotifications.checked = this.settings.showNotifications;
    this.elements.localProcessingOnly.checked = this.settings.localProcessingOnly;
    this.elements.cacheDocuments.checked = this.settings.cacheDocuments;
    this.elements.summarizationModel.value = this.settings.summarizationModel;
    this.elements.maxCacheSize.value = this.settings.maxCacheSize;
    this.elements.cacheSizeValue.textContent = `${this.settings.maxCacheSize} MB`;
    this.elements.enableDebugLogging.checked = this.settings.enableDebugLogging;
  }

  async saveSettings() {
    try {
      const newSettings = {
        autoDetect: this.elements.autoDetect.checked,
        showNotifications: this.elements.showNotifications.checked,
        localProcessingOnly: this.elements.localProcessingOnly.checked,
        cacheDocuments: this.elements.cacheDocuments.checked,
        summarizationModel: this.elements.summarizationModel.value,
        maxCacheSize: parseInt(this.elements.maxCacheSize.value),
        enableDebugLogging: this.elements.enableDebugLogging.checked
      };

      await chrome.storage.local.set({ safeagree_settings: newSettings });
      
      // Send message to background script to update settings
      chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        data: { settings: newSettings }
      });

      this.showSaveStatus('Settings saved successfully!', true);
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showSaveStatus('Failed to save settings', false);
    }
  }

  async resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      const defaultSettings = {
        autoDetect: true,
        showNotifications: true,
        localProcessingOnly: true,
        cacheDocuments: true,
        summarizationModel: 'local',
        maxCacheSize: 50,
        enableDebugLogging: false
      };

      this.settings = defaultSettings;
      this.updateUI();
      await this.saveSettings();
    }
  }

  showSaveStatus(message, success) {
    this.elements.saveStatus.textContent = message;
    this.elements.saveStatus.style.color = success ? '#4CAF50' : '#F44336';
    
    setTimeout(() => {
      this.elements.saveStatus.textContent = '';
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const options = new SafeAgreeOptions();
  options.init();
});
