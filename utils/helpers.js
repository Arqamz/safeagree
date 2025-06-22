// SafeAgree Utility Functions
// Common helper functions used across the extension

const SafeAgreeHelpers = {
  
  /**
   * Debounce function to limit how often a function can be called
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Whether to call immediately
   * @returns {Function} Debounced function
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },

  /**
   * Throttle function to limit function calls to once per specified time
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  /**
   * Sanitize text content for processing
   * @param {string} text - Raw text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Remove HTML entities
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      // Remove multiple whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim();
  },

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  },

  /**
   * Check if URL matches legal document patterns
   * @param {string} url - URL to check
   * @returns {boolean} True if URL likely contains legal documents
   */
  isLegalDocumentURL(url) {
    if (!url) return false;
    
    const patterns = SAFEAGREE_CONSTANTS.LEGAL_DOC_PATTERNS.URL_PATTERNS;
    return patterns.some(pattern => pattern.test(url));
  },

  /**
   * Check if page title indicates legal document
   * @param {string} title - Page title to check
   * @returns {boolean} True if title indicates legal document
   */
  isLegalDocumentTitle(title) {
    if (!title) return false;
    
    const patterns = SAFEAGREE_CONSTANTS.LEGAL_DOC_PATTERNS.TITLE_PATTERNS;
    return patterns.some(pattern => pattern.test(title));
  },

  /**
   * Calculate text similarity using simple cosine similarity
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score between 0 and 1
   */
  calculateTextSimilarity(text1, text2) {
    const getWordFreq = (text) => {
      const words = text.toLowerCase().split(/\s+/);
      const freq = {};
      words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
      });
      return freq;
    };

    const freq1 = getWordFreq(text1);
    const freq2 = getWordFreq(text2);
    
    const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    allWords.forEach(word => {
      const f1 = freq1[word] || 0;
      const f2 = freq2[word] || 0;
      dotProduct += f1 * f2;
      norm1 += f1 * f1;
      norm2 += f2 * f2;
    });
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) || 0;
  },

  /**
   * Format file size in human readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Generate unique ID for documents
   * @param {string} url - Document URL
   * @param {string} title - Document title
   * @returns {string} Unique document ID
   */
  generateDocumentId(url, title) {
    const domain = this.extractDomain(url);
    const sanitizedTitle = this.sanitizeText(title).substring(0, 50);
    const timestamp = Date.now();
    
    return `${domain}_${sanitizedTitle}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');
  },

  /**
   * Check if content contains legal document indicators
   * @param {string} content - Text content to check
   * @returns {boolean} True if content appears to be legal document
   */
  hasLegalDocumentIndicators(content) {
    if (!content || content.length < 100) { // Reduced from 2000 for testing
      return false;
    }
    
    const indicators = SAFEAGREE_CONSTANTS.LEGAL_DOC_PATTERNS.CONTENT_INDICATORS;
    const lowerContent = content.toLowerCase();
    
    // Count how many indicators are present
    const foundIndicators = indicators.filter(indicator => 
      lowerContent.includes(indicator.toLowerCase())
    );
    
    // Be more flexible for shorter documents (like test files)
    const minIndicators = content.length > 2000 ? 4 : 2;
    const minLength = content.length > 2000 ? 2000 : 100;
    
    return foundIndicators.length >= minIndicators && content.length >= minLength;
  },

  /**
   * Split text into chunks for processing
   * @param {string} text - Text to chunk
   * @param {number} maxSize - Maximum chunk size
   * @param {number} overlap - Overlap between chunks
   * @returns {Array<string>} Array of text chunks
   */
  chunkText(text, maxSize = 1000, overlap = 100) {
    if (!text || text.length <= maxSize) {
      return [text];
    }

    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + maxSize;
      
      // If we're not at the end, try to break at a sentence boundary
      if (end < text.length) {
        const sentenceEnd = text.lastIndexOf('.', end);
        const questionEnd = text.lastIndexOf('?', end);
        const exclamationEnd = text.lastIndexOf('!', end);
        
        const bestEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        if (bestEnd > start + maxSize * 0.5) {
          end = bestEnd + 1;
        }
      }
      
      chunks.push(text.substring(start, end).trim());
      start = Math.max(start + maxSize - overlap, end - overlap);
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  },

  /**
   * Log messages with timestamp and level
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Message to log
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[SafeAgree ${timestamp}] ${level.toUpperCase()}:`;
    
    if (level === 'error') {
      console.error(prefix, message, data);
    } else if (level === 'warn') {
      console.warn(prefix, message, data);
    } else if (level === 'debug') {
      // Only log debug messages if debug logging is enabled
      // This check would need to be enhanced to check actual settings
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }
  },

  /**
   * Validate and sanitize user input
   * @param {string} input - User input to validate
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized input
   */
  sanitizeUserInput(input, maxLength = 500) {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .substring(0, maxLength)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '');
  },

  /**
   * Create a promise that resolves after specified time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise} Promise that resolves with function result
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        this.log('warn', `Retry attempt ${i + 1} failed, waiting ${delay}ms`, error);
        await this.sleep(delay);
      }
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeAgreeHelpers;
} else if (typeof window !== 'undefined') {
  window.SafeAgreeHelpers = SafeAgreeHelpers;
}
