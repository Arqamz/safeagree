class SafeAgreePopup {
  constructor() {
    this.currentStatus = null;
    this.isInitialized = false;
    this.currentChunkIndex = 0;
    this.chunks = [];
  }

  async init() {
    if (this.isInitialized) return;

    try {
      console.log('[SafeAgree Popup] Initializing...');
      
      this.setupEventListeners();
      await this.loadStatus();
      this.updateUI();
      
      this.isInitialized = true;
      console.log('[SafeAgree Popup] Initialized successfully');
      
    } catch (error) {
      console.error('[SafeAgree Popup] Initialization failed:', error);
      this.showError('Failed to initialize extension');
    }
  }

  setupEventListeners() {
    const viewChunksBtn = document.getElementById('viewChunksBtn');
    if (viewChunksBtn) {
      viewChunksBtn.addEventListener('click', () => this.handleViewChunks());
    }
    
    const closeChunksBtn = document.getElementById('closeChunksBtn');
    if (closeChunksBtn) {
      closeChunksBtn.addEventListener('click', () => this.hideChunksSection());
    }

    // Create navigation if it doesn't exist
    this.createChunkNavigation();
  }

  createChunkNavigation() {
    const chunksSection = document.getElementById('chunksSection');
    if (!chunksSection) return;

    let navigation = chunksSection.querySelector('.chunks-navigation');
    if (!navigation) {
      navigation = document.createElement('div');
      navigation.className = 'chunks-navigation';
      navigation.innerHTML = `
        <button class="btn btn-small" id="prevChunkBtn">← Previous</button>
        <span class="chunk-counter" id="chunkCounter">0 / 0</span>
        <button class="btn btn-small" id="nextChunkBtn">Next →</button>
      `;
      
      const chunkDisplay = document.getElementById('chunkDisplay');
      if (chunkDisplay) {
        chunkDisplay.parentNode.insertBefore(navigation, chunkDisplay);
      }
    }

    const prevBtn = document.getElementById('prevChunkBtn');
    const nextBtn = document.getElementById('nextChunkBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateChunk(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateChunk(1));
  }

  async loadStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Try to get status from content script with timeout
      const response = await Promise.race([
        chrome.tabs.sendMessage(tab.id, {
          type: 'get_status'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);

      this.currentStatus = response;
      console.log('[SafeAgree Popup] Status loaded:', this.currentStatus);

    } catch (error) {
      console.error('[SafeAgree Popup] Failed to load status:', error);
      this.currentStatus = {
        state: 'error',
        isLegalDocument: false,
        error: error.message || 'Content script not responding'
      };
    }
  }

  updateUI() {
    if (!this.currentStatus) {
      this.showError('No status available');
      return;
    }

    this.updateStatusIndicator();

    if (this.currentStatus.isLegalDocument) {
      this.showDocumentDetected();
    } else if (this.currentStatus.state === 'error') {
      this.showError(this.currentStatus.error || 'Unknown error');
    } else {
      this.showNoDocument();
    }
  }

  updateStatusIndicator() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!statusDot || !statusText) return;

    const state = this.currentStatus.state || 'idle';
    
    statusDot.className = 'status-dot';
    
    switch (state) {
      case 'detecting':
        statusDot.classList.add('detecting');
        statusText.textContent = 'Detecting...';
        break;
      case 'processing':
        statusDot.classList.add('detecting');
        statusText.textContent = 'Processing...';
        break;
      case 'ready':
        statusDot.classList.add('ready');
        statusText.textContent = 'Ready';
        break;
      case 'error':
        statusDot.classList.add('error');
        statusText.textContent = 'Error';
        break;
      default:
        statusDot.classList.add('idle');
        statusText.textContent = 'Idle';
    }
  }

  showDocumentDetected() {
    this.hideAllSections();

    const detectionIcon = document.getElementById('detectionIcon');
    const detectionTitle = document.getElementById('detectionTitle');
    const detectionDescription = document.getElementById('detectionDescription');
    
    if (detectionIcon) {
      detectionIcon.textContent = this.getDocumentIcon(this.currentStatus.documentType);
    }
    
    if (detectionTitle) {
      detectionTitle.textContent = 'Legal Document Detected';
    }
    
    if (detectionDescription) {
      detectionDescription.textContent = this.getDocumentDescription(this.currentStatus.documentType);
    }

    // Show document info
    const documentInfo = document.getElementById('documentInfo');
    if (documentInfo) {
      documentInfo.style.display = 'block';
      
      const documentType = document.getElementById('documentType');
      const wordCount = document.getElementById('wordCount');
      const readingTime = document.getElementById('readingTime');
      const confidence = document.getElementById('confidence');
      
      if (documentType) {
        documentType.textContent = this.formatDocumentType(this.currentStatus.documentType);
      }
      
      if (wordCount) {
        wordCount.textContent = (this.currentStatus.wordCount || 0).toLocaleString();
      }
      
      if (readingTime) {
        const minutes = Math.ceil((this.currentStatus.wordCount || 0) / 200);
        readingTime.textContent = `${minutes} min`;
      }
      
      if (confidence) {
        const conf = Math.round((this.currentStatus.confidence || 0) * 100);
        confidence.textContent = `${conf}%`;
      }
    }

    // Show actions
    const actionsSection = document.getElementById('actionsSection');
    if (actionsSection) {
      actionsSection.style.display = 'flex';
    }
  }

  showNoDocument() {
    this.hideAllSections();
    
    const noDocumentSection = document.getElementById('noDocumentSection');
    if (noDocumentSection) {
      noDocumentSection.style.display = 'block';
    }
    
    const detectionTitle = document.getElementById('detectionTitle');
    const detectionDescription = document.getElementById('detectionDescription');
    
    if (detectionTitle) {
      detectionTitle.textContent = 'No Legal Document Detected';
    }
    
    if (detectionDescription) {
      detectionDescription.textContent = 'This page doesn\'t appear to contain legal documents';
    }
  }

  showError(message) {
    this.hideAllSections();
    
    const errorSection = document.getElementById('errorSection');
    if (errorSection) {
      errorSection.style.display = 'block';
    }
    
    console.error('[SafeAgree Popup] Error:', message);
  }

  hideAllSections() {
    const sections = [
      'documentInfo',
      'actionsSection', 
      'chunksSection',
      'errorSection',
      'noDocumentSection'
    ];
    
    sections.forEach(sectionName => {
      const element = document.getElementById(sectionName);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  async handleViewChunks() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await Promise.race([
        chrome.tabs.sendMessage(tab.id, {
          type: 'get_chunks'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);

      if (response && response.chunks) {
        this.chunks = response.chunks;
        this.currentChunkIndex = 0;
        this.showChunksSection();
        this.displayCurrentChunk();
        
        console.log('[SafeAgree] Text Chunks:', this.chunks);
      } else {
        throw new Error('No chunks available');
      }

    } catch (error) {
      console.error('[SafeAgree Popup] Failed to get chunks:', error);
      this.showError('Failed to extract text chunks');
    }
  }

  showChunksSection() {
    this.hideAllSections();
    
    const chunksSection = document.getElementById('chunksSection');
    if (chunksSection) {
      chunksSection.style.display = 'block';
    }
  }

  hideChunksSection() {
    const chunksSection = document.getElementById('chunksSection');
    if (chunksSection) {
      chunksSection.style.display = 'none';
    }
    
    if (this.currentStatus && this.currentStatus.isLegalDocument) {
      this.showDocumentDetected();
    }
  }

  navigateChunk(direction) {
    if (this.chunks.length === 0) return;
    
    this.currentChunkIndex += direction;
    
    if (this.currentChunkIndex < 0) {
      this.currentChunkIndex = this.chunks.length - 1;
    } else if (this.currentChunkIndex >= this.chunks.length) {
      this.currentChunkIndex = 0;
    }
    
    this.displayCurrentChunk();
  }

  displayCurrentChunk() {
    if (!this.chunks.length) return;
    
    const chunk = this.chunks[this.currentChunkIndex];
    const chunkDisplay = document.getElementById('chunkDisplay');
    const chunkCounter = document.getElementById('chunkCounter');
    
    if (chunkCounter) {
      chunkCounter.textContent = `${this.currentChunkIndex + 1} / ${this.chunks.length}`;
    }
    
    if (chunkDisplay && chunk) {
      chunkDisplay.innerHTML = `
        <div class="chunk-header">
          <h4 class="chunk-title">${chunk.title || 'Text Chunk'}</h4>
          <span class="chunk-type">${chunk.type || 'content'}</span>
        </div>
        <div class="chunk-text">${chunk.text}</div>
        <div class="chunk-meta">
          <span class="chunk-words">${chunk.text.split(/\s+/).length} words</span>
          <span class="chunk-chars">${chunk.text.length} characters</span>
        </div>
      `;
    }
  }

  getDocumentIcon(documentType) {
    switch (documentType) {
      case 'privacy_policy': return '🔒';
      case 'terms_of_service': return '📋';
      case 'cookie_policy': return '🍪';
      case 'eula': return '📄';
      default: return '📄';
    }
  }

  getDocumentDescription(documentType) {
    switch (documentType) {
      case 'privacy_policy': return 'Privacy Policy detected';
      case 'terms_of_service': return 'Terms of Service detected';
      case 'cookie_policy': return 'Cookie Policy detected';
      case 'eula': return 'End User License Agreement detected';
      default: return 'Legal document detected';
    }
  }

  formatDocumentType(documentType) {
    switch (documentType) {
      case 'privacy_policy': return 'Privacy Policy';
      case 'terms_of_service': return 'Terms of Service';
      case 'cookie_policy': return 'Cookie Policy';
      case 'eula': return 'EULA';
      default: return 'Legal Document';
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new SafeAgreePopup();
  popup.init();
});
