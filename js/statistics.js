// ============================================================================
// STATISTICS MODULE - statistics.js
// Štatistiky a vizualizácie pre SAMU aplikáciu
// ============================================================================

import { getRiskLabel } from './supabase.js';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let statsState = {
    viewType: 'region',           // 'region', 'district', 'compare'
    selectedDistrict: null,       // Pre single district view
    selectedDistricts: [],        // Pre comparison view
    allDistricts: [],             // Zoznam všetkých okresov
    filteredTerritories: [],      // Filtrované územia
    statsCache: null,             // Cache pre štatistiky
    chartsInitialized: false      // Flag či sú grafy už inicializované
};

// Debounce timer
let statsUpdateTimer = null;

// ============================================================================
// INICIALIZÁCIA GRAFOV
// ============================================================================

let charts = {
    risk: null,
    municipalities: null,
    events: null,
    districts: null,
    probability: null,
    factors: null
};

// ============================================================================
// NAČÍTANIE A SPRACOVANIE DÁT
// ============================================================================

function calculateStatistics(territories) {
    const stats = {
        total: territories.length,
        riskLevels: { critical: 0, high: 0, medium: 0, low: 0 },
        municipalities: {},
        events: {},
        districts: {},
        probabilities: {},
        factors: {},
        totalPopulation: 0,
        totalArea: 0
    };
    
    territories.forEach(territory => {
        // Risk levels
        stats.riskLevels[territory.riskLevel]++;
        
        // Municipalities
        if (!stats.municipalities[territory.municipalityName]) {
            stats.municipalities[territory.municipalityName] = 0;
        }
        stats.municipalities[territory.municipalityName]++;
        
        // Events
        if (!stats.events[territory.eventName]) {
            stats.events[territory.eventName] = 0;
        }
        stats.events[territory.eventName]++;
        
        // Districts
        if (!stats.districts[territory.district]) {
            stats.districts[territory.district] = {
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                population: 0
            };
        }
        stats.districts[territory.district].total++;
        stats.districts[territory.district][territory.riskLevel]++;
        stats.districts[territory.district].population += territory.endangeredPopulation || 0;
        
        // Probabilities
        if (!stats.probabilities[territory.probability]) {
            stats.probabilities[territory.probability] = 0;
        }
        stats.probabilities[territory.probability]++;
        
        // Factors
        if (!stats.factors[territory.factorName]) {
            stats.factors[territory.factorName] = 0;
        }
        stats.factors[territory.factorName]++;
        
        // Totals
        stats.totalPopulation += territory.endangeredPopulation || 0;
        stats.totalArea += territory.endangeredArea || 0;
    });
    
    return stats;
}

// ============================================================================
// AKTUALIZÁCIA SUMMARY CARDS
// ============================================================================

function updateSummaryCards(stats) {
    // Summary cards don't exist in new design - skip silently
    const totalTerritoriesEl = document.getElementById('totalTerritories');
    const totalMunicipalitiesEl = document.getElementById('totalMunicipalities');
    const totalEventsEl = document.getElementById('totalEvents');
    const totalPopulationEl = document.getElementById('totalPopulation');
    
    if (totalTerritoriesEl) totalTerritoriesEl.textContent = stats.total.toLocaleString('sk-SK');
    if (totalMunicipalitiesEl) totalMunicipalitiesEl.textContent = Object.keys(stats.municipalities).length;
    if (totalEventsEl) totalEventsEl.textContent = Object.keys(stats.events).length;
    if (totalPopulationEl) totalPopulationEl.textContent = stats.totalPopulation.toLocaleString('sk-SK');
}

// ============================================================================
// VYTVORENIE GRAFOV
// ============================================================================

function createRiskChart(stats) {
    const canvas = document.getElementById('riskDistributionChart');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas element riskDistributionChart not found or not a canvas');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    if (charts.risk) {
        charts.risk.destroy();
    }
    
    charts.risk = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['🔴 Kritické', '🟠 Vysoké', '🟡 Stredné', '🟢 Nízke'],
            datasets: [{
                data: [
                    stats.riskLevels.critical,
                    stats.riskLevels.high,
                    stats.riskLevels.medium,
                    stats.riskLevels.low
                ],
                backgroundColor: [
                    'rgba(220, 38, 38, 0.8)',
                    'rgba(234, 88, 12, 0.8)',
                    'rgba(217, 119, 6, 0.8)',
                    'rgba(22, 163, 74, 0.8)'
                ],
                borderColor: [
                    'rgb(220, 38, 38)',
                    'rgb(234, 88, 12)',
                    'rgb(217, 119, 6)',
                    'rgb(22, 163, 74)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 14 },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createMunicipalitiesChart(stats) {
    const canvas = document.getElementById('populationChart');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas element populationChart not found or not a canvas');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get top 10 municipalities
    const sorted = Object.entries(stats.municipalities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (charts.municipalities) {
        charts.municipalities.destroy();
    }
    
    charts.municipalities = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Počet analýz',
                data: sorted.map(([, count]) => count),
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: 'rgb(30, 64, 175)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function createEventsChart(stats) {
    const canvas = document.getElementById('topEventsChart');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas element topEventsChart not found or not a canvas');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get top 15 events
    const sorted = Object.entries(stats.events)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    
    if (charts.events) {
        charts.events.destroy();
    }
    
    charts.events = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Počet výskytov',
                data: sorted.map(([, count]) => count),
                backgroundColor: 'rgba(234, 88, 12, 0.8)',
                borderColor: 'rgb(234, 88, 12)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function createDistrictsChart(stats) {
    const canvas = document.getElementById('districtRisksChart');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas element districtRisksChart not found or not a canvas');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    const sorted = Object.entries(stats.districts)
        .sort((a, b) => b[1].total - a[1].total);
    
    if (charts.districts) {
        charts.districts.destroy();
    }
    
    charts.districts = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sorted.map(([name]) => name),
            datasets: [{
                data: sorted.map(([, data]) => data.total),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(20, 184, 166, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(34, 211, 238, 0.8)',
                    'rgba(248, 113, 113, 0.8)',
                    'rgba(192, 132, 252, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(134, 239, 172, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: { size: 12 },
                        padding: 10
                    }
                }
            }
        }
    });
}

function createProbabilityChart(stats) {
    const canvas = document.getElementById('probabilityChart');
    if (!canvas || !canvas.getContext) {
        console.error('Canvas element probabilityChart not found or not a canvas');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Order probabilities
    const order = [
        'Každé 2 - 3 roky',
        'Každé 4 - 5 rokov',
        'Každých 4 - 5 rokov',
        'Každé 6 - 10 rokov',
        'Každých 6 - 10 rokov',
        'Každých 11 - 20 rokov',
        'Každých 21 - 30 rokov',
        'Každých 31 - 50 rokov',
        'Každých 50 - 100 rokov',
        'Každých 100 - 200 rokov',
        'Každých 200 a viac rokov'
    ];
    
    const data = order.map(prob => stats.probabilities[prob] || 0);
    
    if (charts.probability) {
        charts.probability.destroy();
    }
    
    charts.probability = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: order,
            datasets: [{
                label: 'Počet území',
                data: data,
                backgroundColor: data.map((_, i) => {
                    if (i < 2) return 'rgba(220, 38, 38, 0.8)';
                    if (i < 4) return 'rgba(234, 88, 12, 0.8)';
                    if (i < 7) return 'rgba(217, 119, 6, 0.8)';
                    return 'rgba(22, 163, 74, 0.8)';
                }),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function createFactorsChart(stats) {
    const canvas = document.getElementById('factorsChart');
    if (!canvas || !canvas.getContext) {
        console.warn('Canvas element factorsChart not found - skipping (not in new design)');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    const sorted = Object.entries(stats.factors)
        .sort((a, b) => b[1] - a[1]);
    
    if (charts.factors) {
        charts.factors.destroy();
    }
    
    charts.factors = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Počet výskytov',
                data: sorted.map(([, count]) => count),
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: 'rgb(139, 92, 246)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

// ============================================================================
// TABUĽKY
// ============================================================================

function createDistrictTable(stats) {
    const tbody = document.querySelector('#districtStatsTable tbody');
    const sorted = Object.entries(stats.districts)
        .sort((a, b) => b[1].total - a[1].total);
    
    tbody.innerHTML = sorted.map(([district, data]) => `
        <tr>
            <td><strong>${district}</strong></td>
            <td class="number-cell">${data.total}</td>
            <td class="number-cell highlight-critical">${data.critical}</td>
            <td class="number-cell highlight-high">${data.high}</td>
            <td class="number-cell highlight-medium">${data.medium}</td>
            <td class="number-cell highlight-low">${data.low}</td>
            <td class="number-cell">${data.population.toLocaleString('sk-SK')}</td>
        </tr>
    `).join('');
}

function createTopRisksTable(territories) {
    const tbody = document.querySelector('#topRisksTable tbody');
    
    // Get critical risks sorted by population
    const criticalRisks = territories
        .filter(t => t.riskLevel === 'critical')
        .sort((a, b) => (b.endangeredPopulation || 0) - (a.endangeredPopulation || 0))
        .slice(0, 20);
    
    tbody.innerHTML = criticalRisks.map(t => `
        <tr>
            <td><strong>${t.municipalityName}</strong></td>
            <td>${t.eventName}</td>
            <td>${t.riskSource}</td>
            <td class="risk-cell">
                <span class="risk-badge ${t.riskLevel}">${getRiskLabel(t.riskLevel)}</span>
            </td>
            <td class="number-cell">${(t.endangeredPopulation || 0).toLocaleString('sk-SK')}</td>
            <td>${t.probability}</td>
        </tr>
    `).join('');
}

// ============================================================================
// HLAVNÁ FUNKCIA
// ============================================================================

function initializeStatistics(territories, municipalities, events) {
    console.log('📊 Inicializujem štatistiky...');
    
    if (territories.length === 0) {
        console.warn('⚠️ Žiadne územia na analýzu');
        return;
    }
    
    // Inicializuj filtre
    initializeStatsFilters(territories);
    
    // Nastav počiatočné filtrované územia
    statsState.filteredTerritories = territories;
    
    // Zobraz štatistiky
    updateStatistics();
}

function updateStatistics() {
    // Debounce - čakaj 300ms pred aktualizáciou
    clearTimeout(statsUpdateTimer);
    
    statsUpdateTimer = setTimeout(() => {
        _doUpdateStatistics();
    }, 300);
}

function _doUpdateStatistics() {
    const territories = statsState.filteredTerritories;
    
    if (territories.length === 0) {
        console.warn('⚠️ Žiadne územia po filtrovaní');
        return;
    }
    
    console.time('⏱️ Štatistiky update');
    
    // Calculate statistics (s cache)
    const stats = calculateStatistics(territories);
    statsState.statsCache = stats;
    
    // Update summary cards
    updateSummaryCards(stats);
    
    // Create charts based on view type
    if (statsState.viewType === 'compare' && statsState.selectedDistricts.length > 0) {
        createComparisonCharts(territories);
    } else {
        // Lazy load charts - vytvor ich postupne
        requestAnimationFrame(() => createRiskChart(stats));
        requestAnimationFrame(() => createMunicipalitiesChart(stats));
        requestAnimationFrame(() => createEventsChart(stats));
        requestAnimationFrame(() => createDistrictsChart(stats));
        requestAnimationFrame(() => createProbabilityChart(stats));
        requestAnimationFrame(() => createFactorsChart(stats));
    }
    
    // Create tables
    createDistrictTable(stats);
    createTopRisksTable(territories);
    
    console.timeEnd('⏱️ Štatistiky update');
    console.log('✅ Štatistiky aktualizované');
}

// ============================================================================
// FILTER INITIALIZATION
// ============================================================================

function initializeStatsFilters(territories) {
    // Získaj unikátne okresy
    const districts = [...new Set(territories.map(t => t.district))].sort();
    statsState.allDistricts = districts;
    
    // Populate district select
    const districtSelect = document.getElementById('statsDistrict');
    if (districtSelect) {
        districtSelect.innerHTML = '<option value="">-- Vyberte okres --</option>' +
            districts.map(d => `<option value="${d}">${d}</option>`).join('');
    }
    
    // Create checkboxes
    const checkboxContainer = document.getElementById('districtsCheckboxes');
    if (checkboxContainer) {
        checkboxContainer.innerHTML = districts.map((d, i) => `
            <div class="district-checkbox-item">
                <input type="checkbox" id="district-${i}" value="${d}">
                <label for="district-${i}">${d}</label>
            </div>
        `).join('');
    }
    
    // Event listeners
    setupStatsFilterListeners(territories);
}

function setupStatsFilterListeners(territories) {
    // View type change
    document.getElementById('statsViewType')?.addEventListener('change', function() {
        statsState.viewType = this.value;
        
        // Show/hide appropriate controls
        const singleGroup = document.getElementById('singleDistrictGroup');
        const multiGroup = document.getElementById('multipleDistrictsGroup');
        
        if (this.value === 'region') {
            singleGroup.style.display = 'none';
            multiGroup.style.display = 'none';
        } else if (this.value === 'district') {
            singleGroup.style.display = 'block';
            multiGroup.style.display = 'none';
        } else if (this.value === 'compare') {
            singleGroup.style.display = 'none';
            multiGroup.style.display = 'block';
        }
    });
    
    // Apply filter
    document.getElementById('applyStatsFilter')?.addEventListener('click', function() {
        applyStatsFilter(territories);
    });
    
    // Reset filter
    document.getElementById('resetStatsFilter')?.addEventListener('click', function() {
        resetStatsFilter(territories);
    });
    
    // Checkbox limit (max 5)
    document.querySelectorAll('#districtsCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const checked = document.querySelectorAll('#districtsCheckboxes input[type="checkbox"]:checked');
            if (checked.length > 5) {
                this.checked = false;
                alert('Môžete vybrať maximálne 5 okresov na porovnanie.');
            }
        });
    });
}

function applyStatsFilter(territories) {
    if (statsState.viewType === 'region') {
        // Celý kraj
        statsState.filteredTerritories = territories;
        document.getElementById('statsFilterInfo').textContent = 'Zobrazené: Celý Banskobystrický kraj';
        
    } else if (statsState.viewType === 'district') {
        // Jeden okres
        const district = document.getElementById('statsDistrict').value;
        if (!district) {
            alert('Prosím vyberte okres!');
            return;
        }
        statsState.selectedDistrict = district;
        statsState.filteredTerritories = territories.filter(t => t.district === district);
        document.getElementById('statsFilterInfo').textContent = `Zobrazené: Okres ${district}`;
        
    } else if (statsState.viewType === 'compare') {
        // Porovnanie okresov
        const checked = Array.from(document.querySelectorAll('#districtsCheckboxes input[type="checkbox"]:checked'));
        const districts = checked.map(cb => cb.value);
        
        if (districts.length < 2) {
            alert('Prosím vyberte aspoň 2 okresy na porovnanie!');
            return;
        }
        
        statsState.selectedDistricts = districts;
        statsState.filteredTerritories = territories.filter(t => districts.includes(t.district));
        document.getElementById('statsFilterInfo').textContent = `Porovnanie: ${districts.join(', ')}`;
    }
    
    // Aktualizuj štatistiky
    updateStatistics();
}

function resetStatsFilter(territories) {
    // Reset state
    statsState.viewType = 'region';
    statsState.selectedDistrict = null;
    statsState.selectedDistricts = [];
    statsState.filteredTerritories = territories;
    
    // Reset UI
    document.getElementById('statsViewType').value = 'region';
    document.getElementById('statsDistrict').value = '';
    document.querySelectorAll('#districtsCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    document.getElementById('singleDistrictGroup').style.display = 'none';
    document.getElementById('multipleDistrictsGroup').style.display = 'none';
    document.getElementById('statsFilterInfo').textContent = 'Zobrazené: Celý Banskobystrický kraj';
    
    // Aktualizuj štatistiky
    updateStatistics();
}

// ============================================================================
// COMPARISON CHARTS
// ============================================================================

function createComparisonCharts(territories) {
    const districts = statsState.selectedDistricts;
    
    // Risk comparison by district
    const riskData = {
        labels: ['Kritické', 'Vysoké', 'Stredné', 'Nízke'],
        datasets: districts.map((district, index) => {
            const districtTerritories = territories.filter(t => t.district === district);
            const riskCounts = {
                critical: districtTerritories.filter(t => t.riskLevel === 'critical').length,
                high: districtTerritories.filter(t => t.riskLevel === 'high').length,
                medium: districtTerritories.filter(t => t.riskLevel === 'medium').length,
                low: districtTerritories.filter(t => t.riskLevel === 'low').length
            };
            
            const colors = [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)'
            ];
            
            return {
                label: district,
                data: [riskCounts.critical, riskCounts.high, riskCounts.medium, riskCounts.low],
                backgroundColor: colors[index],
                borderColor: colors[index],
                borderWidth: 2
            };
        })
    };
    
    const ctx = document.getElementById('riskChart');
    if (charts.risk) charts.risk.destroy();
    
    charts.risk = new Chart(ctx, {
        type: 'bar',
        data: riskData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: '⚖️ Porovnanie úrovní rizika'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
    
    // Keep other charts simple for now
    createMunicipalitiesChart(calculateStatistics(territories));
    createEventsChart(calculateStatistics(territories));
    createProbabilityChart(calculateStatistics(territories));
    createFactorsChart(calculateStatistics(territories));
    
    // Districts chart not needed in comparison mode
    const stats = calculateStatistics(territories);
    createDistrictsChart(stats);
}

// ============================================================================
// EXPORT
// ============================================================================

export { initializeStatistics };
