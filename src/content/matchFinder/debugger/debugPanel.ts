// src/content/matchFinder/debugger/debugPanel.ts
// Debug panel for visualizing the matching process

import { ProductMatchResult } from '../core/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('DebugPanel');

// Styles for the debug panel
const STYLES = `
.em-debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  max-height: 80vh;
  background-color: rgba(255, 255, 255, 0.95);
  border: 2px solid #3498db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  transition: all 0.3s ease;
}

.em-debug-header {
  background-color: #3498db;
  color: white;
  padding: 8px 12px;
  font-weight: bold;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.em-debug-controls {
  display: flex;
  gap: 8px;
}

.em-debug-control {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.em-debug-control:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.em-debug-content {
  padding: 12px;
  overflow-y: auto;
  max-height: calc(80vh - 40px);
}

.em-debug-section {
  margin-bottom: 16px;
}

.em-debug-section-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 4px;
}

.em-debug-source-product {
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.em-debug-matches {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.em-debug-match {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  position: relative;
}

.em-debug-match-score {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #3498db;
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
}

.em-debug-match-title {
  font-weight: bold;
  margin-bottom: 4px;
  padding-right: 50px;
}

.em-debug-match-price {
  color: #e74c3c;
  font-weight: bold;
}

.em-debug-match-url {
  font-size: 12px;
  color: #7f8c8d;
  word-break: break-all;
  margin-top: 4px;
}

.em-debug-match-image {
  width: 60px;
  height: 60px;
  object-fit: contain;
  margin-right: 8px;
  float: left;
}

.em-debug-logs {
  font-family: monospace;
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.em-debug-log {
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.em-debug-log-error {
  color: #e74c3c;
}

.em-debug-log-warn {
  color: #f39c12;
}

.em-debug-log-info {
  color: #2980b9;
}

.em-debug-log-debug {
  color: #7f8c8d;
}

.em-debug-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 12px;
}

.em-debug-tab {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.em-debug-tab.active {
  border-bottom-color: #3498db;
  font-weight: bold;
}

.em-debug-tab:hover {
  background-color: #f8f9fa;
}

.em-debug-tab-content {
  display: none;
}

.em-debug-tab-content.active {
  display: block;
}

.em-debug-timing {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 8px;
}

.em-debug-collapse {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background-color: #3498db;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10001;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  font-weight: bold;
  font-size: 20px;
  display: none;
}

.em-debug-highlight-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 4px;
}

.em-debug-highlight-button:hover {
  background-color: #2980b9;
}
`;

/**
 * Debug Panel class for visualizing matching process
 */
export class DebugPanel {
  private panelElement: HTMLDivElement | null = null;
  private contentElement: HTMLDivElement | null = null;
  private logs: string[] = [];
  private matches: ProductMatchResult[] = [];
  private sourceProduct: any | null = null;
  private collapsed = false;
  private collapseButton: HTMLDivElement | null = null;
  private dragOffset = { x: 0, y: 0 };
  private isDragging = false;
  
  /**
   * Create a new debug panel
   */
  constructor() {
    this.injectStyles();
  }
  
  /**
   * Inject CSS styles for the debug panel
   */
  private injectStyles(): void {
    const styleElement = document.createElement('style');
    styleElement.textContent = STYLES;
    document.head.appendChild(styleElement);
    logger.debug('Debug panel styles injected');
  }
  
  /**
   * Initialize the debug panel
   */
  public initialize(): void {
    if (this.panelElement) {
      return;
    }
    
    // Create panel element
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'em-debug-panel';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'em-debug-header';
    header.textContent = 'E-commerce Arbitrage Debug';
    
    // Add controls
    const controls = document.createElement('div');
    controls.className = 'em-debug-controls';
    
    const collapseButton = document.createElement('button');
    collapseButton.className = 'em-debug-control';
    collapseButton.innerHTML = '&minus;';
    collapseButton.title = 'Collapse';
    collapseButton.addEventListener('click', () => this.toggleCollapse());
    
    const closeButton = document.createElement('button');
    closeButton.className = 'em-debug-control';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', () => this.close());
    
    controls.appendChild(collapseButton);
    controls.appendChild(closeButton);
    header.appendChild(controls);
    
    // Make header draggable
    header.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.endDrag());
    
    this.panelElement.appendChild(header);
    
    // Create content
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'em-debug-content';
    
    // Create tabs
    const tabs = document.createElement('div');
    tabs.className = 'em-debug-tabs';
    
    const matchesTab = document.createElement('div');
    matchesTab.className = 'em-debug-tab active';
    matchesTab.textContent = 'Matches';
    matchesTab.dataset.tab = 'matches';
    
    const logsTab = document.createElement('div');
    logsTab.className = 'em-debug-tab';
    logsTab.textContent = 'Logs';
    logsTab.dataset.tab = 'logs';
    
    tabs.appendChild(matchesTab);
    tabs.appendChild(logsTab);
    
    // Add tab click handlers
    tabs.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('em-debug-tab')) {
        this.activateTab(target.dataset.tab as string);
      }
    });
    
    this.contentElement.appendChild(tabs);
    
    // Create tab content containers
    const matchesContent = document.createElement('div');
    matchesContent.className = 'em-debug-tab-content active';
    matchesContent.dataset.tab = 'matches';
    
    const logsContent = document.createElement('div');
    logsContent.className = 'em-debug-tab-content';
    logsContent.dataset.tab = 'logs';
    
    this.contentElement.appendChild(matchesContent);
    this.contentElement.appendChild(logsContent);
    
    this.panelElement.appendChild(this.contentElement);
    
    // Create collapse button
    this.collapseButton = document.createElement('div');
    this.collapseButton.className = 'em-debug-collapse';
    this.collapseButton.textContent = '+';
    this.collapseButton.addEventListener('click', () => this.toggleCollapse());
    
    // Add to document
    document.body.appendChild(this.panelElement);
    document.body.appendChild(this.collapseButton);
    
    logger.debug('Debug panel initialized');
  }
  
  /**
   * Start dragging the panel
   */
  private startDrag(e: MouseEvent): void {
    if (!this.panelElement) return;
    
    this.isDragging = true;
    const rect = this.panelElement.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    this.panelElement.style.transition = 'none';
    e.preventDefault();
  }
  
  /**
   * Handle panel dragging
   */
  private drag(e: MouseEvent): void {
    if (!this.isDragging || !this.panelElement) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    this.panelElement.style.left = `${x}px`;
    this.panelElement.style.top = `${y}px`;
    this.panelElement.style.right = 'auto';
    
    if (this.collapseButton) {
      this.collapseButton.style.left = `${x}px`;
      this.collapseButton.style.top = `${y}px`;
      this.collapseButton.style.right = 'auto';
    }
  }
  
  /**
   * End panel dragging
   */
  private endDrag(): void {
    if (!this.panelElement) return;
    
    this.isDragging = false;
    this.panelElement.style.transition = 'all 0.3s ease';
  }
  
  /**
   * Toggle collapse state of the panel
   */
  private toggleCollapse(): void {
    if (!this.panelElement || !this.collapseButton) return;
    
    this.collapsed = !this.collapsed;
    
    if (this.collapsed) {
      this.panelElement.style.display = 'none';
      this.collapseButton.style.display = 'flex';
    } else {
      this.panelElement.style.display = 'block';
      this.collapseButton.style.display = 'none';
    }
  }
  
  /**
   * Activate a specific tab
   */
  private activateTab(tabName: string): void {
    if (!this.contentElement) return;
    
    // Update tab buttons
    const tabs = this.contentElement.querySelectorAll('.em-debug-tab');
    tabs.forEach(tab => {
      const htmlTab = tab as HTMLElement;
      if (htmlTab.dataset.tab === tabName) {
        htmlTab.classList.add('active');
      } else {
        htmlTab.classList.remove('active');
      }
    });
    
    // Update tab content
    const contents = this.contentElement.querySelectorAll('.em-debug-tab-content');
    contents.forEach(content => {
      const htmlContent = content as HTMLElement;
      if (htmlContent.dataset.tab === tabName) {
        htmlContent.classList.add('active');
      } else {
        htmlContent.classList.remove('active');
      }
    });
  }
  
  /**
   * Close the debug panel
   */
  public close(): void {
    if (this.panelElement) {
      document.body.removeChild(this.panelElement);
      this.panelElement = null;
    }
    
    if (this.collapseButton) {
      document.body.removeChild(this.collapseButton);
      this.collapseButton = null;
    }
  }
  
  /**
   * Set source product to display
   */
  public setSourceProduct(product: any): void {
    this.sourceProduct = product;
    this.updateContent();
  }
  
  /**
   * Set matches to display
   */
  public setMatches(matches: ProductMatchResult[]): void {
    this.matches = matches;
    this.updateContent();
  }
  
  /**
   * Add a log message
   */
  public addLog(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    this.logs.push(`[${level.toUpperCase()}] ${message}`);
    this.updateLogs();
  }
  
  /**
   * Update the content of the panel
   */
  private updateContent(): void {
    if (!this.contentElement) return;
    
    const matchesContent = this.contentElement.querySelector('[data-tab="matches"]');
    if (!matchesContent) return;
    
    // Clear existing content
    matchesContent.innerHTML = '';
    
    // Add source product section
    if (this.sourceProduct) {
      const sourceSection = document.createElement('div');
      sourceSection.className = 'em-debug-section';
      
      const sourceTitle = document.createElement('div');
      sourceTitle.className = 'em-debug-section-title';
      sourceTitle.textContent = 'Source Product';
      sourceSection.appendChild(sourceTitle);
      
      const sourceProduct = document.createElement('div');
      sourceProduct.className = 'em-debug-source-product';
      
      const productTitle = document.createElement('div');
      productTitle.className = 'em-debug-match-title';
      productTitle.textContent = this.sourceProduct.title || 'Unknown Title';
      
      const productPrice = document.createElement('div');
      productPrice.className = 'em-debug-match-price';
      
      if (this.sourceProduct.price !== null && this.sourceProduct.price !== undefined) {
        productPrice.textContent = `$${this.sourceProduct.price.toFixed(2)}`;
      } else {
        productPrice.textContent = 'Price unknown';
      }
      
      if (this.sourceProduct.image) {
        const image = document.createElement('img');
        image.className = 'em-debug-match-image';
        image.src = this.sourceProduct.image;
        image.alt = this.sourceProduct.title || 'Product image';
        sourceProduct.appendChild(image);
      }
      
      sourceProduct.appendChild(productTitle);
      sourceProduct.appendChild(productPrice);
      
      if (this.sourceProduct.brand) {
        const brand = document.createElement('div');
        brand.textContent = `Brand: ${this.sourceProduct.brand}`;
        sourceProduct.appendChild(brand);
      }
      
      sourceSection.appendChild(sourceProduct);
      matchesContent.appendChild(sourceSection);
    }
    
    // Add matches section
    if (this.matches.length > 0) {
      const matchesSection = document.createElement('div');
      matchesSection.className = 'em-debug-section';
      
      const matchesTitle = document.createElement('div');
      matchesTitle.className = 'em-debug-section-title';
      matchesTitle.textContent = `Found Matches (${this.matches.length})`;
      matchesSection.appendChild(matchesTitle);
      
      const matchesList = document.createElement('div');
      matchesList.className = 'em-debug-matches';
      
      this.matches.forEach((match, index) => {
        const matchElement = document.createElement('div');
        matchElement.className = 'em-debug-match';
        
        // Similarity score badge
        const score = document.createElement('div');
        score.className = 'em-debug-match-score';
        score.textContent = `${Math.round(match.similarityScore * 100)}%`;
        matchElement.appendChild(score);
        
        // Image if available
        if (match.image) {
          const image = document.createElement('img');
          image.className = 'em-debug-match-image';
          image.src = match.image;
          image.alt = match.title;
          matchElement.appendChild(image);
        }
        
        // Title
        const title = document.createElement('div');
        title.className = 'em-debug-match-title';
        title.textContent = match.title;
        matchElement.appendChild(title);
        
        // Price
        const price = document.createElement('div');
        price.className = 'em-debug-match-price';
        price.textContent = `$${match.price.toFixed(2)}`;
        matchElement.appendChild(price);
        
        // Marketplace
        const marketplace = document.createElement('div');
        marketplace.textContent = `Marketplace: ${match.marketplace}`;
        matchElement.appendChild(marketplace);
        
        // URL (shortened)
        const url = document.createElement('div');
        url.className = 'em-debug-match-url';
        url.textContent = match.url.length > 50 
          ? match.url.substring(0, 50) + '...' 
          : match.url;
        url.title = match.url;
        matchElement.appendChild(url);
        
        // Highlight button
        const highlightButton = document.createElement('button');
        highlightButton.className = 'em-debug-highlight-button';
        highlightButton.textContent = 'Highlight in Page';
        highlightButton.addEventListener('click', () => {
          // Dispatch custom event to highlight this element
          const event = new CustomEvent('em-debug-highlight-match', {
            detail: { matchIndex: index }
          });
          document.dispatchEvent(event);
        });
        matchElement.appendChild(highlightButton);
        
        matchesList.appendChild(matchElement);
      });
      
      matchesSection.appendChild(matchesList);
      matchesContent.appendChild(matchesSection);
    } else if (this.sourceProduct) {
      // No matches found message
      const noMatches = document.createElement('div');
      noMatches.textContent = 'No matches found.';
      matchesContent.appendChild(noMatches);
    }
  }
  
  /**
   * Update the logs tab
   */
  private updateLogs(): void {
    if (!this.contentElement) return;
    
    const logsContent = this.contentElement.querySelector('[data-tab="logs"]');
    if (!logsContent) return;
    
    // Clear existing logs
    logsContent.innerHTML = '';
    
    // Create logs container
    const logsContainer = document.createElement('div');
    logsContainer.className = 'em-debug-logs';
    
    // Add each log
    this.logs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.className = 'em-debug-log';
      
      // Set color based on log level
      if (log.includes('[ERROR]')) {
        logElement.classList.add('em-debug-log-error');
      } else if (log.includes('[WARN]')) {
        logElement.classList.add('em-debug-log-warn');
      } else if (log.includes('[INFO]')) {
        logElement.classList.add('em-debug-log-info');
      } else if (log.includes('[DEBUG]')) {
        logElement.classList.add('em-debug-log-debug');
      }
      
      logElement.textContent = log;
      logsContainer.appendChild(logElement);
    });
    
    logsContent.appendChild(logsContainer);
    
    // Scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
}

// Create singleton instance
export const debugPanel = new DebugPanel();