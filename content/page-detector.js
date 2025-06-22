// SafeAgree Page Detector
// Detects legal documents (Terms of Service, Privacy Policies, etc.) on web pages

class SafeAgreePageDetector {
  constructor() {
    this.isInitialized = false;
    this.detectionCache = new Map();
    this.lastAnalysis = null;
  }

  /**
   * Initialize the page detector
   */
  init() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    SafeAgreeHelpers.log('info', 'Page detector initialized');
  }

  /**
   * Analyze the current page to determine if it contains legal documents
   * @returns {Object} Analysis result with detection status and metadata
   */
  analyzePage() {
    const startTime = performance.now();
    
    try {
      const url = window.location.href;
      const title = document.title;
      const domain = SafeAgreeHelpers.extractDomain(url);
      
      // Early exit for obvious non-legal pages
      if (this.isObviouslyNotLegal(url, title)) {
        return {
          isLegalDocument: false,
          confidence: 0,
          documentType: null,
          url: url,
          title: title,
          domain: domain,
          timestamp: Date.now(),
          indicators: {
            urlMatch: false,
            titleMatch: false,
            contentMatch: false,
            structuralMatch: false
          }
        };
      }
      
      // Check cache first
      const cacheKey = `${domain}_${title}`;
      if (this.detectionCache.has(cacheKey)) {
        SafeAgreeHelpers.log('debug', 'Using cached detection result', { url });
        return this.detectionCache.get(cacheKey);
      }
      
      const analysis = {
        isLegalDocument: false,
        confidence: 0,
        documentType: null,
        url: url,
        title: title,
        domain: domain,
        timestamp: Date.now(),
        indicators: {
          urlMatch: false,
          titleMatch: false,
          contentMatch: false,
          structuralMatch: false
        },
        metadata: {
          wordCount: 0,
          sectionCount: 0,
          hasTableOfContents: false,
          lastUpdated: null
        }
      };

      // 1. URL-based detection
      analysis.indicators.urlMatch = SafeAgreeHelpers.isLegalDocumentURL(url);
      if (analysis.indicators.urlMatch) {
        analysis.confidence += 0.4;
        analysis.documentType = this.getDocumentTypeFromURL(url);
      }

      // 2. Title-based detection
      analysis.indicators.titleMatch = SafeAgreeHelpers.isLegalDocumentTitle(title);
      if (analysis.indicators.titleMatch) {
        analysis.confidence += 0.3;
        if (!analysis.documentType) {
          analysis.documentType = this.getDocumentTypeFromTitle(title);
        }
      }

      // 3. Content-based detection (if URL, title match, OR for test files)
      const isTestFile = url.includes('test') || url.includes('localhost');
      if (analysis.indicators.urlMatch || analysis.indicators.titleMatch || isTestFile) {
        const contentAnalysis = this.analyzePageContent();
        analysis.indicators.contentMatch = contentAnalysis.hasLegalIndicators;
        analysis.metadata = { ...analysis.metadata, ...contentAnalysis.metadata };
        
        if (analysis.indicators.contentMatch) {
          analysis.confidence += 0.2;
        }

        // 4. Structural analysis (only if we have other indicators)
        const structuralAnalysis = this.analyzePageStructure();
        analysis.indicators.structuralMatch = structuralAnalysis.isLegalStructure;
        analysis.metadata.hasTableOfContents = structuralAnalysis.hasTableOfContents;
        analysis.metadata.sectionCount = structuralAnalysis.sectionCount;
        
        if (analysis.indicators.structuralMatch) {
          analysis.confidence += 0.1;
        }
      }

      // Final determination - be flexible for strong title matches
      analysis.isLegalDocument = (
        (analysis.confidence >= 0.6 && analysis.indicators.urlMatch) ||
        (analysis.confidence >= 0.5 && analysis.indicators.titleMatch && analysis.indicators.structuralMatch)
      );
      
      // Cache the result
      this.detectionCache.set(cacheKey, analysis);
      this.lastAnalysis = analysis;
      
      const endTime = performance.now();
      SafeAgreeHelpers.log('info', `Page analysis completed in ${(endTime - startTime).toFixed(2)}ms`, {
        isLegal: analysis.isLegalDocument,
        confidence: analysis.confidence,
        type: analysis.documentType
      });
      
      return analysis;
      
    } catch (error) {
      SafeAgreeHelpers.log('error', 'Page analysis failed', error);
      return {
        isLegalDocument: false,
        confidence: 0,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Quick check for obviously non-legal pages
   * @param {string} url - Page URL
   * @param {string} title - Page title
   * @returns {boolean} True if obviously not a legal document
   */
  isObviouslyNotLegal(url, title) {
    const nonLegalPatterns = [
      /search/i,
      /results/i,
      /google\./i,
      /bing\./i,
      /facebook\./i,
      /twitter\./i,
      /instagram\./i,
      /youtube\./i,
      /reddit\./i,
      /news/i,
      /blog/i,
      /forum/i,
      /shop/i,
      /store/i,
      /cart/i,
      /checkout/i
    ];
    
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    return nonLegalPatterns.some(pattern => 
      pattern.test(urlLower) || pattern.test(titleLower)
    );
  }

  /**
   * Get document type from URL patterns
   * @param {string} url - URL to analyze
   * @returns {string|null} Document type or null
   */
  getDocumentTypeFromURL(url) {
    const urlLower = url.toLowerCase();
    
    if (/privacy/i.test(urlLower)) return 'privacy_policy';
    if (/terms/i.test(urlLower)) return 'terms_of_service';
    if (/cookie/i.test(urlLower)) return 'cookie_policy';
    if (/eula/i.test(urlLower)) return 'eula';
    if (/legal/i.test(urlLower)) return 'legal_notice';
    
    return 'legal_document';
  }

  /**
   * Get document type from page title
   * @param {string} title - Page title to analyze
   * @returns {string|null} Document type or null
   */
  getDocumentTypeFromTitle(title) {
    const titleLower = title.toLowerCase();
    
    if (/privacy\s+policy/i.test(titleLower)) return 'privacy_policy';
    if (/terms\s+(of\s+)?(service|use)/i.test(titleLower)) return 'terms_of_service';
    if (/cookie\s+policy/i.test(titleLower)) return 'cookie_policy';
    if (/user\s+agreement/i.test(titleLower)) return 'user_agreement';
    if (/end\s+user\s+license/i.test(titleLower)) return 'eula';
    
    return 'legal_document';
  }

  /**
   * Analyze page content for legal document indicators
   * @returns {Object} Content analysis result
   */
  analyzePageContent() {
    // Use a lightweight approach - just get text from body without deep processing
    const bodyText = document.body ? document.body.textContent : '';
    const wordCount = bodyText.split(/\s+/).length;
    
    // Quick check for legal indicators
    const hasLegalIndicators = SafeAgreeHelpers.hasLegalDocumentIndicators(bodyText);
    
    // Extract last updated date quickly
    const lastUpdated = this.extractLastUpdatedDate(bodyText.substring(0, 2000)); // Only check first 2000 chars
    
    return {
      hasLegalIndicators: hasLegalIndicators,
      metadata: {
        wordCount: wordCount,
        foundLegalPhrases: 0, // Skip phrase counting for performance
        lastUpdated: lastUpdated
      }
    };
  }

  /**
   * Analyze page structure for legal document patterns
   * @returns {Object} Structural analysis result
   */
  analyzePageStructure() {
    // Look for common legal document structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const sectionCount = headings.length;
    
    // Check for table of contents
    const tocSelectors = [
      '[class*="toc"]',
      '[id*="toc"]',
      '[class*="contents"]',
      '[class*="index"]',
      '.table-of-contents'
    ];
    
    const hasTableOfContents = tocSelectors.some(selector => 
      document.querySelector(selector) !== null
    );
    
    // Look for numbered sections
    const numberedSections = Array.from(headings).filter(heading => 
      /^\s*\d+\./.test(heading.textContent)
    ).length;
    
    // Check for legal document specific sections
    const legalSectionPatterns = [
      /acceptance\s+of\s+terms/i,
      /use\s+of\s+service/i,
      /user\s+conduct/i,
      /intellectual\s+property/i,
      /privacy\s+and\s+data/i,
      /termination/i,
      /disclaimer/i,
      /limitation\s+of\s+liability/i,
      /governing\s+law/i
    ];
    
    const legalSections = Array.from(headings).filter(heading => 
      legalSectionPatterns.some(pattern => pattern.test(heading.textContent))
    ).length;
    
    const isLegalStructure = (
      sectionCount >= 5 && 
      (numberedSections >= 3 || legalSections >= 2 || hasTableOfContents)
    );
    
    return {
      isLegalStructure,
      sectionCount,
      hasTableOfContents,
      numberedSections,
      legalSections
    };
  }

  /**
   * Extract main text content from the page
   * @returns {string} Main text content
   */
  extractMainTextContent() {
    // Create a clone to avoid modifying the original DOM
    const clone = document.cloneNode(true);
    
    // Remove unwanted elements from the clone
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
      '[id*="ad-"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Try to find main content area in the clone
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '#content',
      '#main',
      'article'
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
    
    return SafeAgreeHelpers.sanitizeText(mainContent.textContent || '');
  }

  /**
   * Extract last updated date from content
   * @param {string} content - Text content to search
   * @returns {string|null} Last updated date or null
   */
  extractLastUpdatedDate(content) {
    const datePatterns = [
      /last\s+updated:?\s*([^.]+)/i,
      /effective\s+date:?\s*([^.]+)/i,
      /revised:?\s*([^.]+)/i,
      /updated\s+on:?\s*([^.]+)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Check if current page is a legal document
   * @returns {boolean} True if page is detected as legal document
   */
  isCurrentPageLegalDocument() {
    if (!this.lastAnalysis) {
      this.analyzePage();
    }
    return this.lastAnalysis?.isLegalDocument || false;
  }

  /**
   * Get cached analysis result
   * @returns {Object|null} Last analysis result or null
   */
  getLastAnalysis() {
    return this.lastAnalysis;
  }

  /**
   * Clear detection cache
   */
  clearCache() {
    this.detectionCache.clear();
    this.lastAnalysis = null;
    SafeAgreeHelpers.log('info', 'Detection cache cleared');
  }
}

// Create global instance
const pageDetector = new SafeAgreePageDetector();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeAgreePageDetector;
} else if (typeof window !== 'undefined') {
  window.SafeAgreePageDetector = SafeAgreePageDetector;
  window.pageDetector = pageDetector;
}
