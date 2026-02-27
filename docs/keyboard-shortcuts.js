/**
 * Property Scout - Keyboard Shortcuts
 * Adds keyboard navigation for power users
 * 
 * Shortcuts:
 * / - Focus search
 * n - New analysis
 * e - Export properties
 * f - Filter modal
 * esc - Close modals
 * ? - Show help
 */

(function() {
    'use strict';
    
    const shortcuts = {
        '/': { action: focusSearch, description: 'Focus search' },
        'n': { action: newAnalysis, description: 'New analysis' },
        'e': { action: exportProperties, description: 'Export to CSV' },
        'f': { action: openFilter, description: 'Open filters' },
        '?': { action: showHelp, description: 'Show shortcuts' },
        'Escape': { action: closeModals, description: 'Close modal' }
    };
    
    function focusSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.focus();
    }
    
    function newAnalysis() {
        const urlInput = document.querySelector('.url-input');
        if (urlInput) {
            urlInput.focus();
            urlInput.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    function exportProperties() {
        window.exportToCSV && window.exportToCSV();
    }
    
    function openFilter() {
        const filterBtn = document.querySelector('.filter-btn');
        if (filterBtn) filterBtn.click();
    }
    
    function showHelp() {
        // Create help modal
        const helpHtml = `
            <div class="keyboard-help" style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: var(--card-bg, #161B22); border: 1px solid var(--border, #30363D);
                border-radius: 12px; padding: 2rem; z-index: 9999; max-width: 400px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            ">
                <h3 style="margin-bottom: 1rem;">⌨️ Keyboard Shortcuts</h3>
                <div style="display: grid; gap: 0.5rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text2, #8B949E);">Search</span>
                        <kbd style="background: var(--hover, #21262D); padding: 2px 8px; border-radius: 4px; font-family: monospace;">/</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text2, #8B949E);">New analysis</span>
                        <kbd style="background: var(--hover, #21262D); padding: 2px 8px; border-radius: 4px; font-family: monospace;">n</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text2, #8B949E);">Export CSV</span>
                        <kbd style="background: var(--hover, #21262D); padding: 2px 8px; border-radius: 4px; font-family: monospace;">e</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text2, #8B949E);">Filters</span>
                        <kbd style="background: var(--hover, #21262D); padding: 2px 8px; border-radius: 4px; font-family: monospace;">f</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text2, #8B949E);">Help</span>
                        <kbd style="background: var(--hover, #21262D); padding: 2px 8px; border-radius: 4px; font-family: monospace;">?</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text2, #8B949E);">Close</span>
                        <kbd style="background: var(--hover, #21262D); padding: 2px 8px; border-radius: 4px; font-family: monospace;">esc</kbd>
                    </div>
                </div>
                <button onclick="this.closest('.keyboard-help').remove()" 
                    style="margin-top: 1rem; width: 100%; padding: 0.5rem; 
                           background: var(--secondary, #2E7D32); border: none; 
                           color: white; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        // Remove existing help
        const existing = document.querySelector('.keyboard-help');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', helpHtml);
    }
    
    function closeModals() {
        const modals = document.querySelectorAll('.modal-overlay.active, .keyboard-help');
        modals.forEach(m => m.remove());
    }
    
    // Add keyboard listener
    document.addEventListener('keydown', (e) => {
        // Don't trigger in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const key = e.key;
        if (shortcuts[key]) {
            e.preventDefault();
            shortcuts[key].action();
        }
    });
    
    // Add hint to footer
    document.addEventListener('DOMContentLoaded', () => {
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.innerHTML += ' <span style="opacity: 0.5;">| Press ? for shortcuts</span>';
        }
    });
    
    console.log('⌨️ Keyboard shortcuts loaded');
})();
