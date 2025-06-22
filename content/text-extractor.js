// SafeAgree Text Extractor
// Extracts and processes text content from legal documents

class SafeAgreeTextExtractor {
  constructor() {
    this.isInitialized = false;
    this.extractionCache = new Map();
    this.lastExtraction = null;
  }

  /**
   * Initialize the text extractor
   */
  init() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    SafeAgreeHelpers.log('info', 'Text extractor initialized');
  }

  /**
   * Extract full text content from the current page
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted text data
   */
  extractPageText(options = {}) {
    const startTime = performance.now();
    
    try {
      const defaultOptions = {
        includeMetadata: true,
        cleanText: true,
        chunkText: true,
        preserveStructure: true,
        maxLength: SAFEAGREE_CONSTANTS.TEXT_PROCESSING.MAX_DOCUMENT_LENGTH
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // Check cache
      const url = window.location.href;
      const cacheKey = `${url}_${JSON.stringify(opts)}`;
      
      if (this.extractionCache.has(cacheKey)) {
        SafeAgreeHelpers.log('debug', 'Using cached extraction result');
        return this.extractionCache.get(cacheKey);
      }
      
      const extraction = {
        success: true,
        url: url,
        title: document.title,
        timestamp: Date.now(),
        content: {
          raw: '',
          cleaned: '',
          chunks: [],
          sections: []
        },
        metadata: {
          wordCount: 0,
          charCount: 0,
          readingTime: 0,
          language: 'en',
          lastUpdated: null
        },
        structure: {
          headings: [],
          sections: [],
          lists: [],
          tables: []
        }
      };

      // Extract raw content
      extraction.content.raw = this.extractRawContent();
      
      // Be more flexible for test files and local development
      const isTestFile = url.includes('test') || url.includes('localhost');
      const minLength = isTestFile ? 100 : SAFEAGREE_CONSTANTS.TEXT_PROCESSING.MIN_DOCUMENT_LENGTH;
      
      if (!extraction.content.raw || extraction.content.raw.length < minLength) {
        throw new Error(`Insufficient content extracted (${extraction.content.raw?.length || 0} chars, need ${minLength})`);
      }

      // Clean text if requested
      if (opts.cleanText) {
        extraction.content.cleaned = this.cleanText(extraction.content.raw);
      } else {
        extraction.content.cleaned = extraction.content.raw;
      }

      // Truncate if too long
      if (extraction.content.cleaned.length > opts.maxLength) {
        extraction.content.cleaned = extraction.content.cleaned.substring(0, opts.maxLength);
        SafeAgreeHelpers.log('warn', `Text truncated to ${opts.maxLength} characters`);
      }

      // Extract metadata
      if (opts.includeMetadata) {
        extraction.metadata = this.extractMetadata(extraction.content.cleaned);
      }

      // Preserve structure
      if (opts.preserveStructure) {
        extraction.structure = this.extractStructure();
        extraction.content.sections = this.extractSections(extraction.structure);
      }

      // Chunk text
      if (opts.chunkText) {
        extraction.content.chunks = this.chunkContent(
          extraction.content.cleaned,
          extraction.structure
        );
      }

      // Cache the result
      this.extractionCache.set(cacheKey, extraction);
      this.lastExtraction = extraction;
      
      const endTime = performance.now();
      SafeAgreeHelpers.log('info', `Text extraction completed in ${(endTime - startTime).toFixed(2)}ms`, {
        wordCount: extraction.metadata.wordCount,
        chunkCount: extraction.content.chunks.length
      });
      
      return extraction;
      
    } catch (error) {
      SafeAgreeHelpers.log('error', 'Text extraction failed', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Extract raw text content from the page
   * @returns {string} Raw text content
   */
  extractRawContent() {
    // Create a clone to avoid modifying the original DOM
    const clone = document.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.navigation',
      '.menu',
      '.sidebar',
      '.advertisement',
      '.ads',
      '[class*="ad-"]',
      '[id*="ad-"]',
      '.cookie-banner',
      '.popup',
      '.modal'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Try to find main content area
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '#content',
      '#main',
      'article',
      '.legal-content',
      '.terms-content',
      '.policy-content'
    ];
    
    let mainContent = null;
    for (const selector of mainSelectors) {
      mainContent = clone.querySelector(selector);
      if (mainContent && mainContent.textContent.length > 500) {
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = clone.body;
    }
    
    return mainContent ? mainContent.textContent || '' : '';
  }

  /**
   * Clean and normalize text content
   * @param {string} rawText - Raw text to clean
   * @returns {string} Cleaned text
   */
  cleanText(rawText) {
    if (!rawText) return '';
    
    let cleaned = rawText;
    
    // Remove extra whitespace and normalize
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    // Remove common noise patterns
    const noisePatterns = SAFEAGREE_CONSTANTS.TEXT_PROCESSING.NOISE_PATTERNS;
    noisePatterns.forEach(pattern => {
      if (pattern.global) {
        cleaned = cleaned.replace(pattern, ' ');
      }
    });
    
    // Fix common formatting issues
    cleaned = cleaned
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')  // Ensure space after sentences
      .replace(/([a-z])([A-Z])/g, '$1 $2')     // Add space between camelCase
      .replace(/\s+/g, ' ')                     // Normalize whitespace again
      .trim();
    
    return cleaned;
  }

  /**
   * Extract metadata from text content
   * @param {string} text - Text to analyze
   * @returns {Object} Metadata object
   */
  extractMetadata(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const chars = text.length;
    
    // Calculate reading time (average 200 words per minute)
    const readingTime = Math.ceil(words.length / 200);
    
    // Try to detect language (simple heuristic)
    const language = this.detectLanguage(text);
    
    // Look for last updated date
    const lastUpdated = this.extractLastUpdatedDate(text);
    
    return {
      wordCount: words.length,
      charCount: chars,
      readingTime: readingTime,
      language: language,
      lastUpdated: lastUpdated
    };
  }

  /**
   * Extract document structure (headings, sections, etc.)
   * @returns {Object} Structure information
   */
  extractStructure() {
    const structure = {
      headings: [],
      sections: [],
      lists: [],
      tables: []
    };
    
    // Extract headings
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    structure.headings = Array.from(headingElements).map((heading, index) => ({
      id: `heading_${index}`,
      level: parseInt(heading.tagName.charAt(1)),
      text: SafeAgreeHelpers.sanitizeText(heading.textContent),
      position: this.getElementPosition(heading)
    }));
    
    // Extract lists
    const listElements = document.querySelectorAll('ul, ol');
    structure.lists = Array.from(listElements).map((list, index) => ({
      id: `list_${index}`,
      type: list.tagName.toLowerCase(),
      items: Array.from(list.querySelectorAll('li')).map(li => 
        SafeAgreeHelpers.sanitizeText(li.textContent)
      ),
      position: this.getElementPosition(list)
    }));
    
    // Extract tables
    const tableElements = document.querySelectorAll('table');
    structure.tables = Array.from(tableElements).map((table, index) => ({
      id: `table_${index}`,
      headers: Array.from(table.querySelectorAll('th')).map(th => 
        SafeAgreeHelpers.sanitizeText(th.textContent)
      ),
      rows: table.querySelectorAll('tr').length,
      position: this.getElementPosition(table)
    }));
    
    return structure;
  }

  /**
   * Extract sections based on document structure
   * @param {Object} structure - Document structure
   * @returns {Array} Array of sections
   */
  extractSections(structure) {
    if (!structure.headings || structure.headings.length === 0) {
      return [{
        id: 'main_section',
        title: 'Main Content',
        content: this.extractRawContent(),
        level: 1
      }];
    }
    
    const sections = [];
    const headings = structure.headings;
    
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      
      // Find content between this heading and the next
      let sectionContent = '';
      
      try {
        const headingElement = document.querySelector(`h${heading.level}`);
        if (headingElement) {
          sectionContent = this.extractContentBetweenElements(
            headingElement,
            nextHeading ? document.querySelector(`h${nextHeading.level}`) : null
          );
        }
      } catch (error) {
        SafeAgreeHelpers.log('warn', 'Failed to extract section content', error);
      }
      
      sections.push({
        id: `section_${i}`,
        title: heading.text,
        content: sectionContent,
        level: heading.level,
        position: heading.position
      });
    }
    
    return sections;
  }

  /**
   * Chunk content intelligently based on structure and semantics
   * @param {string} text - Text to chunk
   * @param {Object} structure - Document structure
   * @returns {Array} Array of text chunks
   */
  chunkContent(text, structure) {
    const maxChunkSize = SAFEAGREE_CONSTANTS.TEXT_PROCESSING.MAX_CHUNK_SIZE;
    const minChunkSize = SAFEAGREE_CONSTANTS.TEXT_PROCESSING.MIN_CHUNK_SIZE;
    const overlapSize = SAFEAGREE_CONSTANTS.TEXT_PROCESSING.OVERLAP_SIZE;
    
    // If we have good structure, use section-based chunking
    if (structure.headings && structure.headings.length > 3) {
      return this.chunkByStructure(text, structure, maxChunkSize);
    }
    
    // Otherwise, use semantic chunking
    return this.chunkBySentences(text, maxChunkSize, minChunkSize, overlapSize);
  }

  /**
   * Chunk text based on document structure
   * @param {string} text - Text to chunk
   * @param {Object} structure - Document structure
   * @param {number} maxSize - Maximum chunk size
   * @returns {Array} Array of chunks
   */
  chunkByStructure(text, structure, maxSize) {
    const chunks = [];
    
    // Use sections if available
    if (structure.sections && structure.sections.length > 0) {
      structure.sections.forEach((section, index) => {
        if (section.content && section.content.length > 0) {
          if (section.content.length <= maxSize) {
            chunks.push({
              id: `chunk_section_${index}`,
              text: section.content,
              type: 'section',
              title: section.title,
              metadata: {
                sectionId: section.id,
                level: section.level
              }
            });
          } else {
            // Split large sections
            const subChunks = SafeAgreeHelpers.chunkText(section.content, maxSize);
            subChunks.forEach((chunk, subIndex) => {
              chunks.push({
                id: `chunk_section_${index}_${subIndex}`,
                text: chunk,
                type: 'section_part',
                title: `${section.title} (Part ${subIndex + 1})`,
                metadata: {
                  sectionId: section.id,
                  level: section.level,
                  partIndex: subIndex
                }
              });
            });
          }
        }
      });
    }
    
    return chunks.length > 0 ? chunks : this.chunkBySentences(text, maxSize);
  }

  /**
   * Chunk text by sentences with semantic boundaries
   * @param {string} text - Text to chunk
   * @param {number} maxSize - Maximum chunk size
   * @param {number} minSize - Minimum chunk size
   * @param {number} overlap - Overlap between chunks
   * @returns {Array} Array of chunks
   */
  chunkBySentences(text, maxSize = 1000, minSize = 200, overlap = 100) {
    const sentences = this.splitIntoSentences(text);
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        // Current chunk is full, save it if it meets minimum size
        if (currentChunk.length >= minSize) {
          chunks.push({
            id: `chunk_${chunkIndex++}`,
            text: currentChunk.trim(),
            type: 'semantic',
            metadata: {
              sentenceStart: Math.max(0, i - currentChunk.split('.').length),
              sentenceEnd: i - 1
            }
          });
          
          // Start new chunk with overlap
          const overlapSentences = this.getLastSentences(currentChunk, overlap);
          currentChunk = overlapSentences + (overlapSentences ? ' ' : '') + sentence;
        } else {
          // Current chunk too small, just add the sentence
          currentChunk = potentialChunk;
        }
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length >= minSize) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        type: 'semantic',
        metadata: {
          sentenceStart: Math.max(0, sentences.length - currentChunk.split('.').length),
          sentenceEnd: sentences.length - 1
        }
      });
    }
    
    return chunks;
  }

  /**
   * Split text into sentences
   * @param {string} text - Text to split
   * @returns {Array} Array of sentences
   */
  splitIntoSentences(text) {
    // Simple sentence splitting - could be enhanced with NLP library
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10); // Filter out very short "sentences"
  }

  /**
   * Get last sentences up to a character limit
   * @param {string} text - Text to extract from
   * @param {number} maxLength - Maximum length
   * @returns {string} Last sentences
   */
  getLastSentences(text, maxLength) {
    const sentences = this.splitIntoSentences(text);
    let result = '';
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i];
      if ((result + sentence).length <= maxLength) {
        result = sentence + (result ? '. ' + result : '');
      } else {
        break;
      }
    }
    
    return result;
  }

  /**
   * Get element position in document
   * @param {Element} element - DOM element
   * @returns {Object} Position information
   */
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      right: rect.right + window.scrollX
    };
  }

  /**
   * Extract content between two elements
   * @param {Element} startElement - Start element
   * @param {Element} endElement - End element (null for end of document)
   * @returns {string} Content between elements
   */
  extractContentBetweenElements(startElement, endElement) {
    let content = '';
    let currentElement = startElement.nextElementSibling;
    
    while (currentElement && currentElement !== endElement) {
      content += currentElement.textContent + ' ';
      currentElement = currentElement.nextElementSibling;
    }
    
    return SafeAgreeHelpers.sanitizeText(content);
  }

  /**
   * Simple language detection
   * @param {string} text - Text to analyze
   * @returns {string} Detected language code
   */
  detectLanguage(text) {
    // Very simple language detection - could be enhanced
    const commonEnglishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    
    const englishWordCount = words.filter(word => 
      commonEnglishWords.includes(word)
    ).length;
    
    // If more than 2% of words are common English words, assume English
    return (englishWordCount / words.length) > 0.02 ? 'en' : 'unknown';
  }

  /**
   * Extract last updated date from text
   * @param {string} text - Text to search
   * @returns {string|null} Last updated date
   */
  extractLastUpdatedDate(text) {
    const datePatterns = [
      /last\s+updated:?\s*([^.\n]+)/i,
      /effective\s+date:?\s*([^.\n]+)/i,
      /revised:?\s*([^.\n]+)/i,
      /updated\s+on:?\s*([^.\n]+)/i,
      /last\s+modified:?\s*([^.\n]+)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Get cached extraction result
   * @returns {Object|null} Last extraction result
   */
  getLastExtraction() {
    return this.lastExtraction;
  }

  /**
   * Clear extraction cache
   */
  clearCache() {
    this.extractionCache.clear();
    this.lastExtraction = null;
    SafeAgreeHelpers.log('info', 'Extraction cache cleared');
  }
}

// Create global instance
const textExtractor = new SafeAgreeTextExtractor();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeAgreeTextExtractor;
} else if (typeof window !== 'undefined') {
  window.SafeAgreeTextExtractor = SafeAgreeTextExtractor;
  window.textExtractor = textExtractor;
}
