/**
 * Filter Accessibility Features
 * Ensures filter components are accessible to all users
 */

import { FILTER_CATEGORIES, DEFAULT_FILTER_CONFIGS } from './advancedFlightFilters';

/**
 * Accessibility utilities for filter components
 */
export class FilterAccessibilityManager {
  constructor() {
    this.announcer = null;
    this.liveRegion = null;
    this.keyboardNavigation = new Map();
    this.focusableElements = new Set();
    this.currentFocusIndex = -1;
    
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features
   */
  initializeAccessibility() {
    if (typeof document === 'undefined') return;

    // Create screen reader announcer
    this.createAnnouncer();
    
    // Create live region for dynamic content
    this.createLiveRegion();
    
    // Setup keyboard navigation
    this.setupKeyboardNavigation();
    
    // Setup ARIA attributes
    this.setupAriaAttributes();
  }

  /**
   * Create screen reader announcer
   */
  createAnnouncer() {
    if (this.announcer) return;

    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.setAttribute('class', 'sr-only');
    this.announcer.style.position = 'absolute';
    this.announcer.style.left = '-10000px';
    this.announcer.style.width = '1px';
    this.announcer.style.height = '1px';
    this.announcer.style.overflow = 'hidden';
    
    document.body.appendChild(this.announcer);
  }

  /**
   * Create live region for dynamic content
   */
  createLiveRegion() {
    if (this.liveRegion) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'assertive');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('class', 'sr-only');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    if (!this.announcer) return;

    // Use appropriate announcer based on priority
    const announcer = priority === 'assertive' ? this.liveRegion : this.announcer;
    
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }

  /**
   * Setup keyboard navigation for filter components
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('focus', this.handleFocus.bind(this), true);
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    const { key, target } = event;
    
    // Check if target is within a filter component
    const filterContainer = target.closest('[data-filter-container]');
    if (!filterContainer) return;

    switch (key) {
      case 'Enter':
      case ' ':
        this.handleActivationKey(event);
        break;
        
      case 'Escape':
        this.handleEscapeKey(event);
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleArrowKey(event);
        break;
        
      case 'Tab':
        this.handleTabKey(event);
        break;
        
      case 'Home':
      case 'End':
        this.handleHomeEndKey(event);
        break;
    }
  }

  /**
   * Handle focus events
   */
  handleFocus(event) {
    const target = event.target;
    const filterContainer = target.closest('[data-filter-container]');
    
    if (filterContainer) {
      this.currentFocusIndex = this.getFocusableElements(filterContainer).indexOf(target);
      this.announceFilterFocus(target, filterContainer);
    }
  }

  /**
   * Handle activation keys (Enter, Space)
   */
  handleActivationKey(event) {
    if (event.target.matches('[role="button"], [role="checkbox"], [role="option"], button, input[type="checkbox"], input[type="radio"]')) {
      event.preventDefault();
      event.target.click();
    }
  }

  /**
   * Handle Escape key
   */
  handleEscapeKey(event) {
    const filterContainer = event.target.closest('[data-filter-container]');
    if (filterContainer) {
      const closeButton = filterContainer.querySelector('[data-filter-close]');
      if (closeButton) {
        closeButton.focus();
        closeButton.click();
      }
    }
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowKey(event) {
    const filterContainer = event.target.closest('[data-filter-container]');
    if (!filterContainer) return;

    const focusableElements = this.getFocusableElements(filterContainer);
    const currentIndex = focusableElements.indexOf(event.target);
    
    if (currentIndex === -1) return;

    let nextIndex;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        break;
        
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        break;
    }
    
    if (nextIndex !== undefined && focusableElements[nextIndex]) {
      focusableElements[nextIndex].focus();
    }
  }

  /**
   * Handle Tab key navigation
   */
  handleTabKey(event) {
    const filterContainer = event.target.closest('[data-filter-container]');
    if (!filterContainer) return;

    const focusableElements = this.getFocusableElements(filterContainer);
    const currentIndex = focusableElements.indexOf(event.target);
    
    if (event.shiftKey) {
      // Shift+Tab - go backwards
      if (currentIndex <= 0) {
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab - go forwards
      if (currentIndex >= focusableElements.length - 1) {
        event.preventDefault();
        focusableElements[0].focus();
      }
    }
  }

  /**
   * Handle Home/End keys
   */
  handleHomeEndKey(event) {
    const filterContainer = event.target.closest('[data-filter-container]');
    if (!filterContainer) return;

    const focusableElements = this.getFocusableElements(filterContainer);
    const targetIndex = event.key === 'Home' ? 0 : focusableElements.length - 1;
    
    event.preventDefault();
    focusableElements[targetIndex].focus();
  }

  /**
   * Get focusable elements within a container
   */
  getFocusableElements(container) {
    const selector = [
      'button',
      '[role="button"]',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="checkbox"]',
      '[role="option"]',
      '[role="radio"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector))
      .filter(element => {
        // Filter out hidden elements
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.tabIndex !== -1;
      });
  }

  /**
   * Setup ARIA attributes for filter components
   */
  setupAriaAttributes() {
    // Setup ARIA for different filter types
    this.setupRangeFilterAccessibility();
    this.setupCheckboxFilterAccessibility();
    this.setupComboboxFilterAccessibility();
    this.setupTabListAccessibility();
  }

  /**
   * Setup accessibility for range filters
   */
  setupRangeFilterAccessibility() {
    const rangeFilters = document.querySelectorAll('[data-filter-type="range"]');
    
    rangeFilters.forEach(filter => {
      const minInput = filter.querySelector('[data-range-min]');
      const maxInput = filter.querySelector('[data-range-max]');
      const slider = filter.querySelector('[role="slider"]');
      
      if (minInput) {
        minInput.setAttribute('aria-label', 'Minimum value');
        minInput.setAttribute('aria-describedby', `${filter.id}-description`);
      }
      
      if (maxInput) {
        maxInput.setAttribute('aria-label', 'Maximum value');
        maxInput.setAttribute('aria-describedby', `${filter.id}-description`);
      }
      
      if (slider) {
        slider.setAttribute('aria-label', 'Filter range slider');
        slider.setAttribute('aria-valuemin', minInput?.value || 0);
        slider.setAttribute('aria-valuemax', maxInput?.value || 100);
        slider.setAttribute('aria-valuenow', (minInput?.value || 0));
      }
    });
  }

  /**
   * Setup accessibility for checkbox filters
   */
  setupCheckboxFilterAccessibility() {
    const checkboxFilters = document.querySelectorAll('[data-filter-type="checkbox"]');
    
    checkboxFilters.forEach(filter => {
      const checkboxes = filter.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
      
      checkboxes.forEach((checkbox, index) => {
        const label = checkbox.closest('label') || filter.querySelector(`label[for="${checkbox.id}"]`);
        
        checkbox.setAttribute('aria-describedby', `${filter.id}-description`);
        
        if (label) {
          label.setAttribute('for', checkbox.id);
        }
        
        // Group checkboxes for better navigation
        if (checkboxes.length > 1) {
          checkbox.setAttribute('aria-setsize', checkboxes.length);
          checkbox.setAttribute('aria-posinset', index + 1);
        }
      });
    });
  }

  /**
   * Setup accessibility for combobox filters
   */
  setupComboboxFilterAccessibility() {
    const comboboxFilters = document.querySelectorAll('[data-filter-type="combobox"]');
    
    comboboxFilters.forEach(filter => {
      const input = filter.querySelector('input[type="text"]');
      const listbox = filter.querySelector('[role="listbox"]');
      
      if (input && listbox) {
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-haspopup', 'listbox');
        input.setAttribute('aria-controls', listbox.id);
        input.setAttribute('aria-describedby', `${filter.id}-description`);
        
        listbox.setAttribute('aria-label', 'Filter options');
        listbox.setAttribute('aria-multiselectable', 'true');
      }
    });
  }

  /**
   * Setup accessibility for tab lists
   */
  setupTabListAccessibility() {
    const tabLists = document.querySelectorAll('[role="tablist"]');
    
    tabLists.forEach(tabList => {
      const tabs = tabList.querySelectorAll('[role="tab"]');
      
      tabs.forEach((tab, index) => {
        tab.setAttribute('aria-setsize', tabs.length);
        tab.setAttribute('aria-posinset', index + 1);
        
        // Connect tab to its panel
        const panelId = tab.getAttribute('aria-controls');
        if (panelId) {
          const panel = document.getElementById(panelId);
          if (panel) {
            panel.setAttribute('aria-labelledby', tab.id);
          }
        }
      });
    });
  }

  /**
   * Announce filter focus changes
   */
  announceFilterFocus(element, container) {
    const filterType = container.getAttribute('data-filter-type');
    const category = container.getAttribute('data-filter-category');
    const config = DEFAULT_FILTER_CONFIGS[category];
    
    let announcement = '';
    
    switch (filterType) {
      case 'range':
        announcement = `${config?.label || 'Range filter'}, focused`;
        break;
        
      case 'checkbox':
        const isChecked = element.getAttribute('aria-checked') === 'true';
        const label = element.getAttribute('aria-label') || element.textContent;
        announcement = `${label}, ${isChecked ? 'checked' : 'not checked'}`;
        break;
        
      case 'combobox':
        announcement = `${config?.label || 'Filter options'}, focused`;
        break;
        
      default:
        announcement = `${config?.label || 'Filter'}, focused`;
    }
    
    this.announce(announcement);
  }

  /**
   * Announce filter value changes
   */
  announceFilterChange(category, value, filterType) {
    const config = DEFAULT_FILTER_CONFIGS[category];
    let announcement = '';
    
    switch (filterType) {
      case 'range':
        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          announcement = `${config?.label || 'Range'} changed to ${value.min} to ${value.max}`;
        }
        break;
        
      case 'checkbox':
        if (Array.isArray(value)) {
          announcement = `${config?.label || 'Filter'}: ${value.length} options selected`;
        }
        break;
        
      case 'toggle':
        announcement = `${config?.label || 'Filter'} ${value ? 'enabled' : 'disabled'}`;
        break;
        
      default:
        announcement = `${config?.label || 'Filter'} updated`;
    }
    
    this.announce(announcement, 'assertive');
  }

  /**
   * Get accessibility attributes for filter component
   */
  getAccessibilityProps(category, filterType, additionalProps = {}) {
    const config = DEFAULT_FILTER_CONFIGS[category];
    const baseProps = {
      'data-filter-category': category,
      'data-filter-type': filterType,
      'data-filter-container': 'true',
      role: 'group',
      'aria-label': config?.label || 'Filter',
      ...additionalProps
    };

    // Add type-specific attributes
    switch (filterType) {
      case 'range':
        return {
          ...baseProps,
          'aria-describedby': `${category}-description`,
          ...this.getRangeAccessibilityProps(category)
        };
        
      case 'checkbox':
        return {
          ...baseProps,
          'aria-multiselectable': 'true',
          ...this.getCheckboxAccessibilityProps(category)
        };
        
      case 'combobox':
        return {
          ...baseProps,
          'aria-expanded': 'false',
          'aria-haspopup': 'listbox',
          ...this.getComboboxAccessibilityProps(category)
        };
        
      default:
        return baseProps;
    }
  }

  /**
   * Get range-specific accessibility props
   */
  getRangeAccessibilityProps(category) {
    return {
      'aria-orientation': 'horizontal',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': 50
    };
  }

  /**
   * Get checkbox-specific accessibility props
   */
  getCheckboxAccessibilityProps(category) {
    return {
      'aria-required': 'false',
      'aria-invalid': 'false'
    };
  }

  /**
   * Get combobox-specific accessibility props
   */
  getComboboxAccessibilityProps(category) {
    return {
      'aria-autocomplete': 'list',
      'aria-activedescendant': null
    };
  }

  /**
   * Validate accessibility of filter component
   */
  validateAccessibility(container) {
    const issues = [];
    
    // Check for proper ARIA attributes
    if (!container.getAttribute('aria-label') && !container.getAttribute('aria-labelledby')) {
      issues.push({
        type: 'error',
        message: 'Filter container missing aria-label or aria-labelledby'
      });
    }
    
    // Check for keyboard accessibility
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) {
      issues.push({
        type: 'warning',
        message: 'No focusable elements found in filter container'
      });
    }
    
    // Check for proper roles
    const hasRole = container.getAttribute('role');
    if (!hasRole) {
      issues.push({
        type: 'warning',
        message: 'Filter container missing role attribute'
      });
    }
    
    return issues;
  }

  /**
   * Fix accessibility issues
   */
  fixAccessibilityIssues(container, issues) {
    issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          console.error('Accessibility error:', issue.message);
          break;
          
        case 'warning':
          console.warn('Accessibility warning:', issue.message);
          
          // Auto-fix some common issues
          if (issue.message.includes('missing aria-label')) {
            const category = container.getAttribute('data-filter-category');
            const config = DEFAULT_FILTER_CONFIGS[category];
            container.setAttribute('aria-label', config?.label || 'Filter');
          }
          
          if (issue.message.includes('missing role')) {
            container.setAttribute('role', 'group');
          }
          break;
      }
    });
  }

  /**
   * Cleanup accessibility features
   */
  cleanup() {
    if (this.announcer) {
      document.body.removeChild(this.announcer);
      this.announcer = null;
    }
    
    if (this.liveRegion) {
      document.body.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
    
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('focus', this.handleFocus.bind(this), true);
  }
}

// Create singleton instance
export const filterAccessibility = new FilterAccessibilityManager();

// Export utility functions
export function createFilterAccessibilityManager() {
  return new FilterAccessibilityManager();
}

// Convenience functions for React components
export function useFilterAccessibility(category, filterType) {
  return {
    getAccessibilityProps: (additionalProps = {}) => 
      filterAccessibility.getAccessibilityProps(category, filterType, additionalProps),
    
    announceChange: (value) => 
      filterAccessibility.announceFilterChange(category, value, filterType),
    
    validate: (container) => 
      filterAccessibility.validateAccessibility(container),
    
    fixIssues: (container, issues) => 
      filterAccessibility.fixAccessibilityIssues(container, issues)
  };
}

// Export accessibility utilities
export function announceFilterChange(category, value, filterType) {
  return filterAccessibility.announceFilterChange(category, value, filterType);
}

export function getFilterAccessibilityProps(category, filterType, additionalProps = {}) {
  return filterAccessibility.getAccessibilityProps(category, filterType, additionalProps);
}

export function validateFilterAccessibility(container) {
  return filterAccessibility.validateAccessibility(container);
}

export function fixFilterAccessibilityIssues(container, issues) {
  return filterAccessibility.fixAccessibilityIssues(container, issues);
}

// CSS for screen reader only content
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  /* Focus styles for keyboard navigation */
  [data-filter-container] *:focus {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    [data-filter-container] *:focus {
      outline: 3px solid #ffffff;
      outline-offset: 2px;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    [data-filter-container] * {
      animation: none !important;
      transition: none !important;
    }
  }
`;