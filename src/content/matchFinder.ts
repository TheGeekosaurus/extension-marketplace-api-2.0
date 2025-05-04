function extractWalmartPrice(element: Element): number | null {
  try {
    // Look specifically for the w_iUH7 element with current price format
    const priceSpan = element.querySelector('span.w_iUH7');
    if (priceSpan && priceSpan.textContent) {
      const priceText = priceSpan.textContent;
      console.log('[E-commerce Arbitrage] Raw price text:', priceText);
      
      // Check if the text contains a price format like "$4.97"
      const match = priceText.match(/\$\s*(\d+\.\d{2})/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
      
      // If it's just a number without a decimal but seems like a price (e.g. "497")
      // and is likely less than 100 (most items aren't thousands of dollars)
      if (/^\$?\s*\d{3,4}$/.test(priceText.replace(/[^0-9$]/g, ''))) {
        const digits = priceText.replace(/[^0-9]/g, '');
        if (digits.length === 3) {
          // For 3 digits like "497", assume it's "$4.97"
          return parseFloat(`${digits.charAt(0)}.${digits.substring(1)}`);
        } else if (digits.length === 4 && digits.charAt(0) !== '0') {
          // For 4 digits like "1299", assume it's "$12.99"
          return parseFloat(`${digits.substring(0, 2)}.${digits.substring(2)}`);
        }
      }
    }
    
    // Try other selectors and approaches
    const priceSelectors = [
      '[data-automation-id="product-price"]',
      '.b.black.f1.mr1',
      'span.w_iUH',
      '[data-testid="price-current"]',
      'span[data-automation-id="current-price"]',
      '[class*="price"]'
    ];
    
    for (const selector of priceSelectors) {
      const priceElement = element.querySelector(selector);
      if (priceElement && priceElement.textContent) {
        const priceText = priceElement.textContent.trim();
        console.log('[E-commerce Arbitrage] Price text from selector:', selector, priceText);
        
        // Check for obvious price format with dollar sign and decimal
        const match = priceText.match(/\$\s*(\d+\.\d{2})/);
        if (match && match[1]) {
          return parseFloat(match[1]);
        }
        
        // If it's a 3-digit number and likely a price under $10
        if (/^\$?\s*\d{3}$/.test(priceText.replace(/[^0-9$]/g, ''))) {
          const digits = priceText.replace(/[^0-9]/g, '');
          return parseFloat(`${digits.charAt(0)}.${digits.substring(1)}`);
        }
        
        // If it's a 4-digit number and likely a price under $100
        if (/^\$?\s*\d{4}$/.test(priceText.replace(/[^0-9$]/g, ''))) {
          const digits = priceText.replace(/[^0-9]/g, '');
          return parseFloat(`${digits.substring(0, 2)}.${digits.substring(2)}`);
        }
      }
    }
    
    // Try looking at all spans with dollar signs
    const allSpans = element.querySelectorAll('span');
    for (const span of Array.from(allSpans)) {
      const text = span.textContent || '';
      if (text.includes('$')) {
        console.log('[E-commerce Arbitrage] Found span with $:', text);
        const match = text.match(/\$\s*(\d+\.\d{2})/);
        if (match && match[1]) {
          return parseFloat(match[1]);
        }
        
        // If it's a number without decimal but has a dollar sign
        if (/^\$\s*\d{3,4}$/.test(text.trim())) {
          const digits = text.replace(/[^0-9]/g, '');
          if (digits.length === 3) {
            return parseFloat(`${digits.charAt(0)}.${digits.substring(1)}`);
          } else if (digits.length === 4) {
            return parseFloat(`${digits.substring(0, 2)}.${digits.substring(2)}`);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error extracting Walmart price:', error);
    return null;
  }
}
