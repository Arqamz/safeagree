// SafeAgree Content Script
// Main content script that orchestrates page detection and text extraction

class SafeAgreeContentScript {
  constructor() {
    this.isInitialized = false;
    this.currentState = (typeof SAFEAGREE_CONSTANTS !== 'undefined') ? 
      SAFEAGREE_CONSTANTS.UI_CONFIG.STATES.IDLE : 'idle';
    this.pageAnalysis = null;
    this.textExtraction = null;
    this.lastAnalysisTime = 0;
    this.analysisThrottleMs = 2000; // Don't analyze more than once every 2 seconds
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
      
      // Perform initial page analysis
      await this.analyzeCurrentPage();
      
      this.isInitialized = true;
      SafeAgreeHelpers.log('info', 'SafeAgree content script initialized successfully');
      
    } catch (error) {
      SafeAgreeHelpers.log('error', 'Failed to initialize content script', error);
    }
  }

  /**
   * Set up message handlers for communication with popup
   */
  setupMessageHandlers() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        const messageTypes = (typeof SAFEAGREE_CONSTANTS !== 'undefined') ? 
          SAFEAGREE_CONSTANTS.MESSAGE_TYPES : {};
        
        if (message.type === 'get_status') {
          sendResponse(this.getStatus());
          return true;
        }
        
        if (message.type === 'get_chunks') {
          const chunks = this.getContentChunks();
          console.log('SafeAgree - Text Chunks:', chunks);
          sendResponse({ chunks: chunks });
          return true;
        }
        
        if (message.type === 'extract_text') {
          this.extractText().then(result => {
            console.log('SafeAgree - Extracted Text:', result);
            sendResponse(result);
          }).catch(error => {
            console.error('SafeAgree - Extraction Error:', error);
            sendResponse({ error: error.message });
          });
          return true;
        }
      } catch (error) {
        console.error('SafeAgree - Message handler error:', error);
        sendResponse({ error: error.message });
      }
    });
  }

  /**
   * Analyze the current page for legal documents
   */
  async analyzeCurrentPage() {
    try {
      // Throttle analysis to prevent performance issues
      const now = Date.now();
      if (now - this.lastAnalysisTime < this.analysisThrottleMs) {
        SafeAgreeHelpers.log('debug', 'Analysis throttled');
        return;
      }
      this.lastAnalysisTime = now;

      // Skip analysis for search pages and common non-legal domains
      const url = window.location.href;
      if (this.shouldSkipAnalysis(url)) {
        this.setState('idle');
        return;
      }

      this.setState('detecting');
      
      // Analyze page structure and content
      this.pageAnalysis = pageDetector.analyzePage();
      
      console.log('SafeAgree - Page Analysis:', this.pageAnalysis);
      
      if (this.pageAnalysis.isLegalDocument) {
        this.setState('ready');
        
        // Extract text content
        this.textExtraction = textExtractor.extractPageText();
        console.log('SafeAgree - Text Extraction:', this.textExtraction);
      } else {
        this.setState('idle');
      }
      
    } catch (error) {
      SafeAgreeHelpers.log('error', 'Failed to analyze page', error);
      this.setState('error');
    }
  }

  /**
   * Check if we should skip analysis for this URL
   * @param {string} url - URL to check
   * @returns {boolean} True if analysis should be skipped
   */
  shouldSkipAnalysis(url) {
    const skipDomains = [
      'google.com',
      'google.',
      'bing.com',
      'duckduckgo.com',
      'search.yahoo.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'youtube.com',
      'reddit.com'
    ];
    
    const skipPaths = [
      '/search',
      '/results',
      '/q=',
      '?q=',
      '&q='
    ];
    
    const lowerUrl = url.toLowerCase();
    
    // Skip search domains
    if (skipDomains.some(domain => lowerUrl.includes(domain))) {
      return true;
    }
    
    // Skip search paths
    if (skipPaths.some(path => lowerUrl.includes(path))) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract text from the current page
   */
  async extractText() {
    try {
      this.setState('processing');
      
      // Re-extract text content
      this.textExtraction = textExtractor.extractPageText();
      
      if (this.textExtraction) {
        this.setState('ready');
        return {
          success: true,
          data: this.textExtraction
        };
      } else {
        throw new Error('Failed to extract text');
      }
      
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /**
   * Get current analysis status
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
   */
  getContentChunks() {
    if (!this.textExtraction || !this.textExtraction.content.chunks) {
      return [];
    }
    
    return this.textExtraction.content.chunks;
  }

  /**
   * Set current state
   */
  setState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;
    
    if (oldState !== newState) {
      SafeAgreeHelpers.log('info', `State changed from ${oldState} to ${newState}`);
    }
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

// Export for debugging and testing
if (typeof window !== 'undefined') {
  window.safeAgreeContent = safeAgreeContent;
}

// Handle page navigation in SPAs with debouncing
let lastUrl = location.href;
const debouncedAnalysis = SafeAgreeHelpers.debounce(() => {
  SafeAgreeHelpers.log('debug', 'URL changed, re-analyzing page');
  safeAgreeContent.analyzeCurrentPage();
}, 1000); // Wait 1 second before re-analyzing

new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    debouncedAnalysis();
  }
}).observe(document, { subtree: true, childList: true });
