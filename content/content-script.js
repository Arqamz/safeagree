// SafeAgree Content Script
// Main content script that orchestrates page detection and text extraction

class SafeAgreeContentScript {
  constructor() {
    this.isInitialized = false;
    this.currentState = SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.IDLE;
    this.pageAnalysis = null;
    this.textExtraction = null;
    this.messageHandlers = new Map();
    this.observerConfig = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    };
    this.domObserver = null;
  }

  /**
   * Initialize the content script
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      SafeAgreeHelpers.log('info', 'Initializing SafeAgree content script');
      
      // Initialize components
      pageDetector.init();
      textExtractor.init();
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Set up DOM observer for dynamic content
      this.setupDOMObserver();
      
      // Perform initial page analysis
      await this.analyzeCurrentPage();
      
      this.isInitialized = true;
      SafeAgreeHelpers.log('info', 'SafeAgree content script initialized successfully');
      
    } catch (error) {
      SafeAgreeHelpers.log('error', 'Failed to initialize content script', error);
    }
  }

  /**
   * Set up message handlers for communication with background script and popup
   */
  setupMessageHandlers() {
    // Handle messages from background script
    this.messageHandlers.set(SAFEAGREE_CONSTANTS.MESSAGE_TYPES.BACKGROUND_TO_CONTENT.START_ANALYSIS, 
      this.handleStartAnalysis.bind(this));
    
    this.messageHandlers.set(SAFEAGREE_CONSTANTS.MESSAGE_TYPES.BACKGROUND_TO_CONTENT.GET_PAGE_TEXT, 
      this.handleGetPageText.bind(this));
    
    this.messageHandlers.set(SAFEAGREE_CONSTANTS.MESSAGE_TYPES.BACKGROUND_TO_CONTENT.INJECT_UI, 
      this.handleInjectUI.bind(this));
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type && this.messageHandlers.has(message.type)) {
        const handler = this.messageHandlers.get(message.type);
        handler(message, sender, sendResponse);
        return true; // Keep the message channel open for async responses
      }
    });
  }

  /**
   * Set up DOM observer to detect dynamic content changes
   */
  setupDOMObserver() {
    this.domObserver = new MutationObserver(
      SafeAgreeHelpers.debounce(this.handleDOMChanges.bind(this), 1000)
    );
    
    this.domObserver.observe(document.body, this.observerConfig);
  }

  /**
   * Handle DOM changes that might indicate new content
   * @param {Array} mutations - Array of mutation records
   */
  async handleDOMChanges(mutations) {
    let significantChange = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes contain significant text content
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const textContent = node.textContent || '';
            if (textContent.length > 100) {
              significantChange = true;
              break;
            }
          }
        }
      }
    }
    
    if (significantChange) {
      SafeAgreeHelpers.log('debug', 'Significant DOM changes detected, re-analyzing page');
      await this.analyzeCurrentPage();
    }
  }

  /**
   * Analyze the current page for legal documents
   */
  async analyzeCurrentPage() {
    try {
      this.setState(SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.DETECTING);
      
      // Clear previous caches if URL changed
      const currentURL = window.location.href;
      if (this.lastAnalyzedURL !== currentURL) {
        pageDetector.clearCache();
        textExtractor.clearCache();
        this.lastAnalyzedURL = currentURL;
      }
      
      // Perform page analysis
      this.pageAnalysis = pageDetector.analyzePage();
      
      // If legal document detected, extract text
      if (this.pageAnalysis.isLegalDocument) {
        this.setState(SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.PROCESSING);
        
        this.textExtraction = textExtractor.extractPageText();
        
        if (this.textExtraction.success) {
          this.setState(SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.READY);
          
          // Notify background script
          this.sendMessageToBackground(
            SAFEAGREE_CONSTANTS.MESSAGE_TYPES.CONTENT_TO_BACKGROUND.PAGE_ANALYZED,
            {
              analysis: this.pageAnalysis,
              extraction: this.textExtraction,
              url: currentURL,
              timestamp: Date.now()
            }
          );
          
          SafeAgreeHelpers.log('info', 'Legal document detected and processed', {
            type: this.pageAnalysis.documentType,
            confidence: this.pageAnalysis.confidence,
            wordCount: this.textExtraction.metadata.wordCount
          });
          
        } else {
          this.setState(SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.ERROR);
          SafeAgreeHelpers.log('error', 'Text extraction failed', this.textExtraction.error);
        }
        
      } else {
        this.setState(SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.IDLE);
        
        // Still notify background script about non-legal pages
        this.sendMessageToBackground(
          SAFEAGREE_CONSTANTS.MESSAGE_TYPES.CONTENT_TO_BACKGROUND.DETECTION_STATUS,
          {
            isLegal: false,
            analysis: this.pageAnalysis,
            url: currentURL,
            timestamp: Date.now()
          }
        );
      }
      
    } catch (error) {
      this.setState(SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.ERROR);
      SafeAgreeHelpers.log('error', 'Page analysis failed', error);
      
      this.sendMessageToBackground(
        SAFEAGREE_CONSTANTS.MESSAGE_TYPES.CONTENT_TO_BACKGROUND.PAGE_ANALYZED,
        {
          error: error.message,
          url: window.location.href,
          timestamp: Date.now()
        }
      );
    }
  }

  /**
   * Handle start analysis message from background
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Response callback
   */
  async handleStartAnalysis(message, sender, sendResponse) {
    try {
      await this.analyzeCurrentPage();
      sendResponse({
        success: true,
        state: this.currentState,
        analysis: this.pageAnalysis,
        extraction: this.textExtraction
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle get page text message from background
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Response callback
   */
  async handleGetPageText(message, sender, sendResponse) {
    try {
      const options = message.options || {};
      const extraction = textExtractor.extractPageText(options);
      
      sendResponse({
        success: true,
        extraction: extraction
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle inject UI message from background
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Response callback
   */
  handleInjectUI(message, sender, sendResponse) {
    try {
      // This could be used to inject a sidebar or overlay UI
      // For now, we'll just acknowledge the message
      sendResponse({
        success: true,
        message: 'UI injection not implemented yet'
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send message to background script
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  sendMessageToBackground(type, data) {
    chrome.runtime.sendMessage({
      type: type,
      data: data,
      timestamp: Date.now()
    }).catch(error => {
      SafeAgreeHelpers.log('warn', 'Failed to send message to background', error);
    });
  }

  /**
   * Set current state and notify background
   * @param {string} newState - New state
   */
  setState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;
    
    if (oldState !== newState) {
      SafeAgreeHelpers.log('debug', `State changed: ${oldState} -> ${newState}`);
      
      // Notify background script of state change
      this.sendMessageToBackground(
        SAFEAGREE_CONSTANTS.MESSAGE_TYPES.CONTENT_TO_BACKGROUND.DETECTION_STATUS,
        {
          state: newState,
          previousState: oldState,
          url: window.location.href,
          timestamp: Date.now()
        }
      );
    }
  }

  /**
   * Get current analysis status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      state: this.currentState,
      isLegalDocument: this.pageAnalysis?.isLegalDocument || false,
      documentType: this.pageAnalysis?.documentType || null,
      confidence: this.pageAnalysis?.confidence || 0,
      hasExtraction: !!this.textExtraction,
      wordCount: this.textExtraction?.metadata?.wordCount || 0,
      chunkCount: this.textExtraction?.content?.chunks?.length || 0,
      url: window.location.href,
      timestamp: Date.now()
    };
  }

  /**
   * Get extracted content chunks
   * @param {Object} options - Options for chunk selection
   * @returns {Array} Array of content chunks
   */
  getContentChunks(options = {}) {
    if (!this.textExtraction || !this.textExtraction.content.chunks) {
      return [];
    }
    
    let chunks = this.textExtraction.content.chunks;
    
    // Apply filters if specified
    if (options.maxChunks) {
      chunks = chunks.slice(0, options.maxChunks);
    }
    
    if (options.minLength) {
      chunks = chunks.filter(chunk => chunk.text.length >= options.minLength);
    }
    
    if (options.type) {
      chunks = chunks.filter(chunk => chunk.type === options.type);
    }
    
    return chunks;
  }

  /**
   * Search within extracted content
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Array of matching chunks
   */
  searchContent(query, options = {}) {
    if (!this.textExtraction || !query) {
      return [];
    }
    
    const chunks = this.getContentChunks(options);
    const queryLower = query.toLowerCase();
    
    return chunks
      .map(chunk => ({
        ...chunk,
        relevance: SafeAgreeHelpers.calculateTextSimilarity(chunk.text, query),
        hasExactMatch: chunk.text.toLowerCase().includes(queryLower)
      }))
      .filter(chunk => chunk.relevance > 0.1 || chunk.hasExactMatch)
      .sort((a, b) => {
        // Prioritize exact matches, then by relevance
        if (a.hasExactMatch && !b.hasExactMatch) return -1;
        if (!a.hasExactMatch && b.hasExactMatch) return 1;
        return b.relevance - a.relevance;
      });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    
    pageDetector.clearCache();
    textExtractor.clearCache();
    
    this.messageHandlers.clear();
    this.isInitialized = false;
    
    SafeAgreeHelpers.log('info', 'Content script cleaned up');
  }
}

// Create and initialize the content script
const safeAgreeContent = new SafeAgreeContentScript();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    safeAgreeContent.init();
  });
} else {
  // DOM is already ready
  safeAgreeContent.init();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  safeAgreeContent.cleanup();
});

// Export for debugging and testing
if (typeof window !== 'undefined') {
  window.safeAgreeContent = safeAgreeContent;
}

// Handle page navigation in SPAs
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    SafeAgreeHelpers.log('debug', 'URL changed, re-analyzing page');
    safeAgreeContent.analyzeCurrentPage();
  }
}).observe(document, { subtree: true, childList: true });
