import js from '@eslint/js';
export default [
  js.configs.recommended,
  {
    files: ['docs/js/**/*.js'],
    languageOptions: {
      globals: {
        window: true, document: true, localStorage: true, sessionStorage: true,
        fetch: true, alert: true, navigator: true, console: true, location: true,
        URL: true, Blob: true, AbortController: true, setTimeout: true, clearTimeout: true,
        posthog: true, supabase: true, L: true, module: true,
        sb: true, EDGE_BASE: true, esc: true, sourceBadge: true, GP: true, GP_DEFAULTS: true,
        COND: true, IMPR: true, TAX25: true, EXIT_YRS: true, INV_TYPES: true,
        pmt: true, cocCalc: true, maxPrice: true, getTiers: true, classify: true,
        schedE: true, exitAt: true, flipCalc: true, brrrrCalc: true, strCalc: true,
        wholesaleCalc: true, commercialCalc: true, passiveCalc: true, passAllow: true,
        localRentEstimate: true, nbScore: true, nbLabel: true, agiToRates: true,
        buildTargetProfile: true, M: true, MS: true, PCT: true,
        props: true, projects: true, activeProject: true, currentUser: true, userMailbox: true,
        gRentMode: true, aV: true, aF: true, sCol: true, sDir: true, openId: true, expandedId: true,
        mCond: true, mImpr: true, mTax: true, mRent: true, mEdit: true,
        STAGES: true, STAGE_LABELS: true, STAGE_ICONS: true,
        effectiveRent: true, recomputeOne: true, recomputeRents: true, refreshAll: true,
        setRentMode: true, computeRiskFlags: true, autoAssignStage: true, autoStageAll: true,
        projectFilter: true, renderProjectCards: true, setProject: true,
        renderApp: true, updateRow: true, updateStats: true, vis: true,
        loadProperties: true, saveProperty: true, estimateRent: true, autoEstimateAll: true,
        maybeReEstimate: true, savePropertyEdit: true, toggleEdit: true,
        buildMod: true, openM: true, closeMod: true, setView: true, setFil: true, srt: true,
        curate: true, setStage: true, nextStage: true, prevStage: true,
        loadProjects: true, openProjMod: true, closeProjMod: true, saveProject: true, deleteProject: true,
        renderAnalytics: true, openAnalytics: true, closeAnalytics: true, toggleAnalytics: true,
        exportCSV: true, openDataSources: true, closeDataSources: true,
        showInbox: true, openSettings: true, closeSettings: true, signOut: true, doAuth: true, authTab: true,
        goToApp: true, copyEmail: true, showApp: true, getAccessToken: true,
        trackIdentify: true, trackPropertyView: true, trackPropertyAdd: true, trackStageChange: true,
        trackPropertyEdit: true, trackRentChange: true, trackConditionChange: true, trackRentModeChange: true,
        trackSettingsChange: true, trackProjectCreate: true, trackProjectSwitch: true, trackProjectAnalytics: true,
        trackFilterChange: true, trackExpandRow: true, trackExport: true, trackDataSources: true,
        _track: true, _saveStrategyParams: true, PROJECT_TEMPLATES: true,
        toggleExpand: true, openAddProp: true, closeAddProp: true, printMod: true,
        parseAddUrl: true, submitAddProp: true, fetchListingDetails: true, parseListingUrl: true,
        loadMailboxBg: true, _editProj: true, _gpOrig: true,
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'warn',
      'eqeqeq': 'warn',
      'no-redeclare': 'off',
    }
  }
];
