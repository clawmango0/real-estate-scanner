/**
 * Property Scout - Local Storage Module
 * Persists properties and settings to localStorage
 */

(function() {
    'use strict';
    
    const STORAGE_KEY = 'propertyScout';
    const SETTINGS_KEY = 'propertyScout_settings';
    
    // Default analysis settings
    const DEFAULT_SETTINGS = {
        downPayment: 100000,
        interestRate: 0.0525,
        expenseRatio: 0.50,
        propertyTaxRate: 0.019,
        insurance: 100,
        rentByZip: {
            '76133': 1761,
            '76248': 2277,
            '76123': 1800,
            '76180': 1983,
            '76137': 1700
        }
    };
    
    // Save property
    window.saveProperty = function(property) {
        const properties = getProperties();
        
        // Check if already exists (by URL)
        const existing = properties.findIndex(p => p.url === property.url);
        if (existing >= 0) {
            properties[existing] = { ...properties[existing], ...property, savedAt: Date.now() };
        } else {
            properties.push({ ...property, savedAt: Date.now() });
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
        return properties.length;
    };
    
    // Get all properties
    window.getProperties = function() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    };
    
    // Delete property
    window.deleteProperty = function(url) {
        const properties = getProperties().filter(p => p.url !== url);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
        return properties.length;
    };
    
    // Clear all properties
    window.clearProperties = function() {
        localStorage.removeItem(STORAGE_KEY);
    };
    
    // Save settings
    window.saveSettings = function(settings) {
        const current = getSettings();
        const merged = { ...current, ...settings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    };
    
    // Get settings
    window.getSettings = function() {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    };
    
    // Calculate cash flow
    window.calculateCashFlow = function(price, zip, rehab = 0) {
        const settings = getSettings();
        const total = price + rehab;
        const loan = Math.max(0, total - settings.downPayment);
        
        const mortgage = loan * (settings.interestRate / 12);
        const tax = (price * settings.propertyTaxRate) / 12;
        const insurance = settings.insurance;
        const expenses = (settings.rentByZip[zip] || 1700) * settings.expenseRatio;
        
        const totalCost = mortgage + tax + insurance + expenses;
        const rent = settings.rentByZip[zip] || 1700;
        
        return {
            rent,
            mortgage: Math.round(mortgage),
            tax: Math.round(tax),
            insurance,
            expenses: Math.round(expenses),
            totalCost: Math.round(totalCost),
            cashFlow: Math.round(rent - totalCost)
        };
    };
    
    // Export to CSV
    window.exportToCSV = function() {
        const properties = getProperties();
        if (properties.length === 0) {
            alert('No properties to export');
            return;
        }
        
        const headers = ['Address', 'Price', 'Rent', 'Cash Flow', 'Status', 'URL', 'Saved'];
        const rows = properties.map(p => [
            p.address || '',
            p.price || '',
            p.rent || '',
            p.cashFlow || '',
            p.status || '',
            p.url || '',
            new Date(p.savedAt).toLocaleDateString()
        ]);
        
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `properties-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    // Import from CSV
    window.importFromCSV = function(csvText) {
        const lines = csvText.split('\n').filter(l => l.trim());
        const properties = [];
        
        for (let i = 1; i < lines.length; i++) { // Skip header
            const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
            if (values.length >= 4) {
                properties.push({
                    address: values[0],
                    price: parseInt(values[1]) || 0,
                    rent: parseInt(values[2]) || 0,
                    cashFlow: parseInt(values[3]) || 0,
                    status: values[4] || '',
                    url: values[5] || '',
                    savedAt: Date.now()
                });
            }
        }
        
        // Merge with existing
        const existing = getProperties();
        properties.forEach(p => {
            if (!existing.find(e => e.url === p.url)) {
                existing.push(p);
            }
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        return existing.length;
    };
    
    console.log('💾 Storage module loaded', getProperties().length, 'properties saved');
})();
