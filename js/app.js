// ============================================================================
// SAMU - Systém analýzy mimoriadnych udalostí
// Hlavná aplikačná logika s Supabase
// ============================================================================

import { supabase } from './config.js';
import {
    loadMunicipalities,
    loadEvents,
    loadFactors,
    loadProbabilities,
    loadTerritories,
    createTerritory,
    updateTerritory,
    deleteTerritory,
    getRiskLevel,
    getRiskLabel
} from './supabase.js';

import { initializeStatistics } from './statistics.js';
import { initializeCodelists } from './codelists.js';
import { initializeNotifications, requestNotificationPermission, createNotification } from './notifications.js';
import {
    exportToExcel,
    exportFilteredToExcel,
    exportToPDF,
    showExportLoading,
    hideExportLoading
} from './export.js';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let appState = {
    // Kódovníky načítané z Firestore
    municipalities: [],
    events: [],
    factors: [],
    probabilities: [],
    
    // Analyzované územia
    territories: [],
    filteredTerritories: [],
    
    // Filtre
    filters: {
        region: '',
        district: '',
        municipality: '',
        risk: '',
        search: ''
    },
    
    // Pagination
    currentPage: 1,
    itemsPerPage: 100,
    totalPages: 1,
    
    // UI stav
    editingTerritoryId: null,
    isLoading: false
};

// ============================================================================
// INICIALIZÁCIA APLIKÁCIE
// ============================================================================

export async function initializeApp() {
    console.log('🚀 Inicializujem aplikáciu SAMU...');
    
    try {
        // Zobraz loading
        showLoading(true);
        
        // Načítaj kódovníky z Firestore
        console.log('📥 Načítavam kódovníky...');
        const [municipalities, events, factors, probabilities] = await Promise.all([
            loadMunicipalities(),
            loadEvents(),
            loadFactors(),
            loadProbabilities()
        ]);
        
        appState.municipalities = municipalities;
        appState.events = events;
        appState.factors = factors;
        appState.probabilities = probabilities;
        
        // Naplň dropdowny
        populateDropdowns();
        populateFilters();
        
        // Načítaj analyzované územia
        console.log('📥 Načítavam analyzované územia...');
        appState.territories = await loadTerritories((percent, loaded, total) => {
            showLoading(true, percent, loaded, total);
        });
        appState.filteredTerritories = [...appState.territories].sort((a, b) => 
            a.municipalityName.localeCompare(b.municipalityName, 'sk')
        );
        
        // Vyrenderuj tabuľku a štatistiky
        renderTable();
        updateStats();
        
        // Inicializuj kódovníky
        initializeCodelists(municipalities, events, factors, probabilities);
        
        // Inicializuj notifikácie
        console.log('🔔 Inicializujem notifikácie...');
        await initializeNotifications();
        
        // Request notification permission if not granted
        requestNotificationPermission();
        
        console.log('✅ Aplikácia úspešne inicializovaná!');
        console.log(`   - Obce: ${municipalities.length}`);
        console.log(`   - Krízové javy: ${events.length}`);
        console.log(`   - Faktory: ${factors.length}`);
        console.log(`   - Pravdepodobnosti: ${probabilities.length}`);
        console.log(`   - Analyzované územia: ${appState.territories.length}`);
        
    } catch (error) {
        console.error('❌ Chyba pri inicializácii:', error);
        alert('Chyba pri načítaní dát z databázy. Skontrolujte konzolu.');
    } finally {
        showLoading(false);
    }
}

// ============================================================================
// LOADING STATE
// ============================================================================

function showLoading(show, percent = 0, loaded = 0, total = 0) {
    appState.isLoading = show;
    const tableBody = document.getElementById('tableBody');
    
    if (show) {
        let message = 'Načítavam dáta...';
        if (percent > 0 && total > 0) {
            message = `Načítavam dáta... ${percent}% (${loaded.toLocaleString('sk-SK')} / ${total.toLocaleString('sk-SK')})`;
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem;">
                    <div class="loading"></div>
                    <p style="margin-top: 1rem; color: var(--gray-600); font-weight: 500;">${message}</p>
                    ${percent > 0 ? `
                        <div style="max-width: 400px; margin: 1rem auto; background: #e5e7eb; border-radius: 10px; height: 8px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #2980b9, #3498db); transition: width 0.3s ease;"></div>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `;
    }
}

// ============================================================================
// POPULÁCIA DROPDOWNOV
// ============================================================================

function populateDropdowns() {
    // Obce
    const municipalitySelect = document.getElementById('municipality');
    municipalitySelect.innerHTML = '<option value="">Vyberte obec...</option>';
    
    appState.municipalities.forEach(mun => {
        const option = document.createElement('option');
        option.value = mun.code;
        option.textContent = mun.name;
        option.dataset.district = mun.district;
        option.dataset.region = mun.region;
        municipalitySelect.appendChild(option);
    });
    
    // Krízové javy
    const eventSelect = document.getElementById('event');
    eventSelect.innerHTML = '<option value="">Vyberte krízový jav...</option>';
    
    appState.events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.code;
        option.textContent = `${event.code} - ${event.nameSk}`;
        eventSelect.appendChild(option);
    });
    
    // Faktory
    const factorSelect = document.getElementById('factor');
    factorSelect.innerHTML = '<option value="">Vyberte ohrozujúci faktor...</option>';
    
    appState.factors.forEach(factor => {
        const option = document.createElement('option');
        option.value = factor.id;
        option.textContent = factor.name;
        factorSelect.appendChild(option);
    });
    
    // Pravdepodobnosti
    const probabilitySelect = document.getElementById('probability');
    probabilitySelect.innerHTML = '<option value="">Vyberte pravdepodobnosť...</option>';
    
    appState.probabilities.forEach(prob => {
        const option = document.createElement('option');
        option.value = prob.name;
        option.textContent = prob.name;
        probabilitySelect.appendChild(option);
    });
}

function populateFilters() {
    // Kraje - unikátne z obcí
    const regions = [...new Set(appState.municipalities.map(m => m.region))].sort((a, b) => a.localeCompare(b, 'sk'));
    const regionSelect = document.getElementById('filterRegion');
    regionSelect.innerHTML = '<option value="">Všetky kraje</option>';
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
    
    // Okresy
    const districts = [...new Set(appState.municipalities.map(m => m.district))].sort((a, b) => a.localeCompare(b, 'sk'));
    const districtSelect = document.getElementById('filterDistrict');
    districtSelect.innerHTML = '<option value="">Všetky okresy</option>';
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
    
    // Obce
    const municipalitySelect = document.getElementById('filterMunicipality');
    municipalitySelect.innerHTML = '<option value="">Všetky obce</option>';
    appState.municipalities.forEach(mun => {
        const option = document.createElement('option');
        option.value = mun.name;
        option.textContent = mun.name;
        municipalitySelect.appendChild(option);
    });
}

// ============================================================================
// RENDERING
// ============================================================================

function renderTable() {
    const tbody = document.getElementById('tableBody');
    
    if (appState.filteredTerritories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <h3>Žiadne záznamy</h3>
                        <p>Začnite pridaním nového záznamu alebo upravte filtre</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Vypočítaj pagination
    const totalItems = appState.filteredTerritories.length;
    appState.totalPages = Math.ceil(totalItems / appState.itemsPerPage);
    
    // Zabezpeč že currentPage je v rozsahu
    if (appState.currentPage > appState.totalPages) {
        appState.currentPage = appState.totalPages;
    }
    if (appState.currentPage < 1) {
        appState.currentPage = 1;
    }
    
    // Získaj len aktuálnu stránku
    const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
    const endIndex = startIndex + appState.itemsPerPage;
    const pageItems = appState.filteredTerritories.slice(startIndex, endIndex);
    
    // Render len aktuálnu stránku (rýchlejšie)
    const rows = pageItems.map(territory => {
        // DYNAMICKÝ PREPOČET riskLevel z probability pomocou kódovníka
        const riskLevel = getRiskLevel(territory.probability, appState.probabilities);
        
        return `
        <tr>
            <td>
                <span class="risk-badge ${riskLevel}">
                    ${getRiskLabel(riskLevel)}
                </span>
            </td>
            <td><strong>${territory.municipalityName}</strong></td>
            <td>${territory.district}</td>
            <td>${territory.region}</td>
            <td>${territory.eventName}</td>
            <td>${territory.factorName}</td>
            <td>${territory.probability}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="window.editTerritory('${territory.id}')" title="Upraviť">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteTerritoryConfirm('${territory.id}')" title="Zmazať">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
    
    tbody.innerHTML = rows;
    
    // Update pagination UI
    updatePaginationUI();
}

function updatePaginationUI() {
    // Vytvor/aktualizuj pagination controls
    let paginationDiv = document.getElementById('paginationControls');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'paginationControls';
        paginationDiv.className = 'pagination-controls';
        const dataPanel = document.querySelector('.data-panel');
        if (dataPanel) {
            dataPanel.appendChild(paginationDiv);
        } else {
            console.warn('⚠️ .data-panel element not found, pagination will not be displayed');
            return;
        }
    }
    
    const totalItems = appState.filteredTerritories.length;
    const startItem = (appState.currentPage - 1) * appState.itemsPerPage + 1;
    const endItem = Math.min(appState.currentPage * appState.itemsPerPage, totalItems);
    
    paginationDiv.innerHTML = `
        <div class="pagination-info">
            Zobrazených ${startItem}-${endItem} z ${totalItems} záznamov
        </div>
        <div class="pagination-buttons">
            <button class="btn btn-outline" id="firstPage" ${appState.currentPage === 1 ? 'disabled' : ''}>
                « Prvá
            </button>
            <button class="btn btn-outline" id="prevPage" ${appState.currentPage === 1 ? 'disabled' : ''}>
                ‹ Predchádzajúca
            </button>
            <span class="pagination-current">
                Strana ${appState.currentPage} z ${appState.totalPages}
            </span>
            <button class="btn btn-outline" id="nextPage" ${appState.currentPage === appState.totalPages ? 'disabled' : ''}>
                Ďalšia ›
            </button>
            <button class="btn btn-outline" id="lastPage" ${appState.currentPage === appState.totalPages ? 'disabled' : ''}>
                Posledná »
            </button>
        </div>
        <div class="pagination-jump">
            <select id="itemsPerPageSelect" class="filter-select" style="width: auto;">
                <option value="50" ${appState.itemsPerPage === 50 ? 'selected' : ''}>50 na stránku</option>
                <option value="100" ${appState.itemsPerPage === 100 ? 'selected' : ''}>100 na stránku</option>
                <option value="200" ${appState.itemsPerPage === 200 ? 'selected' : ''}>200 na stránku</option>
                <option value="500" ${appState.itemsPerPage === 500 ? 'selected' : ''}>500 na stránku</option>
            </select>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('firstPage')?.addEventListener('click', () => {
        appState.currentPage = 1;
        renderTable();
    });
    
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            renderTable();
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (appState.currentPage < appState.totalPages) {
            appState.currentPage++;
            renderTable();
        }
    });
    
    document.getElementById('lastPage')?.addEventListener('click', () => {
        appState.currentPage = appState.totalPages;
        renderTable();
    });
    
    document.getElementById('itemsPerPageSelect')?.addEventListener('change', (e) => {
        appState.itemsPerPage = parseInt(e.target.value);
        appState.currentPage = 1;
        renderTable();
    });
}

function updateStats() {
    const stats = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    };
    
    // DYNAMICKÝ PREPOČET riskLevel pre každé územie pomocou kódovníka
    appState.territories.forEach(territory => {
        const riskLevel = getRiskLevel(territory.probability, appState.probabilities);
        stats[riskLevel]++;
    });
    
    document.getElementById('criticalCount').textContent = stats.critical;
    document.getElementById('highCount').textContent = stats.high;
    document.getElementById('mediumCount').textContent = stats.medium;
    document.getElementById('lowCount').textContent = stats.low;
}

// ============================================================================
// FILTERING
// ============================================================================

function applyFilters() {
    appState.filters = {
        region: document.getElementById('filterRegion').value,
        district: document.getElementById('filterDistrict').value,
        municipality: document.getElementById('filterMunicipality').value,
        risk: document.getElementById('filterRisk').value,
        search: document.getElementById('searchInput').value
    };
    
    let filtered = [...appState.territories];
    
    if (appState.filters.region) {
        filtered = filtered.filter(t => t.region === appState.filters.region);
    }
    
    if (appState.filters.district) {
        filtered = filtered.filter(t => t.district === appState.filters.district);
    }
    
    if (appState.filters.municipality) {
        filtered = filtered.filter(t => t.municipalityName === appState.filters.municipality);
    }
    
    if (appState.filters.risk) {
        // DYNAMICKÝ PREPOČET riskLevel pre filtrovanie pomocou kódovníka
        filtered = filtered.filter(t => getRiskLevel(t.probability, appState.probabilities) === appState.filters.risk);
    }
    
    if (appState.filters.search) {
        const search = appState.filters.search.toLowerCase();
        filtered = filtered.filter(t => 
            (t.municipalityName && t.municipalityName.toLowerCase().includes(search)) ||
            (t.eventName && t.eventName.toLowerCase().includes(search)) ||
            (t.factorName && t.factorName.toLowerCase().includes(search)) ||
            (t.riskSource && t.riskSource.toLowerCase().includes(search))
        );
    }
    
    // Zoraď výsledky abecedne podľa obce
    filtered.sort((a, b) => a.municipalityName.localeCompare(b.municipalityName, 'sk'));
    
    appState.filteredTerritories = filtered;
    appState.currentPage = 1; // Reset pagination na prvú stránku
    renderTable();
}

function resetFilters() {
    document.getElementById('filterRegion').value = '';
    document.getElementById('filterDistrict').value = '';
    document.getElementById('filterMunicipality').value = '';
    document.getElementById('filterRisk').value = '';
    document.getElementById('searchInput').value = '';
    
    appState.filters = {
        region: '',
        district: '',
        municipality: '',
        risk: '',
        search: ''
    };
    
    appState.filteredTerritories = [...appState.territories].sort((a, b) => 
        a.municipalityName.localeCompare(b.municipalityName, 'sk')
    );
    renderTable();
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

function openRecordModal(territoryId = null) {
    const modal = document.getElementById('recordModal');
    const form = document.getElementById('recordForm');
    const title = document.getElementById('modalTitle');
    
    if (territoryId) {
        // Edit mode
        title.textContent = 'Upraviť záznam';
        appState.editingTerritoryId = territoryId;
        
        // Porovnaj ID ako stringy (HTML atribúty sú vždy stringy)
        const territory = appState.territories.find(t => String(t.id) === String(territoryId));
        
        if (territory) {
            document.getElementById('municipality').value = territory.municipalityCode;
            document.getElementById('district').value = territory.district;
            document.getElementById('region').value = territory.region;
            document.getElementById('municipalityCode').value = territory.municipalityCode;
            document.getElementById('event').value = territory.eventCode;
            document.getElementById('eventCode').value = territory.eventCode;
            document.getElementById('factor').value = territory.factorId;
            document.getElementById('riskSource').value = territory.riskSource;
            document.getElementById('probability').value = territory.probability;
            document.getElementById('endangeredPopulation').value = territory.endangeredPopulation || '';
            document.getElementById('endangeredArea').value = territory.endangeredArea || '';
            document.getElementById('predictedDisruption').value = territory.predictedDisruption || '';
            
            // DYNAMICKY NASTAVIŤ ÚROVEŇ RIZIKA z pravdepodobnosti
            const riskLevel = getRiskLevel(territory.probability, appState.probabilities);
            document.getElementById('riskLevel').value = riskLevel;
        } else {
            console.error('❌ Territory not found with ID:', territoryId);
        }
    } else {
        // Add mode
        title.textContent = 'Pridať nový záznam';
        appState.editingTerritoryId = null;
        form.reset();
    }
    
    openModal('recordModal');
}

// ============================================================================
// FORM HANDLING
// ============================================================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const municipalityCode = document.getElementById('municipality').value;
    const municipality = appState.municipalities.find(m => m.code === municipalityCode);
    
    const eventCode = document.getElementById('event').value;
    const event = appState.events.find(e => e.code === eventCode);
    
    const factorId = document.getElementById('factor').value;
    const factor = appState.factors.find(f => f.id === factorId);
    
    const probability = document.getElementById('probability').value;
    
    const territoryData = {
        municipalityCode: municipalityCode,
        municipalityName: municipality.name,
        district: municipality.district,
        region: municipality.region,
        eventCode: eventCode,
        eventName: event.nameSk,
        factorId: factorId,
        factorName: factor.name,
        riskSource: document.getElementById('riskSource').value,
        probability: probability,
        endangeredPopulation: parseInt(document.getElementById('endangeredPopulation').value) || 0,
        endangeredArea: parseFloat(document.getElementById('endangeredArea').value) || 0,
        predictedDisruption: document.getElementById('predictedDisruption').value,
        riskLevel: getRiskLevel(probability, appState.probabilities)
    };
    
    try {
        // Zobraz loading
        showLoading(true);
        
        if (appState.editingTerritoryId) {
            // Update existing
            console.log('🔄 Calling updateTerritory with ID:', appState.editingTerritoryId, 'Type:', typeof appState.editingTerritoryId);
            await updateTerritory(appState.editingTerritoryId, territoryData);
        } else {
            // Create new
            await createTerritory(territoryData);
        }
        
        // Zavri modal PRED obnovenim dat (aby bol uzivatel pripraveny)
        closeModal('recordModal');
        document.getElementById('recordForm').reset();
        
        // Refresh data - znovu nacitaj vsetko z DB
        appState.territories = await loadTerritories((percent, loaded, total) => {
            showLoading(true, percent, loaded, total);
        });
        
        // Znovu aplikuj aktualne filtre (aby sa zachovali)
        applyFilters();
        
        // Aktualizuj statistiky
        updateStats();
        
        // Skry loading
        showLoading(false);
        
        // Zobraz uspesnu spravu AZ PO obnoveni tabulky
        if (appState.editingTerritoryId) {
            
            // Vytvor notifikáciu o aktualizácii
            await createNotification(
                'RISK_UPDATE',
                'Riziko aktualizované',
                `Riziko v obci ${territoryData.municipalityName} bolo aktualizované`,
                {
                    municipality: territoryData.municipalityName,
                    event: territoryData.eventName,
                    riskLevel: territoryData.riskLevel
                }
            );
        } else {
            
            // Vytvor notifikáciu o novom riziku
            await createNotification(
                'NEW_RISK',
                'Nové riziko pridané',
                `Pridané ${getRiskLabel(territoryData.riskLevel)} riziko v obci ${territoryData.municipalityName} - ${territoryData.eventName}`,
                {
                    municipality: territoryData.municipalityName,
                    event: territoryData.eventName,
                    riskLevel: territoryData.riskLevel
                }
            );
        }
        
    } catch (error) {
        showLoading(false);
        console.error('❌ Chyba pri ukladaní:', error);
        alert('Chyba pri ukladaní záznamu. Skontrolujte konzolu.');
    }
}

// ============================================================================
// DELETE HANDLING
// ============================================================================

async function deleteTerritoryConfirm(territoryId) {
    if (!confirm('Naozaj chcete zmazať tento záznam?')) {
        return;
    }
    
    // Najdi územie pred zmazaním (aby sme mali údaje pre notifikáciu)
    const territory = appState.territories.find(t => t.id === territoryId);
    
    try {
        // Zobraz loading
        showLoading(true);
        
        await deleteTerritory(territoryId);
        
        // Refresh data - znovu nacitaj vsetko z DB
        appState.territories = await loadTerritories((percent, loaded, total) => {
            showLoading(true, percent, loaded, total);
        });
        
        // Znovu aplikuj aktualne filtre (aby sa zachovali)
        applyFilters();
        
        // Aktualizuj statistiky
        updateStats();
        
        // Skry loading
        showLoading(false);
        
        // Vytvor notifikáciu o zmazaní
        if (territory) {
            await createNotification(
                'RISK_DELETED',
                'Riziko odstránené',
                `Riziko v obci ${territory.municipalityName} - ${territory.eventName} bolo odstránené`,
                {
                    municipality: territory.municipalityName,
                    event: territory.eventName
                }
            );
        }
        
    } catch (error) {
        showLoading(false);
        console.error('❌ Chyba pri mazaní:', error);
        alert('Chyba pri mazaní záznamu. Skontrolujte konzolu.');
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Note: initializeApp() is now called from auth.js after successful login
    // to ensure data is loaded only when user is authenticated
    
    // Municipality change handler
    document.getElementById('municipality').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            document.getElementById('district').value = selectedOption.dataset.district;
            document.getElementById('region').value = selectedOption.dataset.region;
            document.getElementById('municipalityCode').value = selectedOption.value;
        }
    });
    
    // Event change handler
    document.getElementById('event').addEventListener('change', function() {
        document.getElementById('eventCode').value = this.value;
    });
    
    // Probability change handler - automaticky aktualizuj úroveň rizika
    document.getElementById('probability').addEventListener('change', function() {
        const riskLevel = getRiskLevel(this.value, appState.probabilities);
        document.getElementById('riskLevel').value = riskLevel;
    });
    
    // Form submit
    document.getElementById('recordForm').addEventListener('submit', handleFormSubmit);
    
    // Button event listeners
    document.getElementById('addRecordBtn').addEventListener('click', () => openRecordModal());
    document.getElementById('closeModal').addEventListener('click', () => closeModal('recordModal'));
    document.getElementById('cancelBtn').addEventListener('click', () => closeModal('recordModal'));
    
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
    
    document.getElementById('exportBtn').addEventListener('click', () => openModal('exportModal'));
    document.getElementById('closeExportModal').addEventListener('click', () => closeModal('exportModal'));
    
    // Export buttons
    document.getElementById('exportExcel').addEventListener('click', async () => {
        try {
            closeModal('exportModal');
            showExportLoading('Exportujem do Excel...');
            
            await exportToExcel(
                appState.territories,
                appState.municipalities,
                appState.events,
                appState.factors
            );
            
            hideExportLoading();
        } catch (error) {
            hideExportLoading();
            alert('Chyba pri exporte do Excel: ' + error.message);
        }
    });
    
    document.getElementById('exportPDF').addEventListener('click', async () => {
        try {
            closeModal('exportModal');
            showExportLoading('Vytváram PDF report...');
            
            await exportToPDF(
                appState.territories,
                appState.municipalities,
                appState.events,
                appState.factors
            );
            
            hideExportLoading();
        } catch (error) {
            hideExportLoading();
            alert('Chyba pri exporte do PDF: ' + error.message);
        }
    });
    
    document.getElementById('exportFiltered').addEventListener('click', async () => {
        try {
            closeModal('exportModal');
            
            if (appState.filteredTerritories.length === 0) {
                alert('Nie sú žiadne záznamy na export. Skúste zmeniť filtre.');
                return;
            }
            
            showExportLoading(`Exportujem ${appState.filteredTerritories.length} filtrovaných záznamov...`);
            
            await exportFilteredToExcel(appState.filteredTerritories, appState.filters);
            
            hideExportLoading();
        } catch (error) {
            hideExportLoading();
            alert('Chyba pri exporte filtrovaných dát: ' + error.message);
        }
    });

    // Navigation between views
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });

    // Stats button in header
    document.getElementById('statsBtn')?.addEventListener('click', () => {
        switchView('statistics');
    });
    
    // Close modal on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
});

// ============================================================================
// VIEW SWITCHING
// ============================================================================

let currentView = 'analysis';

function switchView(viewName) {
    currentView = viewName;
    
    // Hide all views
    const analysisView = document.getElementById('analysisView');
    const statisticsView = document.getElementById('statisticsView');
    const codelistsView = document.getElementById('codelistsView');
    
    if (analysisView) analysisView.style.display = 'none';
    if (statisticsView) statisticsView.style.display = 'none';
    if (codelistsView) codelistsView.style.display = 'none';
    
    // Show selected view
    if (viewName === 'analysis' && analysisView) {
        analysisView.style.display = 'block';
    } else if (viewName === 'statistics' && statisticsView) {
        statisticsView.style.display = 'block';
        // Reinitialize statistics when view is shown
        initializeStatistics(appState.territories, appState.municipalities, appState.events, appState.probabilities);
    } else if (viewName === 'codelists' && codelistsView) {
        codelistsView.style.display = 'block';
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        }
    });
}

// ============================================================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================================================

window.editTerritory = openRecordModal;
window.deleteTerritoryConfirm = deleteTerritoryConfirm;

