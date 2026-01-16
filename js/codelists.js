// ============================================================================
// CODELISTS MODULE - codelists.js
// Správa kódovníkov pre SAMU aplikáciu
// ============================================================================

import { supabase } from './config.js';

// ============================================================================
// STATE
// ============================================================================

let codelistsState = {
    currentCodelist: 'municipalities',
    editingId: null,
    municipalities: [],
    events: [],
    factors: [],
    probabilities: []
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export async function initializeCodelists(municipalities, events, factors, probabilities) {
    console.log('📋 Inicializujem kódovníky...');
    
    codelistsState.municipalities = municipalities;
    codelistsState.events = events;
    codelistsState.factors = factors;
    codelistsState.probabilities = probabilities;
    
    // Update counts
    updateCounts();
    
    // Setup add buttons (if they exist)
    setupAddButtons();
    
    // Setup forms
    setupForms();
    
    // Setup search
    setupSearch();
    
    // Render all codelists (no tabs in new design)
    renderMunicipalities();
    renderEvents();
    renderFactors();
    renderProbabilities();
    
    console.log('✅ Kódovníky inicializované');
}

function updateCounts() {
    const municipalityCountEl = document.getElementById('municipalityCount');
    const eventCountEl = document.getElementById('eventCount');
    const factorCountEl = document.getElementById('factorCount');
    const probabilityCountEl = document.getElementById('probabilityCount');
    
    if (municipalityCountEl) {
        municipalityCountEl.textContent = `${codelistsState.municipalities.length} záznamov`;
    }
    if (eventCountEl) {
        eventCountEl.textContent = `${codelistsState.events.length} záznamov`;
    }
    if (factorCountEl) {
        factorCountEl.textContent = `${codelistsState.factors.length} záznamov`;
    }
    if (probabilityCountEl) {
        probabilityCountEl.textContent = `${codelistsState.probabilities.length} záznamov`;
    }
}

// ============================================================================
// TABS - Deprecated in new design, keeping for compatibility
// ============================================================================

function setupCodelistTabs() {
    // No longer needed - all tables visible at once
    // Keeping function for backward compatibility
}

function switchCodelist(codelistName) {
    // No longer needed - all tables visible at once
    // Keeping function for backward compatibility
    codelistsState.currentCodelist = codelistName;
    renderCodelist(codelistName);
}

// ============================================================================
// RENDERING
// ============================================================================

function renderCodelist(codelistName) {
    switch(codelistName) {
        case 'municipalities':
            renderMunicipalities();
            break;
        case 'events':
            renderEvents();
            break;
        case 'factors':
            renderFactors();
            break;
        case 'probabilities':
            renderProbabilities();
            break;
    }
}

function renderMunicipalities() {
    const tbody = document.getElementById('municipalitiesTableBody');
    const search = document.getElementById('searchMunicipalities')?.value.toLowerCase() || '';
    
    const filtered = codelistsState.municipalities.filter(m =>
        m.name.toLowerCase().includes(search) ||
        m.code.includes(search) ||
        m.district.toLowerCase().includes(search)
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:2rem;color:#999;">
                    <div>📋</div>
                    <div style="margin-top:1rem;">Žiadne výsledky</div>
                </td>
            </tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(mun => `
        <tr>
            <td><span class="code-cell">${mun.code}</span></td>
            <td><strong>${mun.name}</strong></td>
            <td>${mun.district}</td>
            <td>${mun.region}</td>
            <td class="actions-cell">
                <div class="action-btns">
                    <button class="action-btn edit" onclick="window.editCodelistItem('municipalities', '${mun.code}')" title="Upraviť">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteCodelistItem('municipalities', '${mun.code}', '${(mun.name || '').replace(/'/g, "\\'")}' )" title="Zmazať">
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
    `).join('');
}

function renderEvents() {
    const tbody = document.getElementById('eventsTableBody');
    const search = document.getElementById('searchEvents')?.value.toLowerCase() || '';
    
    const filtered = codelistsState.events.filter(e =>
        (e.nameSk && e.nameSk.toLowerCase().includes(search)) ||
        (e.code && e.code.toLowerCase().includes(search)) ||
        (e.nameEn && e.nameEn.toLowerCase().includes(search))
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:2rem;color:#999;">
                    <div>📋</div>
                    <div style="margin-top:1rem;">Žiadne výsledky</div>
                </td>
            </tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(event => `
        <tr>
            <td><span class="code-cell">${event.code}</span></td>
            <td><strong>${event.nameSk || 'undefined'}</strong></td>
            <td>${event.nameEn || '-'}</td>
            <td class="actions-cell">
                <div class="action-btns">
                    <button class="action-btn edit" onclick="window.editCodelistItem('events', '${event.code}')" title="Upraviť">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteCodelistItem('events', '${event.code}', '${(event.nameSk || '').replace(/'/g, "\\'")}' )" title="Zmazať">
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
    `).join('');
}

function renderFactors() {
    const tbody = document.getElementById('factorsTableBody');
    const search = document.getElementById('searchFactors')?.value.toLowerCase() || '';
    
    const filtered = codelistsState.factors.filter(f =>
        f.name.toLowerCase().includes(search)
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center;padding:2rem;color:#999;">
                    <div>📋</div>
                    <div style="margin-top:1rem;">Žiadne výsledky</div>
                </td>
            </tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(factor => `
        <tr>
            <td class="order-cell">${factor.order}</td>
            <td><strong>${factor.name}</strong></td>
            <td class="actions-cell">
                <div class="action-btns">
                    <button class="action-btn edit" onclick="window.editCodelistItem('factors', '${factor.id}')" title="Upraviť">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteCodelistItem('factors', '${factor.id}', '${(factor.name || '').replace(/'/g, "\\'")}' )" title="Zmazať">
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
    `).join('');
}

function renderProbabilities() {
    const tbody = document.getElementById('probabilitiesTableBody');
    
    const probabilities = codelistsState.probabilities;
    
    if (probabilities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:2rem;color:#999;">
                    <div>📋</div>
                    <div style="margin-top:1rem;">Žiadne výsledky</div>
                </td>
            </tr>`;
        return;
    }
    
    tbody.innerHTML = probabilities.map(prob => {
        const riskLabel = {
            critical: '🔴 Kritické',
            high: '🟠 Vysoké',
            medium: '🟡 Stredné',
            low: '🟢 Nízke'
        }[prob.riskLevel] || prob.riskLevel;
        
        return `
        <tr>
            <td class="order-cell">${prob.order}</td>
            <td><strong>${prob.name || ''}</strong></td>
            <td class="risk-level-cell ${prob.riskLevel}">${riskLabel}</td>
            <td class="actions-cell">
                <div class="action-btns">
                    <button class="action-btn edit" onclick="window.editCodelistItem('probabilities', '${prob.id}')" title="Upraviť">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteCodelistItem('probabilities', '${prob.id}', '${(prob.name || '').replace(/'/g, "\\'")}' )" title="Zmazať">
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
    `}).join('');
}

// ============================================================================
// ADD BUTTONS
// ============================================================================

function setupAddButtons() {
    document.getElementById('addMunicipality')?.addEventListener('click', () => openAddModal('municipalities'));
    document.getElementById('addEvent')?.addEventListener('click', () => openAddModal('events'));
    document.getElementById('addFactor')?.addEventListener('click', () => openAddModal('factors'));
    document.getElementById('addProbability')?.addEventListener('click', () => openAddModal('probabilities'));
}

function openAddModal(codelistType) {
    codelistsState.editingId = null;
    
    const modalMap = {
        municipalities: 'municipalityModal',
        events: 'eventModal',
        factors: 'factorModal',
        probabilities: 'probabilityModal'
    };
    
    const titleMap = {
        municipalities: 'Pridať obec',
        events: 'Pridať krízový jav',
        factors: 'Pridať faktor',
        probabilities: 'Pridať pravdepodobnosť'
    };
    
    const modalId = modalMap[codelistType];
    const title = titleMap[codelistType];
    
    // Reset form
    document.getElementById(`${modalId.replace('Modal', 'Form')}`).reset();
    
    // Set title
    document.getElementById(`${modalId.replace('Modal', 'ModalTitle')}`).textContent = title;
    
    // Show modal
    document.getElementById(modalId).classList.add('active');
}

// ============================================================================
// EDIT
// ============================================================================

window.editCodelistItem = function(codelistType, itemId) {
    codelistsState.editingId = itemId;
    
    // Správne PK pre každý typ
    let item;
    if (codelistType === 'municipalities' || codelistType === 'events') {
        item = codelistsState[codelistType].find(i => i.code === itemId); // municipalities a events majú PK code
    } else {
        item = codelistsState[codelistType].find(i => i.id === itemId); // factors a probabilities majú PK id
    }
    
    if (!item) {
        console.error('Item not found:', codelistType, itemId);
        return;
    }
    
    const modalMap = {
        municipalities: 'municipalityModal',
        events: 'eventModal',
        factors: 'factorModal',
        probabilities: 'probabilityModal'
    };
    
    const titleMap = {
        municipalities: 'Upraviť obec',
        events: 'Upraviť krízový jav',
        factors: 'Upraviť faktor',
        probabilities: 'Upraviť pravdepodobnosť'
    };
    
    const modalId = modalMap[codelistType];
    
    // Fill form
    if (codelistType === 'municipalities') {
        document.getElementById('mun_code').value = item.code;
        document.getElementById('mun_name').value = item.name;
        document.getElementById('mun_district').value = item.district;
        document.getElementById('mun_region').value = item.region;
    } else if (codelistType === 'events') {
        document.getElementById('event_code').value = item.code;
        document.getElementById('event_name').value = item.nameSk || item.name || ''; // nameSk z DB
        document.getElementById('event_description').value = item.description || '';
    } else if (codelistType === 'factors') {
        document.getElementById('factor_order').value = item.order;
        document.getElementById('factor_name').value = item.name;
    } else if (codelistType === 'probabilities') {
        document.getElementById('prob_order').value = item.order;
        document.getElementById('prob_interval').value = item.name; // name z DB je interval
        const riskLevelSelect = document.getElementById('prob_risk_level');
        if (riskLevelSelect) {
            riskLevelSelect.value = item.riskLevel || '';
        }
    }
    
    // Set title
    document.getElementById(`${modalId.replace('Modal', 'ModalTitle')}`).textContent = titleMap[codelistType];
    
    // Show modal
    document.getElementById(modalId).classList.add('active');
};

// ============================================================================
// DELETE
// ============================================================================

window.deleteCodelistItem = async function(codelistType, itemId, itemName) {
    if (!confirm(`Naozaj chcete zmazať:\n\n${itemName}?\n\nTáto akcia je nenávratná.`)) return;
    
    const tableMap = {
        municipalities: 'municipalities',
        events: 'events',
        factors: 'factors',
        probabilities: 'probabilities'
    };
    
    const pkMap = {
        municipalities: 'code', // municipalities používa code ako PK
        events: 'code',        // events používa code ako PK
        factors: 'id',         // factors používa id ako PK
        probabilities: 'id'    // probabilities používa id ako PK
    };
    
    try {
        const { error } = await supabase
            .from(tableMap[codelistType])
            .delete()
            .eq(pkMap[codelistType], itemId);
        
        if (error) throw error;
        
        // Remove from state
        const pkField = pkMap[codelistType];
        const index = codelistsState[codelistType].findIndex(i => i[pkField] === itemId);
        if (index > -1) {
            codelistsState[codelistType].splice(index, 1);
        }
        
        // Update counts
        updateCounts();
        
        // Re-render
        renderCodelist(codelistType);
        
        alert('✅ Záznam bol úspešne zmazaný!');
    } catch (error) {
        console.error('❌ Chyba pri mazaní:', error);
        alert('❌ Chyba pri mazaní záznamu: ' + error.message);
    }
};

// ============================================================================
// FORMS
// ============================================================================

function setupForms() {
    // Municipality form
    document.getElementById('municipalityForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMunicipality();
    });
    
    // Event form
    document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEvent();
    });
    
    // Factor form
    document.getElementById('factorForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveFactor();
    });
    
    // Probability form
    document.getElementById('probabilityForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProbability();
    });
}

async function saveMunicipality() {
    const data = {
        code: document.getElementById('mun_code').value.trim(),
        name: document.getElementById('mun_name').value.trim(),
        district: document.getElementById('mun_district').value.trim(),
        region: document.getElementById('mun_region').value.trim()
    };
    
    try {
        if (codelistsState.editingId) {
            // Update - v Supabase používame code ako PK
            const { error } = await supabase
                .from('municipalities')
                .update(data)
                .eq('code', codelistsState.editingId);
            
            if (error) throw error;
            
            const index = codelistsState.municipalities.findIndex(m => m.code === codelistsState.editingId);
            if (index > -1) {
                codelistsState.municipalities[index] = { ...codelistsState.municipalities[index], ...data };
            }
        } else {
            // Create
            const { data: newMun, error } = await supabase
                .from('municipalities')
                .insert([data])
                .select()
                .single();
            
            if (error) throw error;
            codelistsState.municipalities.push(newMun);
        }
        
        // Re-sort
        codelistsState.municipalities.sort((a, b) => a.name.localeCompare(b.name, 'sk'));
        
        closeCodelistModal('municipalityModal');
        updateCounts();
        renderMunicipalities();
        alert('✅ Obec bola úspešne uložená!');
    } catch (error) {
        console.error('❌ Chyba pri ukladaní:', error);
        alert('❌ Chyba pri ukladaní obce: ' + error.message);
    }
}

async function saveEvent() {
    const data = {
        code: document.getElementById('event_code').value.trim(),
        nameSk: document.getElementById('event_name').value.trim(), // nameSk v databáze
        description: document.getElementById('event_description').value.trim() || null
    };
    
    try {
        if (codelistsState.editingId) {
            // Update - v Supabase používame code ako PK
            const { error } = await supabase
                .from('events')
                .update(data)
                .eq('code', codelistsState.editingId);
            
            if (error) throw error;
            
            const index = codelistsState.events.findIndex(e => e.code === codelistsState.editingId);
            if (index > -1) {
                codelistsState.events[index] = { ...codelistsState.events[index], ...data };
            }
        } else {
            // Create
            const { data: newEvent, error } = await supabase
                .from('events')
                .insert([data])
                .select()
                .single();
            
            if (error) throw error;
            codelistsState.events.push(newEvent);
        }
        
        // Re-sort
        codelistsState.events.sort((a, b) => a.code.localeCompare(b.code));
        
        closeCodelistModal('eventModal');
        updateCounts();
        renderEvents();
        alert('✅ Krízový jav bol úspešne uložený!');
    } catch (error) {
        console.error('❌ Chyba pri ukladaní:', error);
        alert('❌ Chyba pri ukladaní krízového javu: ' + error.message);
    }
}

async function saveFactor() {
    const data = {
        order: parseInt(document.getElementById('factor_order').value),
        name: document.getElementById('factor_name').value.trim()
    };
    
    try {
        if (codelistsState.editingId) {
            // Update - v Supabase používame id ako PK
            const { error } = await supabase
                .from('factors')
                .update(data)
                .eq('id', codelistsState.editingId);
            
            if (error) throw error;
            
            const index = codelistsState.factors.findIndex(f => f.id === codelistsState.editingId);
            if (index > -1) {
                codelistsState.factors[index] = { ...codelistsState.factors[index], ...data };
            }
        } else {
            // Create
            const { data: newFactor, error } = await supabase
                .from('factors')
                .insert([data])
                .select()
                .single();
            
            if (error) throw error;
            codelistsState.factors.push(newFactor);
        }
        
        // Re-sort
        codelistsState.factors.sort((a, b) => a.order - b.order);
        
        closeCodelistModal('factorModal');
        updateCounts();
        renderFactors();
        alert('✅ Faktor bol úspešne uložený!');
    } catch (error) {
        console.error('❌ Chyba pri ukladaní:', error);
        alert('❌ Chyba pri ukladaní faktora: ' + error.message);
    }
}

async function saveProbability() {
    const data = {
        order: parseInt(document.getElementById('prob_order').value),
        name: document.getElementById('prob_interval').value.trim(), // prob_interval je ID v HTML
        riskLevel: document.getElementById('prob_risk_level').value
    };
    
    try {
        if (codelistsState.editingId) {
            // Update - v Supabase používame id ako PK
            const { error } = await supabase
                .from('probabilities')
                .update(data)
                .eq('id', codelistsState.editingId);
            
            if (error) throw error;
            
            const index = codelistsState.probabilities.findIndex(p => p.id === codelistsState.editingId);
            if (index > -1) {
                codelistsState.probabilities[index] = { ...codelistsState.probabilities[index], ...data };
            }
        } else {
            // Create
            const { data: newProb, error } = await supabase
                .from('probabilities')
                .insert([data])
                .select()
                .single();
            
            if (error) throw error;
            codelistsState.probabilities.push(newProb);
        }
        
        // Re-sort
        codelistsState.probabilities.sort((a, b) => a.order - b.order);
        
        closeCodelistModal('probabilityModal');
        updateCounts();
        renderProbabilities();
        alert('✅ Pravdepodobnosť bola úspešne uložená!');
    } catch (error) {
        console.error('❌ Chyba pri ukladaní:', error);
        alert('❌ Chyba pri ukladaní pravdepodobnosti: ' + error.message);
    }
}

// ============================================================================
// MODAL CLOSE
// ============================================================================

window.closeCodelistModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
    codelistsState.editingId = null;
};

// ============================================================================
// SEARCH
// ============================================================================

function setupSearch() {
    document.getElementById('searchMunicipalities')?.addEventListener('input', () => renderMunicipalities());
    document.getElementById('searchEvents')?.addEventListener('input', () => renderEvents());
    document.getElementById('searchFactors')?.addEventListener('input', () => renderFactors());
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export function updateCodelistsData(municipalities, events, factors, probabilities) {
    codelistsState.municipalities = municipalities;
    codelistsState.events = events;
    codelistsState.factors = factors;
    codelistsState.probabilities = probabilities;
    updateCounts();
    if (codelistsState.currentCodelist) {
        renderCodelist(codelistsState.currentCodelist);
    }
}
