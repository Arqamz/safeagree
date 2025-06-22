// SafeAgree Constants
// Core configuration and constants for the extension

const SAFEAGREE_CONSTANTS = {
  // Extension identification
  EXTENSION_ID: 'safeagree',
  VERSION: '0.1.0',
  
  // Page detection patterns
  LEGAL_DOC_PATTERNS: {
    // URL patterns that typically contain legal documents - be very specific
    URL_PATTERNS: [
      /\/terms[-_]?(of[-_]?)?(?:service|use)(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/privacy[-_]?policy(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/cookie[-_]?policy(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/legal(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/tos(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/eula(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/user[-_]?agreement(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/acceptable[-_]?use(?:\.html?)?(?:[\/\?#]|$)/i,
      /\/end[-_]?user[-_]?license(?:\.html?)?(?:[\/\?#]|$)/i,
      // Support test files
      /test[-_]?privacy/i,
      /test[-_]?terms/i,
      /privacy[-_]?simple/i
    ],
    
    // Page title patterns - be more specific
    TITLE_PATTERNS: [
      /^terms\s+(of\s+)?(service|use)\s*[-|]?/i,
      /^privacy\s+policy\s*[-|]?/i,
      /^cookie\s+policy\s*[-|]?/i,
      /^user\s+agreement\s*[-|]?/i,
      /^end\s+user\s+license\s+agreement\s*[-|]?/i,
      /^acceptable\s+use\s+policy\s*[-|]?/i,
      /^legal\s+(notice|disclaimer)\s*[-|]?/i
    ],
    
    // Content indicators - require multiple matches
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
      'legal obligations',
      'governing law',
      'intellectual property',
      'limitation of liability',
      'contact information',
      'data processing',
      'collect information',
      'third parties',
      'privacy laws'
    ]
  },
  
  // Text processing settings
  TEXT_PROCESSING: {
    MIN_CHUNK_SIZE: 200,
    MAX_CHUNK_SIZE: 1000,
    OVERLAP_SIZE: 100,
    MIN_DOCUMENT_LENGTH: 2000,  // Increased from 500 to be more strict
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
    POPUP_TO_CONTENT: {
      GET_STATUS: 'get_status',
      GET_CHUNKS: 'get_chunks',
      EXTRACT_TEXT: 'extract_text'
    },
    
    CONTENT_TO_POPUP: {
      STATUS_UPDATE: 'status_update',
      CHUNKS_READY: 'chunks_ready',
      TEXT_EXTRACTED: 'text_extracted'
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
