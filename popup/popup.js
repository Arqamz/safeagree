// SafeAgree Popup Script
// Handles the extension popup UI and interactions

class SafeAgreePopup {
  constructor() {
    this.currentStatus = null;
    this.currentSettings = null;
    this.isInitialized = false;
    this.elements = {};
    this.state = 'idle';
  }

  /**
   * Initialize the popup
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log('[SafeAgree Popup] Initializing...');
      
      // Get DOM elements
      this.initializeElements();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial status
      await this.loadStatus();
      
      // Update UI based on status
      this.updateUI();
      
      this.isInitialized = true;
      console.log('[SafeAgree Popup] Initialized successfully');
      
    } catch (error) {
      console.error('[SafeAgree Popup] Initialization failed:', error);
      this.showError('Failed to initialize extension');
    }
  }

  /**
   * Get DOM elements and store references
   */
  initializeElements() {
    this.elements = {
      // Status elements
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      
      // Detection elements
      detectionSection: document.getElementById('detectionSection'),
      detectionCard: document.getElementById('detectionCard'),
      detectionIcon: document.getElementById('detectionIcon'),
      detectionTitle: document.getElementById('detectionTitle'),
      detectionDescription: document.getElementById('detectionDescription'),
      
      // Document info
      documentInfo: document.getElementById('documentInfo'),
      documentType: document.getElementById('documentType'),
      wordCount: document.getElementById('wordCount'),
      readingTime: document.getElementById('readingTime'),
      confidence: document.getElementById('confidence'),
      
      // Actions
      actionsSection: document.getElementById('actionsSection'),
      summarizeBtn: document.getElementById('summarizeBtn'),
      askQuestionBtn: document.getElementById('askQuestionBtn'),
      viewChunksBtn: document.getElementById('viewChunksBtn'),
      
      // Text Chunks section
      chunksSection: document.getElementById('chunksSection'),
      closeChunksBtn: document.getElementById('closeChunksBtn'),
      prevChunkBtn: document.getElementById('prevChunkBtn'),
      nextChunkBtn: document.getElementById('nextChunkBtn'),
      chunkCounter: document.getElementById('chunkCounter'),
      chunkDisplay: document.getElementById('chunkDisplay'),
      chunkHeader: document.getElementById('chunkHeader'),
      chunkTitle: document.getElementById('chunkTitle'),
      chunkType: document.getElementById('chunkType'),
      chunkText: document.getElementById('chunkText'),
      chunkMeta: document.getElementById('chunkMeta'),
      chunkWords: document.getElementById('chunkWords'),
      chunkChars: document.getElementById('chunkChars'),
      
      // Summary section
      summarySection: document.getElementById('summarySection'),
      closeSummaryBtn: document.getElementById('closeSummaryBtn'),
      summaryLoading: document.getElementById('summaryLoading'),
      summaryResult: document.getElementById('summaryResult'),
      summaryMeta: document.getElementById('summaryMeta'),
      keyPoints: document.getElementById('keyPoints'),
      
      // Question section
      questionSection: document.getElementById('questionSection'),
      closeQuestionBtn: document.getElementById('closeQuestionBtn'),
      questionInput: document.getElementById('questionInput'),
      askBtn: document.getElementById('askBtn'),
      questionSuggestions: document.getElementById('questionSuggestions'),
      answerContent: document.getElementById('answerContent'),
      answerLoading: document.getElementById('answerLoading'),
      answerResult: document.getElementById('answerResult'),
      answerText: document.getElementById('answerText'),
      answerSources: document.getElementById('answerSources'),
      
      // Error and no document sections
      errorSection: document.getElementById('errorSection'),
      errorMessage: document.getElementById('errorMessage'),
      retryBtn: document.getElementById('retryBtn'),
      noDocumentSection: document.getElementById('noDocumentSection'),
      
      // Footer
      settingsBtn: document.getElementById('settingsBtn'),
      helpBtn: document.getElementById('helpBtn')
    };

    // Initialize chunks navigation state
    this.currentChunkIndex = 0;
    this.chunks = [];
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Action buttons
    this.elements.summarizeBtn.addEventListener('click', () => this.handleSummarize());
    this.elements.askQuestionBtn.addEventListener('click', () => this.showQuestionSection());
    this.elements.viewChunksBtn.addEventListener('click', () => this.handleViewChunks());
    
    // Chunks section
    this.elements.closeChunksBtn.addEventListener('click', () => this.hideChunksSection());
    this.elements.prevChunkBtn.addEventListener('click', () => this.navigateChunk(-1));
    this.elements.nextChunkBtn.addEventListener('click', () => this.navigateChunk(1));
    
    // Summary section
    this.elements.closeSummaryBtn.addEventListener('click', () => this.hideSummarySection());
    
    // Question section
    this.elements.closeQuestionBtn.addEventListener('click', () => this.hideQuestionSection());
    this.elements.askBtn.addEventListener('click', () => this.handleAskQuestion());
    this.elements.questionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAskQuestion();
    });
    
    // Question suggestions
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question');
        this.elements.questionInput.value = question;
        this.handleAskQuestion();
      });
    });
    
    // Error handling
    this.elements.retryBtn.addEventListener('click', () => this.loadStatus());
    
    // Footer buttons
    this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    this.elements.helpBtn.addEventListener('click', () => this.openHelp());
  }

  /**
   * Load status from content script
   */
  async loadStatus() {
    try {
      this.setState('detecting');
      
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
      }
      
      const tabId = tabs[0].id;
      
      // Communicate with content script
      const response = await this.sendMessageToTab(tabId, {
        type: 'GET_STATUS'
      });
      
      if (response && response.success) {
        this.currentStatus = response.status;
        this.currentSettings = response.settings || {};
        this.setState(this.currentStatus ? 'ready' : 'idle');
      } else {
        // No legal document detected or content script not ready
        this.currentStatus = null;
        this.setState('idle');
      }
      
    } catch (error) {
      console.log('[SafeAgree Popup] No status available:', error.message);
      // This is normal if no legal document is detected
      this.currentStatus = null;
      this.setState('idle');
    }
  }

  /**
   * Update UI based on current status
   */
  updateUI() {
    if (!this.currentStatus) {
      this.showNoDocument();
      return;
    }
    
    const { analysis, extraction } = this.currentStatus;
    
    if (analysis && analysis.isLegalDocument) {
      this.showDocumentDetected(analysis, extraction);
    } else {
      this.showNoDocument();
    }
  }

  /**
   * Show document detected state
   * @param {Object} analysis - Page analysis data
   * @param {Object} extraction - Text extraction data
   */
  showDocumentDetected(analysis, extraction) {
    // Hide other sections
    this.hideAllSections();
    
    // Update detection card
    this.elements.detectionIcon.textContent = this.getDocumentIcon(analysis.documentType);
    this.elements.detectionTitle.textContent = 'Legal document detected!';
    this.elements.detectionDescription.textContent = this.getDocumentDescription(analysis.documentType);
    
    // Show document info
    this.elements.documentInfo.style.display = 'block';
    this.elements.documentType.textContent = this.formatDocumentType(analysis.documentType);
    this.elements.wordCount.textContent = extraction?.metadata?.wordCount || 'Unknown';
    this.elements.readingTime.textContent = extraction?.metadata?.readingTime 
      ? `${extraction.metadata.readingTime} min` 
      : 'Unknown';
    this.elements.confidence.textContent = `${Math.round(analysis.confidence * 100)}%`;
    
    // Show actions
    this.elements.actionsSection.style.display = 'block';
    
    // Enable/disable buttons based on available data
    const hasExtraction = extraction && extraction.success;
    this.elements.summarizeBtn.disabled = !hasExtraction;
    this.elements.askQuestionBtn.disabled = !hasExtraction;
  }

  /**
   * Show no document state
   */
  showNoDocument() {
    this.hideAllSections();
    
    this.elements.detectionIcon.textContent = '📄';
    this.elements.detectionTitle.textContent = 'No legal document detected';
    this.elements.detectionDescription.textContent = 'This page doesn\'t appear to contain legal documents';
    
    this.elements.noDocumentSection.style.display = 'block';
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message) {
    this.hideAllSections();
    this.elements.errorSection.style.display = 'block';
    this.elements.errorMessage.textContent = message;
  }

  /**
   * Hide all main sections
   */
  hideAllSections() {
    this.elements.documentInfo.style.display = 'none';
    this.elements.actionsSection.style.display = 'none';
    this.elements.summarySection.style.display = 'none';
    this.elements.questionSection.style.display = 'none';
    this.elements.chunksSection.style.display = 'none';
    this.elements.errorSection.style.display = 'none';
    this.elements.noDocumentSection.style.display = 'none';
  }

  /**
   * Handle summarize button click
   */
  async handleSummarize() {
    try {
      this.showSummarySection();
      this.elements.summaryLoading.style.display = 'flex';
      this.elements.summaryResult.style.display = 'none';
      
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
      }
      
      const response = await this.sendMessageToTab(tabs[0].id, {
        type: 'GET_SUMMARY'
      });
      
      if (response && response.success) {
        this.displaySummary(response.summary);
      } else {
        throw new Error(response?.error || 'Failed to generate summary');
      }
      
    } catch (error) {
      console.error('[SafeAgree Popup] Summarization failed:', error);
      this.elements.summaryLoading.style.display = 'none';
      this.elements.summaryResult.innerHTML = `
        <div class="error-message">
          <p>❌ Failed to generate summary: ${error.message}</p>
        </div>
      `;
      this.elements.summaryResult.style.display = 'block';
    }
  }

  /**
   * Display summary results
   * @param {Object} summary - Summary data
   */
  displaySummary(summary) {
    this.elements.summaryLoading.style.display = 'none';
    
    // Update meta information
    this.elements.summaryMeta.innerHTML = `
      <span>📊 ${summary.wordCount} words</span>
      <span>⏱️ ${summary.readingTime} min read</span>
      <span>🎯 ${Math.round(summary.confidence * 100)}% confidence</span>
    `;
    
    // Update key points
    this.elements.keyPoints.innerHTML = '';
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      summary.keyPoints.forEach((point, index) => {
        const pointElement = document.createElement('div');
        pointElement.className = 'key-point';
        pointElement.textContent = point;
        this.elements.keyPoints.appendChild(pointElement);
      });
    } else {
      this.elements.keyPoints.innerHTML = '<p>No key points available.</p>';
    }
    
    this.elements.summaryResult.style.display = 'block';
  }

  /**
   * Handle ask question
   */
  async handleAskQuestion() {
    const question = this.elements.questionInput.value.trim();
    if (!question) return;
    
    try {
      this.elements.answerContent.style.display = 'block';
      this.elements.answerLoading.style.display = 'flex';
      this.elements.answerResult.style.display = 'none';
      
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
      }
      
      const response = await this.sendMessageToTab(tabs[0].id, {
        type: 'ASK_QUESTION',
        data: { question }
      });
      
      if (response && response.success) {
        this.displayAnswer(response.answer, question);
      } else {
        throw new Error(response?.error || 'Failed to get answer');
      }
      
    } catch (error) {
      console.error('[SafeAgree Popup] Question failed:', error);
      this.elements.answerLoading.style.display = 'none';
      this.elements.answerText.innerHTML = `❌ Failed to get answer: ${error.message}`;
      this.elements.answerSources.innerHTML = '';
      this.elements.answerResult.style.display = 'block';
    }
  }

  /**
   * Display answer results
   * @param {Object} answer - Answer data
   * @param {string} question - Original question
   */
  displayAnswer(answer, question) {
    this.elements.answerLoading.style.display = 'none';
    
    if (answer.found) {
      this.elements.answerText.innerHTML = `
        <strong>Q: ${question}</strong><br><br>
        <strong>A:</strong> ${answer.answer}
      `;
      
      if (answer.sources && answer.sources.length > 0) {
        this.elements.answerSources.innerHTML = `
          <strong>Sources:</strong><br>
          ${answer.sources.map(source => `• ${source.text}`).join('<br>')}
        `;
      } else {
        this.elements.answerSources.innerHTML = '';
      }
    } else {
      this.elements.answerText.innerHTML = `
        <strong>Q: ${question}</strong><br><br>
        <strong>A:</strong> ${answer.answer}
      `;
      this.elements.answerSources.innerHTML = '';
    }
    
    this.elements.answerResult.style.display = 'block';
  }

  /**
   * Show summary section
   */
  showSummarySection() {
    this.elements.summarySection.style.display = 'block';
    this.elements.summarySection.classList.add('fade-in');
  }

  /**
   * Hide summary section
   */
  hideSummarySection() {
    this.elements.summarySection.style.display = 'none';
  }

  /**
   * Show question section
   */
  showQuestionSection() {
    this.elements.questionSection.style.display = 'block';
    this.elements.questionSection.classList.add('fade-in');
    this.elements.questionInput.focus();
  }

  /**
   * Hide question section
   */
  hideQuestionSection() {
    this.elements.questionSection.style.display = 'none';
    this.elements.answerContent.style.display = 'none';
    this.elements.questionInput.value = '';
  }

  /**
   * Show chunks section
   */
  showChunksSection() {
    this.elements.chunksSection.style.display = 'block';
    this.elements.chunksSection.classList.add('fade-in');
    
    // Hide other sections
    this.elements.summarySection.style.display = 'none';
    this.elements.questionSection.style.display = 'none';
  }

  /**
   * Hide chunks section
   */
  hideChunksSection() {
    this.elements.chunksSection.style.display = 'none';
    this.chunks = [];
    this.currentChunkIndex = 0;
  }

  /**
   * Handle view chunks button click
   */
  async handleViewChunks() {
    try {
      if (!this.currentStatus || !this.currentStatus.extraction) {
        throw new Error('No text extraction available');
      }

      const extraction = this.currentStatus.extraction;
      this.chunks = extraction.content.chunks || [];
      
      if (this.chunks.length === 0) {
        throw new Error('No text chunks found');
      }

      this.currentChunkIndex = 0;
      this.showChunksSection();
      this.displayCurrentChunk();
      
    } catch (error) {
      console.error('[SafeAgree Popup] Failed to view chunks:', error);
      this.showError(error.message);
    }
  }

  /**
   * Navigate to next or previous chunk
   */
  navigateChunk(direction) {
    const newIndex = this.currentChunkIndex + direction;
    
    if (newIndex >= 0 && newIndex < this.chunks.length) {
      this.currentChunkIndex = newIndex;
      this.displayCurrentChunk();
    }
  }

  /**
   * Display the current chunk
   */
  displayCurrentChunk() {
    if (!this.chunks || this.chunks.length === 0) return;
    
    const chunk = this.chunks[this.currentChunkIndex];
    
    // Update chunk display
    this.elements.chunkTitle.textContent = chunk.title || `Chunk ${this.currentChunkIndex + 1}`;
    this.elements.chunkType.textContent = chunk.type || 'text';
    this.elements.chunkText.textContent = chunk.text;
    
    // Update meta information
    const wordCount = chunk.text.split(/\s+/).length;
    const charCount = chunk.text.length;
    this.elements.chunkWords.textContent = `${wordCount} words`;
    this.elements.chunkChars.textContent = `${charCount} characters`;
    
    // Update counter
    this.elements.chunkCounter.textContent = `Chunk ${this.currentChunkIndex + 1} of ${this.chunks.length}`;
    
    // Update navigation buttons
    this.elements.prevChunkBtn.disabled = this.currentChunkIndex === 0;
    this.elements.nextChunkBtn.disabled = this.currentChunkIndex === this.chunks.length - 1;
    
    // Scroll to top of chunk text
    this.elements.chunkText.scrollTop = 0;
  }

  /**
   * Set current state and update UI
   * @param {string} newState - New state
   */
  setState(newState) {
    this.state = newState;
    
    // Update status indicator
    this.elements.statusDot.className = `status-dot ${newState}`;
    
    switch (newState) {
      case 'idle':
        this.elements.statusText.textContent = 'Ready';
        break;
      case 'detecting':
        this.elements.statusText.textContent = 'Analyzing...';
        break;
      case 'ready':
        this.elements.statusText.textContent = 'Ready';
        break;
      case 'error':
        this.elements.statusText.textContent = 'Error';
        break;
    }
  }

  /**
   * Get document icon based on type
   * @param {string} documentType - Document type
   * @returns {string} Icon emoji
   */
  getDocumentIcon(documentType) {
    const icons = {
      'privacy_policy': '🔒',
      'terms_of_service': '📋',
      'cookie_policy': '🍪',
      'eula': '📄',
      'user_agreement': '🤝',
      'legal_notice': '⚖️'
    };
    return icons[documentType] || '📄';
  }

  /**
   * Get document description based on type
   * @param {string} documentType - Document type
   * @returns {string} Description
   */
  getDocumentDescription(documentType) {
    const descriptions = {
      'privacy_policy': 'This document outlines the privacy practices...',
      'terms_of_service': 'These terms govern the use of our service...',
      'cookie_policy': 'This policy explains how we use cookies...',
      'eula': 'End User License Agreement...',
      'user_agreement': 'User Agreement between the parties...',
      'legal_notice': 'Legal Notice regarding the use of the document...'
    };
    return descriptions[documentType] || 'Legal document';
  }

  /**
   * Format document type for display
   * @param {string} documentType - Document type
   * @returns {string} Formatted document type
   */
  formatDocumentType(documentType) {
    const typeMap = {
      'privacy_policy': 'Privacy Policy',
      'terms_of_service': 'Terms of Service',
      'cookie_policy': 'Cookie Policy',
      'eula': 'EULA',
      'user_agreement': 'User Agreement',
      'legal_notice': 'Legal Notice'
    };
    return typeMap[documentType] || 'Other';
  }

  /**
   * Send a message to a specific tab's content script
   * @param {number} tabId - Tab ID
   * @param {Object} message - Message data
   * @returns {Promise<Object>} Response data
   */
  sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Open settings page
   */
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  /**
   * Open help page
   */
  openHelp() {
    const helpUrl = 'https://github.com/Arqamz/safeagree/issues';
    chrome.tabs.create({ url: helpUrl });
  }
}

// Initialize popup
const popup = new SafeAgreePopup();
popup.init();
