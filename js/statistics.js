// ============================================================================
// STATISTICS MODULE - statistics.js
// Štatistiky a vizualizácie pre SAMU aplikáciu
// ROZŠÍRENÁ VERZIA s 3 novými štatistikami
// ============================================================================

import { getRiskLabel, getRiskLevel } from './supabase.js';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let statsState = {
    filteredTerritories: [],      // Filtrované územia
    allTerritories: [],           // VŠETKY územia pre mapu
    statsCache: null,             // Cache pre štatistiky
    chartsInitialized: false,     // Flag či sú grafy už inicializované
    mapInitialized: false,        // Flag či je mapa inicializovaná
    probabilities: []             // Kódovník pravdepodobností
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
    factors: null,
    // trend: null  // REMOVED - not needed
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
        // DYNAMICKÝ PREPOČET riskLevel z probability pomocou kódovníka
        const riskLevel = getRiskLevel(territory.probability, statsState.probabilities);
        
        // Risk levels
        stats.riskLevels[riskLevel]++;
        
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
        stats.districts[territory.district][riskLevel]++;
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
        // factorsChart not in current design - skip silently
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

function initializeStatistics(territories, municipalities, events, probabilities = []) {
    console.log('📊 Inicializujem štatistiky...');
    
    if (territories.length === 0) {
        console.warn('⚠️ Žiadne územia na analýzu');
        return;
    }
    
    // Ulož kódovník pravdepodobností do stavu
    statsState.probabilities = probabilities;
    
    // Ulož VŠETKY územia pre mapu (len pri prvom volaní)
    if (statsState.allTerritories.length === 0) {
        statsState.allTerritories = territories;
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
    
    // NOVÉ ŠTATISTIKY - Render nových štatistík
    renderTop10Table(territories);
    renderDistrictHeatmap(territories);
    initializeRiskMap(territories)
    
    console.timeEnd("⏱️ Štatistiky update");
    console.log("✅ Štatistiky aktualizované");
}
    console.log('✅ Štatistiky aktualizované');

// ============================================================================
// FILTER INITIALIZATION
// ============================================================================

function initializeStatsFilters(territories) {
    // Získaj unikátne okresy a obce
    const districts = [...new Set(territories.map(t => t.district))].sort();
    const municipalities = [...new Set(territories.map(t => t.municipalityName))].sort();
    
    // Populate district select
    const districtSelect = document.getElementById('statsFilterDistrict');
    if (districtSelect) {
        districtSelect.innerHTML = '<option value="">Všetky okresy</option>' +
            districts.map(d => `<option value="${d}">${d}</option>`).join('');
    }
    
    // Populate municipality select
    const municipalitySelect = document.getElementById('statsFilterMunicipality');
    if (municipalitySelect) {
        municipalitySelect.innerHTML = '<option value="">Všetky obce</option>' +
            municipalities.map(m => `<option value="${m}">${m}</option>`).join('');
    }
    
    // Event listeners
    setupStatsFilterListeners(territories);
}

function setupStatsFilterListeners(territories) {
    // District change - aktualizuj obce
    const districtSelect = document.getElementById('statsFilterDistrict');
    const municipalitySelect = document.getElementById('statsFilterMunicipality');
    
    if (districtSelect && municipalitySelect) {
        districtSelect.addEventListener('change', function() {
            const selectedDistrict = this.value;
            
            // Resetuj výber obce
            municipalitySelect.value = '';
            
            if (selectedDistrict) {
                // Filtruj obce podľa vybraného okresu
                const districtMunicipalities = [...new Set(
                    territories
                        .filter(t => t.district === selectedDistrict)
                        .map(t => t.municipalityName)
                )].sort();
                
                municipalitySelect.innerHTML = '<option value="">Všetky obce</option>' +
                    districtMunicipalities.map(m => `<option value="${m}">${m}</option>`).join('');
            } else {
                // Všetky obce
                const allMunicipalities = [...new Set(territories.map(t => t.municipalityName))].sort();
                municipalitySelect.innerHTML = '<option value="">Všetky obce</option>' +
                    allMunicipalities.map(m => `<option value="${m}">${m}</option>`).join('');
            }
        });
    }
    
    // Apply filter
    document.getElementById('applyStatsFilter')?.addEventListener('click', function() {
        applyStatsFilter(territories);
    });
}

function applyStatsFilter(territories) {
    const district = document.getElementById('statsFilterDistrict')?.value || '';
    const municipality = document.getElementById('statsFilterMunicipality')?.value || '';
    
    // Filtruj územia
    let filtered = [...territories];
    
    if (district) {
        filtered = filtered.filter(t => t.district === district);
    }
    
    if (municipality) {
        filtered = filtered.filter(t => t.municipalityName === municipality);
    }
    
    statsState.filteredTerritories = filtered;
    
    // Aktualizuj info badge
    const filterInfo = document.getElementById('statsFilterInfo');
    if (filterInfo) {
        let infoText = 'Celý kraj';
        if (municipality) {
            infoText = `Obec: ${municipality}`;
        } else if (district) {
            infoText = `Okres: ${district}`;
        }
        filterInfo.textContent = infoText;
    }
    
    // Aktualizuj štatistiky
    updateStatistics();
}

// REMOVED - resetStatsFilter is no longer needed with the new simple filter design
// Users can simply clear the dropdowns manually

// ============================================================================
// NOVÉ ŠTATISTIKY - IMPLEMENTÁCIA
// ============================================================================

// ============================================================================
// 1. TOP 10 NAJRIZIKOVEJŠÍCH OBCÍ
// ============================================================================

function createTop10RiskyMunicipalities(territories) {
    const municipalityScores = {};
    
    // Vypočítaj skóre pre každú obec
    territories.forEach(territory => {
        const munCode = territory.municipalityCode;
        const munName = territory.municipality?.name || 'Neznáma';
        const district = territory.municipality?.district || 'Neznámy';
        
        if (!municipalityScores[munCode]) {
            municipalityScores[munCode] = {
                name: munName,
                district: district,
                score: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                count: 0
            };
        }
        
        const risk = territory.riskLevel;
        municipalityScores[munCode].count++;
        
        // Bodovanie: kritické=10, vysoké=5, stredné=2, nízke=1
        if (risk === 'critical') {
            municipalityScores[munCode].critical++;
            municipalityScores[munCode].score += 10;
        } else if (risk === 'high') {
            municipalityScores[munCode].high++;
            municipalityScores[munCode].score += 5;
        } else if (risk === 'medium') {
            municipalityScores[munCode].medium++;
            municipalityScores[munCode].score += 2;
        } else if (risk === 'low') {
            municipalityScores[munCode].low++;
            municipalityScores[munCode].score += 1;
        }
    });
    
    // Zoradi podľa skóre a vezmi top 10
    const sorted = Object.values(municipalityScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    return sorted;
}

function renderTop10Table(territories) {
    console.log('🔍 renderTop10Table called with', territories.length, 'territories');
    const top10 = createTop10RiskyMunicipalities(territories);
    console.log('🔍 Top 10 municipalities:', top10);
    const container = document.getElementById('top10MunicipalitiesTable');
    
    if (!container) {
        console.warn('⚠️ Top 10 municipalities table container not found');
        return;
    }
    
    if (top10.length === 0) {
        console.warn('⚠️ No top 10 data to display');
        container.innerHTML = '<p class="no-data">Nedostatok dát pre zobrazenie</p>';
        return;
    }
    
    const html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Obec</th>
                    <th>Okres</th>
                    <th>Skóre</th>
                    <th>🔴 Kritické</th>
                    <th>🟠 Vysoké</th>
                    <th>🟡 Stredné</th>
                    <th>🟢 Nízke</th>
                </tr>
            </thead>
            <tbody>
                ${top10.map((mun, index) => `
                    <tr class="${index < 3 ? 'highlight-row' : ''}">
                        <td class="rank-cell">${index + 1}</td>
                        <td class="name-cell"><strong>${mun.name}</strong></td>
                        <td>${mun.district}</td>
                        <td class="score-cell"><strong>${mun.score}</strong></td>
                        <td class="number-cell">${mun.critical}</td>
                        <td class="number-cell">${mun.high}</td>
                        <td class="number-cell">${mun.medium}</td>
                        <td class="number-cell">${mun.low}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ============================================================================
// 2. TREND ANALÝZA V ČASE
// ============================================================================

function createTrendAnalysis(territories) {
    // Zoskup podľa mesiaca
    const monthlyData = {};
    
    territories.forEach(territory => {
        if (!territory.created_at) return;
        
        const date = new Date(territory.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                total: 0
            };
        }
        
        const risk = territory.riskLevel;
        monthlyData[monthKey].total++;
        if (risk === 'critical') monthlyData[monthKey].critical++;
        else if (risk === 'high') monthlyData[monthKey].high++;
        else if (risk === 'medium') monthlyData[monthKey].medium++;
        else if (risk === 'low') monthlyData[monthKey].low++;
    });
    
    // Zoradi chronologicky
    const sorted = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
            month,
            ...data
        }));
    
    return sorted;
}

function createTrendChart(territories) {
    console.log('🔍 createTrendChart called with', territories.length, 'territories');
    const canvas = document.getElementById('trendChart');
    if (!canvas) {
        console.warn('⚠️ Trend chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const trendData = createTrendAnalysis(territories);
    console.log('🔍 Trend data:', trendData);
    
    if (trendData.length === 0) {
        console.warn('⚠️ No trend data available');
        canvas.parentElement.innerHTML = '<p class="no-data">Nedostatok dát pre trend analýzu<br><small>Zaznamy musia obsahovať dátum vytvorenia</small></p>';
        return;
    }
    
    // Zničíme starý graf ak existuje
    if (charts.trend) {
        charts.trend.destroy();
    }
    
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(d => {
                const [year, month] = d.month.split('-');
                const date = new Date(year, month - 1);
                return date.toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' });
            }),
            datasets: [
                {
                    label: 'Kritické',
                    data: trendData.map(d => d.critical),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Vysoké',
                    data: trendData.map(d => d.high),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Stredné',
                    data: trendData.map(d => d.medium),
                    borderColor: '#eab308',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Nízke',
                    data: trendData.map(d => d.low),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff',
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        precision: 0
                    }
                }
            }
        }
    });
}

// ============================================================================
// 3. MAPA RIZÍK PODĽA OKRESOV (HEATMAP)
// ============================================================================

function createDistrictHeatmap(territories) {
    const districtData = {};
    
    territories.forEach(territory => {
        const district = territory.municipality?.district || 'Neznámy';
        
        if (!districtData[district]) {
            districtData[district] = {
                name: district,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                total: 0,
                score: 0,
                riskLevel: 'low'
            };
        }
        
        const risk = territory.riskLevel;
        districtData[district].total++;
        
        if (risk === 'critical') {
            districtData[district].critical++;
            districtData[district].score += 10;
        } else if (risk === 'high') {
            districtData[district].high++;
            districtData[district].score += 5;
        } else if (risk === 'medium') {
            districtData[district].medium++;
            districtData[district].score += 2;
        } else if (risk === 'low') {
            districtData[district].low++;
            districtData[district].score += 1;
        }
    });
    
    // Určíme úroveň rizika pre každý okres
    Object.values(districtData).forEach(district => {
        const avgScore = district.score / district.total;
        if (avgScore >= 7) district.riskLevel = 'critical';
        else if (avgScore >= 4) district.riskLevel = 'high';
        else if (avgScore >= 2) district.riskLevel = 'medium';
        else district.riskLevel = 'low';
    });
    
    return Object.values(districtData).sort((a, b) => b.score - a.score);
}

function renderDistrictHeatmap(territories) {
    console.log('🔍 renderDistrictHeatmap called with', territories.length, 'territories');
    const container = document.getElementById('districtHeatmapContainer');
    if (!container) {
        console.warn('⚠️ District heatmap container not found');
        return;
    }
    
    const districtData = createDistrictHeatmap(territories);
    console.log('🔍 District heatmap data:', districtData);
    
    if (districtData.length === 0) {
        console.warn('⚠️ No district data to display');
        container.innerHTML = '<p class="no-data">Nedostatok dát pre zobrazenie</p>';
        return;
    }
    
    const html = `
        <div class="heatmap-grid">
            ${districtData.map(district => `
                <div class="heatmap-card risk-${district.riskLevel}">
                    <div class="heatmap-card-header">
                        <h4>${district.name}</h4>
                        <span class="risk-badge risk-${district.riskLevel}">
                            ${getRiskLabelSK(district.riskLevel)}
                        </span>
                    </div>
                    <div class="heatmap-card-body">
                        <div class="heatmap-stat">
                            <span class="stat-label">Celkové skóre:</span>
                            <span class="stat-value">${district.score}</span>
                        </div>
                        <div class="heatmap-stats-row">
                            <div class="mini-stat">
                                <span class="mini-stat-icon">🔴</span>
                                <span>${district.critical}</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-stat-icon">🟠</span>
                                <span>${district.high}</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-stat-icon">🟡</span>
                                <span>${district.medium}</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-stat-icon">🟢</span>
                                <span>${district.low}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

function getRiskLabelSK(riskLevel) {
    const labels = {
        critical: 'Kritické',
        high: 'Vysoké',
        medium: 'Stredné',
        low: 'Nízke'
    };
    return labels[riskLevel] || 'Neznáme';
}

// ============================================================================
// 4. INTERAKTÍVNA MAPA RIZÍK
// ============================================================================

let riskMap = null;
let markersLayer = null;
let clusterGroup = null;

/**
 * Inicializuje interaktívnu mapu s Leaflet.js
 */
function initializeRiskMap(territories) {
    const mapContainer = document.getElementById('riskMapContainer');
    if (!mapContainer) {
        console.warn('⚠️ Risk map container not found');
        return;
    }
    
    // Ak mapa už existuje, len aktualizuj markery (neinicializuj znova)
    if (riskMap) {
        console.log('🗺️ Map already initialized, updating markers only');
        addRiskMarkers(territories, 'all');
        return;
    }
    
    console.log('🗺️ Initializing risk map with', territories.length, 'territories');
    
    // Initialize map centered on Slovakia
    riskMap = L.map('riskMapContainer', {
        center: [48.669, 19.699], // Center of Slovakia
        zoom: 8,
        zoomControl: true,
        attributionControl: true
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
        minZoom: 7
    }).addTo(riskMap);
    
    // Initialize marker cluster group
    if (typeof L.markerClusterGroup !== 'undefined') {
        clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
                const childCount = cluster.getChildCount();
                let className = 'marker-cluster marker-cluster-';
                
                if (childCount < 10) {
                    className += 'small';
                } else if (childCount < 50) {
                    className += 'medium';
                } else {
                    className += 'large';
                }
                
                return L.divIcon({
                    html: '<div><span>' + childCount + '</span></div>',
                    className: className,
                    iconSize: L.point(40, 40)
                });
            }
        });
    }
    
    // Add markers for each territory
    addRiskMarkers(territories, 'all');
    
    // Add legend
    addMapLegend();
    
    // Add controls
    addMapControls(territories);
    
    console.log('✅ Risk map initialized');
}

/**
 * Pridá markery pre každé územie
 */
/**
 * Pridá markery pre každé územie
 * @param {Array} territories - Filtrované územia
 * @param {string} activeFilter - Aktívny filter úrovne rizika (all, critical, high, medium, low)
 */
function addRiskMarkers(territories, activeFilter = 'all') {
    if (!riskMap) return;
    
    // Group territories by municipality to avoid duplicate markers
    const municipalityData = {};
    
    territories.forEach(territory => {
        const munCode = territory.municipalityCode;
        
        if (!municipalityData[munCode]) {
            municipalityData[munCode] = {
                name: territory.municipality?.name || 'Neznáma',
                district: territory.municipality?.district || 'Neznámy',
                // Try to get coordinates from municipality data
                // If not available, we'll need geocoding
                lat: territory.municipality?.latitude || null,
                lng: territory.municipality?.longitude || null,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                score: 0,
                territories: []
            };
        }
        
        // DYNAMICKÝ PREPOČET riskLevel z probability pomocou kódovníka
        const risk = getRiskLevel(territory.probability, statsState.probabilities);
        municipalityData[munCode].territories.push(territory);
        
        if (risk === 'critical') {
            municipalityData[munCode].critical++;
            municipalityData[munCode].score += 10;
        } else if (risk === 'high') {
            municipalityData[munCode].high++;
            municipalityData[munCode].score += 5;
        } else if (risk === 'medium') {
            municipalityData[munCode].medium++;
            municipalityData[munCode].score += 2;
        } else if (risk === 'low') {
            municipalityData[munCode].low++;
            municipalityData[munCode].score += 1;
        }
    });
    
    // Clear existing markers
    if (markersLayer) {
        riskMap.removeLayer(markersLayer);
    }
    if (clusterGroup) {
        clusterGroup.clearLayers();
    }
    
    markersLayer = L.layerGroup();
    
    // Add marker for each municipality with coordinates
    Object.values(municipalityData).forEach(mun => {
        // Skip if no coordinates
        if (!mun.lat || !mun.lng) {
            return;
        }
        
        // Určenie farby a počtu podľa AKTÍVNEHO FILTRA
        let overallRisk;
        let displayCount;
        
        if (activeFilter === 'all') {
            // Pri "všetky úrovne" zobraz najvyššie riziko
            if (mun.critical > 0) {
                overallRisk = 'critical';
                displayCount = mun.critical;
            } else if (mun.high > 0) {
                overallRisk = 'high';
                displayCount = mun.high;
            } else if (mun.medium > 0) {
                overallRisk = 'medium';
                displayCount = mun.medium;
            } else {
                overallRisk = 'low';
                displayCount = mun.low;
            }
        } else {
            // Pri konkrétnom filtri zobraz len tú úroveň
            overallRisk = activeFilter;
            
            if (activeFilter === 'critical') displayCount = mun.critical;
            else if (activeFilter === 'high') displayCount = mun.high;
            else if (activeFilter === 'medium') displayCount = mun.medium;
            else if (activeFilter === 'low') displayCount = mun.low;
        }
        
        // KRITICKÁ PODMIENKA: Nevytváraj marker ak obec nemá žiadne riziko danej úrovne
        if (activeFilter !== 'all' && displayCount === 0) {
            return; // Skip this municipality
        }
        
        // Create custom icon based on risk level
        const icon = createRiskIcon(overallRisk, displayCount);
        
        // Create marker
        const marker = L.marker([mun.lat, mun.lng], { icon: icon });
        
        // Create popup content
        const popupContent = `
            <div class="map-popup">
                <h4>${mun.name}</h4>
                <p class="popup-district">${mun.district}</p>
                <div class="popup-score">
                    <strong>Skóre:</strong> ${mun.score}
                </div>
                <div class="popup-risks">
                    <div class="popup-risk-item">
                        <span class="risk-dot critical"></span>
                        <span>Kritické: ${mun.critical}</span>
                    </div>
                    <div class="popup-risk-item">
                        <span class="risk-dot high"></span>
                        <span>Vysoké: ${mun.high}</span>
                    </div>
                    <div class="popup-risk-item">
                        <span class="risk-dot medium"></span>
                        <span>Stredné: ${mun.medium}</span>
                    </div>
                    <div class="popup-risk-item">
                        <span class="risk-dot low"></span>
                        <span>Nízke: ${mun.low}</span>
                    </div>
                </div>
                <div class="popup-total">
                    <strong>Celkom analýz:</strong> ${mun.territories.length}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add to cluster group if available, otherwise to markers layer
        if (clusterGroup) {
            clusterGroup.addLayer(marker);
        } else {
            markersLayer.addLayer(marker);
        }
    });
    
    // Add to map
    if (clusterGroup) {
        riskMap.addLayer(clusterGroup);
    } else {
        riskMap.addLayer(markersLayer);
    }
}

/**
 * Vytvorí vlastnú ikonu podľa úrovne rizika
 */
function createRiskIcon(riskLevel, score) {
    const colors = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e'
    };
    
    const color = colors[riskLevel] || colors.low;
    
    // Size based on score (bigger = more risky)
    let size = 12;
    if (score > 100) size = 20;
    else if (score > 50) size = 16;
    else if (score > 20) size = 14;
    
    return L.divIcon({
        className: 'risk-marker',
        html: `
            <div class="risk-marker-inner" style="
                background-color: ${color};
                width: ${size}px;
                height: ${size}px;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
}

/**
 * Pridá legendu k mape
 */
function addMapLegend() {
    if (!riskMap) return;
    
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <h4>Úroveň rizika</h4>
            <div class="legend-item">
                <span class="legend-color" style="background: #ef4444;"></span>
                Kritické
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #f97316;"></span>
                Vysoké
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #eab308;"></span>
                Stredné
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #22c55e;"></span>
                Nízke
            </div>
        `;
        return div;
    };
    
    legend.addTo(riskMap);
}

/**
 * Pridá ovládacie prvky k mape
 */
function addMapControls(territories) {
    if (!riskMap) return;
    
    const controls = L.control({ position: 'topleft' });
    
    controls.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-controls');
        div.innerHTML = `
            <button id="mapZoomReset" class="map-control-btn" title="Reset zoom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <path d="M3 12h18M12 3v18"/>
                </svg>
            </button>
            <button id="mapFilterToggle" class="map-control-btn" title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
            </button>
        `;
        
        // Prevent map interactions when clicking controls
        L.DomEvent.disableClickPropagation(div);
        
        return div;
    };
    
    controls.addTo(riskMap);
    
    // Pridaj event listeners len raz (kontroluj flag)
    if (!statsState.mapInitialized) {
        statsState.mapInitialized = true;
        console.log('🗺️ Adding map event listeners (once)');
        
        setTimeout(() => {
            const resetBtn = document.getElementById('mapZoomReset');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    riskMap.setView([48.669, 19.699], 8);
                });
            }
            
            // Add risk level filter listener
            const riskFilter = document.getElementById('mapRiskFilter');
            if (riskFilter) {
                riskFilter.addEventListener('change', (e) => {
                    const selectedLevel = e.target.value;
                    console.log('🗺️ Filtering map by risk level:', selectedLevel);
                    // Použiť allTerritories zo state namiesto parametra
                    filterMapByRiskLevel(statsState.allTerritories, selectedLevel);
                });
            }
        }, 100);
    }
}

/**
 * Filtruje markery na mape podľa úrovne rizika
 */
function filterMapByRiskLevel(allTerritories, riskLevel) {
    if (!riskMap) return;
    
    // ÚPLNÉ VYČISTENIE - odstráň starý cluster group a vytvor nový
    if (clusterGroup) {
        riskMap.removeLayer(clusterGroup);
        clusterGroup.clearLayers();
    }
    if (markersLayer) {
        riskMap.removeLayer(markersLayer);
        markersLayer.clearLayers();
    }
    
    // Vytvor nový cluster group
    if (typeof L.markerClusterGroup !== 'undefined') {
        clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
                const childCount = cluster.getChildCount();
                let className = 'marker-cluster marker-cluster-';
                
                if (childCount < 10) {
                    className += 'small';
                } else if (childCount < 50) {
                    className += 'medium';
                } else {
                    className += 'large';
                }
                
                return L.divIcon({
                    html: '<div><span>' + childCount + '</span></div>',
                    className: className,
                    iconSize: L.point(40, 40)
                });
            }
        });
    }
    
    console.log(`🗺️ Filtering map by: ${riskLevel}`);
    
    // NOVÚ LOGIKA: Agreguj VŠETKY územia po obciach, potom filtruj obce
    const municipalityData = {};
    
    // FÁZA 1: Agregácia VŠETKÝCH území po obciach
    allTerritories.forEach(territory => {
        const munCode = territory.municipalityCode;
        
        if (!municipalityData[munCode]) {
            municipalityData[munCode] = {
                name: territory.municipality?.name || 'Neznáma',
                district: territory.municipality?.district || 'Neznámy',
                lat: territory.municipality?.latitude || null,
                lng: territory.municipality?.longitude || null,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                score: 0,
                territories: []
            };
        }
        
        // DYNAMICKÝ PREPOČET riskLevel z probability
        const risk = getRiskLevel(territory.probability, statsState.probabilities);
        municipalityData[munCode].territories.push(territory);
        
        if (risk === 'critical') {
            municipalityData[munCode].critical++;
            municipalityData[munCode].score += 10;
        } else if (risk === 'high') {
            municipalityData[munCode].high++;
            municipalityData[munCode].score += 5;
        } else if (risk === 'medium') {
            municipalityData[munCode].medium++;
            municipalityData[munCode].score += 2;
        } else if (risk === 'low') {
            municipalityData[munCode].low++;
            municipalityData[munCode].score += 1;
        }
    });
    
    // FÁZA 2: Filtruj obce ktoré majú aspoň 1 riziko vybranej úrovne
    let filteredMunicipalities = Object.values(municipalityData);
    
    if (riskLevel !== 'all') {
        filteredMunicipalities = filteredMunicipalities.filter(mun => {
            if (riskLevel === 'critical') return mun.critical > 0;
            if (riskLevel === 'high') return mun.high > 0;
            if (riskLevel === 'medium') return mun.medium > 0;
            if (riskLevel === 'low') return mun.low > 0;
            return false;
        });
    }
    
    console.log(`🗺️ Showing ${filteredMunicipalities.length} municipalities with ${riskLevel} risk`);
    
    // FÁZA 3: Vytvor markery pre filtrované obce
    createMarkersForMunicipalities(filteredMunicipalities, riskLevel);
}

/**
 * Vytvorí markery pre zoznam obcí
 */
function createMarkersForMunicipalities(municipalities, activeFilter) {
    if (!riskMap) return;
    
    municipalities.forEach(mun => {
        // Skip if no coordinates
        if (!mun.lat || !mun.lng) {
            return;
        }
        
        // Určenie farby a počtu podľa AKTÍVNEHO FILTRA
        let overallRisk;
        let displayCount;
        
        if (activeFilter === 'all') {
            // Pri "všetky úrovne" zobraz najvyššie riziko
            if (mun.critical > 0) {
                overallRisk = 'critical';
                displayCount = mun.critical;
            } else if (mun.high > 0) {
                overallRisk = 'high';
                displayCount = mun.high;
            } else if (mun.medium > 0) {
                overallRisk = 'medium';
                displayCount = mun.medium;
            } else {
                overallRisk = 'low';
                displayCount = mun.low;
            }
        } else {
            // Pri konkrétnom filtri zobraz len tú úroveň
            overallRisk = activeFilter;
            
            if (activeFilter === 'critical') displayCount = mun.critical;
            else if (activeFilter === 'high') displayCount = mun.high;
            else if (activeFilter === 'medium') displayCount = mun.medium;
            else if (activeFilter === 'low') displayCount = mun.low;
        }
        
        // KRITICKÁ PODMIENKA: Nevytváraj marker ak obec nemá žiadne riziko danej úrovne
        if (activeFilter !== 'all' && displayCount === 0) {
            return; // Skip this municipality
        }
        
        // Create custom icon
        const icon = createRiskIcon(overallRisk, displayCount);
        const marker = L.marker([mun.lat, mun.lng], { icon: icon });
        
        // Create popup
        const popupContent = `
            <div class="map-popup">
                <h4>${mun.name}</h4>
                <p class="popup-district">${mun.district}</p>
                <div class="popup-score">
                    <strong>Skóre:</strong> ${mun.score}
                </div>
                <div class="popup-risks">
                    <div class="popup-risk-item">
                        <span class="risk-dot critical"></span>
                        <span>Kritické: ${mun.critical}</span>
                    </div>
                    <div class="popup-risk-item">
                        <span class="risk-dot high"></span>
                        <span>Vysoké: ${mun.high}</span>
                    </div>
                    <div class="popup-risk-item">
                        <span class="risk-dot medium"></span>
                        <span>Stredné: ${mun.medium}</span>
                    </div>
                    <div class="popup-risk-item">
                        <span class="risk-dot low"></span>
                        <span>Nízke: ${mun.low}</span>
                    </div>
                </div>
                <div class="popup-total">
                    <strong>Celkom analýz:</strong> ${mun.territories.length}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        if (clusterGroup) {
            clusterGroup.addLayer(marker);
        }
    });
    
    // Pridaj cluster group späť na mapu
    if (clusterGroup) {
        riskMap.addLayer(clusterGroup);
    }
}

// ============================================================================
// EXPORT
// ============================================================================

export { initializeStatistics };
