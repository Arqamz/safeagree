// SafeAgree Constants
// Core configuration and constants for the extension

const SAFEAGREE_CONSTANTS = {
  // Extension identification
  EXTENSION_ID: 'safeagree',
  VERSION: '0.1.0',
  
  // Page detection patterns
  LEGAL_DOC_PATTERNS: {
    // URL patterns that typically contain legal documents
    URL_PATTERNS: [
      /\/terms[-_]?(of[-_]?)?(?:service|use)/i,
      /\/privacy[-_]?policy/i,
      /\/cookie[-_]?policy/i,
      /\/legal/i,
      /\/tos\b/i,
      /\/eula\b/i,
      /\/user[-_]?agreement/i,
      /\/acceptable[-_]?use/i,
      /\/end[-_]?user[-_]?license/i
    ],
    
    // Page title patterns
    TITLE_PATTERNS: [
      /terms\s+(of\s+)?(service|use)/i,
      /privacy\s+policy/i,
      /cookie\s+policy/i,
      /user\s+agreement/i,
      /end\s+user\s+license/i,
      /acceptable\s+use\s+policy/i,
      /legal\s+(notice|disclaimer)/i
    ],
    
    // Content indicators
    CONTENT_INDICATORS: [
      'by using this service',
      'by accessing this website',
      'these terms of service',
      'this privacy policy',
      'personal information',
      'data collection',
      'we collect',
      'your rights',
      'binding agreement',
      'legal obligations'
    ]
  },
  
  // Text processing settings
  TEXT_PROCESSING: {
    MIN_CHUNK_SIZE: 200,
    MAX_CHUNK_SIZE: 1000,
    OVERLAP_SIZE: 100,
    MIN_DOCUMENT_LENGTH: 500,
    MAX_DOCUMENT_LENGTH: 100000,
    
    // Patterns to remove/clean
    NOISE_PATTERNS: [
      /^\s*\d+\.\s*/,  // Numbered lists
      /^\s*[a-z]\)\s*/i,  // Lettered lists
      /^\s*•\s*/,      // Bullet points
      /\s+/g           // Multiple whitespace
    ]
  },
  
  // Storage keys
  STORAGE_KEYS: {
    SETTINGS: 'safeagree_settings',
    DOCUMENT_CACHE: 'safeagree_doc_cache',
    EMBEDDINGS: 'safeagree_embeddings',
    LAST_ANALYSIS: 'safeagree_last_analysis',
    USER_PREFERENCES: 'safeagree_preferences'
  },
  
  // Default settings
  DEFAULT_SETTINGS: {
    autoDetect: true,
    showNotifications: true,
    localProcessingOnly: true,
    cacheDocuments: true,
    summarizationModel: 'local',
    embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
    maxCacheSize: 50, // MB
    enableDebugLogging: false
  },
  
  // AI/ML Configuration
  AI_CONFIG: {
    EMBEDDING_DIMENSIONS: 384,
    MAX_CONTEXT_LENGTH: 512,
    SIMILARITY_THRESHOLD: 0.7,
    TOP_K_RESULTS: 5,
    
    // Model paths (relative to extension root)
    MODELS: {
      SENTENCE_TRANSFORMER: 'models/sentence-transformer.onnx',
      SUMMARIZATION: 'models/summarization.onnx'
    }
  },
  
  // UI Configuration
  UI_CONFIG: {
    POPUP_WIDTH: 400,
    POPUP_HEIGHT: 600,
    ANIMATION_DURATION: 200,
    DEBOUNCE_DELAY: 300,
    
    STATES: {
      IDLE: 'idle',
      DETECTING: 'detecting',
      PROCESSING: 'processing',
      READY: 'ready',
      ERROR: 'error'
    }
  },
  
  // Message types for communication between scripts
  MESSAGE_TYPES: {
    CONTENT_TO_BACKGROUND: {
      PAGE_ANALYZED: 'page_analyzed',
      TEXT_EXTRACTED: 'text_extracted',
      REQUEST_SUMMARY: 'request_summary',
      DETECTION_STATUS: 'detection_status'
    },
    
    BACKGROUND_TO_CONTENT: {
      START_ANALYSIS: 'start_analysis',
      GET_PAGE_TEXT: 'get_page_text',
      INJECT_UI: 'inject_ui'
    },
    
    POPUP_TO_BACKGROUND: {
      GET_STATUS: 'get_status',
      GET_SUMMARY: 'get_summary',
      ASK_QUESTION: 'ask_question',
      SAVE_SETTINGS: 'save_settings'
    },
    
    BACKGROUND_TO_POPUP: {
      STATUS_UPDATE: 'status_update',
      SUMMARY_READY: 'summary_ready',
      ANSWER_READY: 'answer_ready',
      ERROR_OCCURRED: 'error_occurred'
    }
  },
  
  // Error codes
  ERROR_CODES: {
    DETECTION_FAILED: 'DETECTION_FAILED',
    EXTRACTION_FAILED: 'EXTRACTION_FAILED',
    PROCESSING_FAILED: 'PROCESSING_FAILED',
    MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
    STORAGE_ERROR: 'STORAGE_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR'
  },
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_DETECTION_TIME: 100,    // ms
    MAX_EXTRACTION_TIME: 500,   // ms
    MAX_PROCESSING_TIME: 5000,  // ms
    MAX_MEMORY_USAGE: 50,       // MB
    CACHE_CLEANUP_INTERVAL: 3600000  // 1 hour in ms
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SAFEAGREE_CONSTANTS;
} else if (typeof window !== 'undefined') {
  window.SAFEAGREE_CONSTANTS = SAFEAGREE_CONSTANTS;
}
