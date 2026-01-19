// ============================================================================
// Supabase Database Operations
// ============================================================================

import { supabase } from './config.js';

// ============================================================================
// NAČÍTANIE KÓDOVNÍKOV
// ============================================================================

/**
 * Načíta všetky obce z Supabase
 */
export async function loadMunicipalities() {
    try {
        const { data, error } = await supabase
            .from('municipalities')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ Načítaných ${data.length} obcí`);
        return data || [];
    } catch (error) {
        console.error('❌ Chyba pri načítaní obcí:', error);
        return [];
    }
}

/**
 * Načíta iba obce ktoré majú GPS súradnice (pre mapu)
 * SPRÁVNA SYNTAX pre NOT NULL filter
 */
export async function loadMunicipalitiesWithCoordinates() {
    try {
        const { data, error } = await supabase
            .from('municipalities')
            .select('code, name, district, latitude, longitude, population')
            .not('latitude', 'is', null)  // ✅ SPRÁVNA SYNTAX!
            .not('longitude', 'is', null) // ✅ SPRÁVNA SYNTAX!
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ Načítaných ${data.length} obcí so súradnicami`);
        return data || [];
    } catch (error) {
        console.error('❌ Chyba pri načítaní obcí so súradnicami:', error);
        return [];
    }
}

/**
 * Načíta všetky krízové javy z Supabase
 */
export async function loadEvents() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('code', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ Načítaných ${data.length} krízových javov`);
        return data || [];
    } catch (error) {
        console.error('❌ Chyba pri načítaní krízových javov:', error);
        return [];
    }
}

/**
 * Načíta všetky ohrozujúce faktory z Supabase
 */
export async function loadFactors() {
    try {
        const { data, error } = await supabase
            .from('factors')
            .select('*')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ Načítaných ${data.length} ohrozujúcich faktorov`);
        return data || [];
    } catch (error) {
        console.error('❌ Chyba pri načítaní faktorov:', error);
        return [];
    }
}

/**
 * Načíta všetky pravdepodobnosti výskytu z Supabase
 * DÔLEŽITÉ: Vracia aj stĺpec riskLevel
 */
export async function loadProbabilities() {
    try {
        const { data, error } = await supabase
            .from('probabilities')
            .select('*')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ Načítaných ${data.length} pravdepodobností`);
        return data || [];
    } catch (error) {
        console.error('❌ Chyba pri načítaní pravdepodobností:', error);
        return [];
    }
}

// ============================================================================
// CRUD OPERÁCIE PRE ANALYZOVANÉ ÚZEMIA
// ============================================================================

/**
 * Načíta všetky analyzované územia s JOIN na všetky potrebné tabuľky
 * @param {Function} progressCallback - Voliteľný callback pre zobrazenie progressu (percent, loaded, total)
 */
export async function loadTerritories(progressCallback = null) {
    try {
        let allTerritories = [];
        let pageSize = 1000;
        let pageNumber = 0;
        let hasMore = true;
        
        // Načítaj všetky záznamy s pagináciou (Supabase má limit 1000 na dotaz)
        while (hasMore) {
            const from = pageNumber * pageSize;
            const to = from + pageSize - 1;
            
            const { data, error, count } = await supabase
                .from('territories')
                .select(`
                    *,
                    municipalities!territories_municipalityCode_fkey (
                        code,
                        name,
                        district,
                        districtCode,
                        region,
                        regionCode,
                        evidCode,
                        population,
                        latitude,
                        longitude
                    ),
                    events!territories_eventCode_fkey (
                        code,
                        nameSk,
                        nameEn,
                        category,
                        isCategory,
                        planType,
                        ministry,
                        parentCode
                    ),
                    factors!territories_factorId_fkey (
                        id,
                        name,
                        order
                    )
                `, { count: 'exact' })
                .order('importedAt', { ascending: false })
                .range(from, to);
            
            if (error) throw error;
            
            // Transformuj dáta do plochej štruktúry pre jednoduchšie spracovanie
            const pageData = data.map(territory => ({
                id: territory.id,
                municipalityCode: territory.municipalityCode,
                municipalityName: territory.municipalities?.name || '',
                municipality: territory.municipalities ? {
                    code: territory.municipalities.code,
                    name: territory.municipalities.name,
                    district: territory.municipalities.district,
                    districtCode: territory.municipalities.districtCode,
                    region: territory.municipalities.region,
                    regionCode: territory.municipalities.regionCode,
                    population: territory.municipalities.population,
                    latitude: territory.municipalities.latitude,  
                    longitude: territory.municipalities.longitude 
                } : null,
                district: territory.municipalities?.district || '',
                region: territory.municipalities?.region || '',
                eventCode: territory.eventCode,
                eventName: territory.events?.nameSk || '',
                factorId: territory.factorId,
                factorName: territory.factors?.name || '',
                riskSource: territory.riskSource,
                probability: territory.probability,
                riskLevel: territory.riskLevel || 'low',
                endangeredPopulation: territory.endangeredPopulation,
                endangeredArea: territory.endangeredArea,
                predictedDisruption: territory.predictedDisruption,
                importedAt: territory.importedAt,
                created_at: territory.created_at || territory.importedAt,
                source: territory.source
            }));
            
            allTerritories = allTerritories.concat(pageData);
            
            // Skontroluj či sú ešte ďalšie záznamy
            hasMore = data.length === pageSize;
            pageNumber++;
            
            // Volaj progress callback ak existuje
            if (progressCallback && count) {
                const percent = Math.round((allTerritories.length / count) * 100);
                progressCallback(percent, allTerritories.length, count);
            }
            
            console.log(`📄 Načítaná strana ${pageNumber}, spolu ${allTerritories.length} záznamov (z ${count} celkom)`);
        }
        
        console.log(`✅ Načítaných ${allTerritories.length} analyzovaných území`);
        return allTerritories;
    } catch (error) {
        console.error('❌ Chyba pri načítaní území:', error);
        return [];
    }
}

/**
 * Vytvorí nové analyzované územie
 */
export async function createTerritory(territoryData) {
    try {
        const { data, error } = await supabase
            .from('territories')
            .insert([{
                municipalityCode: territoryData.municipalityCode,
                eventCode: territoryData.eventCode,
                factorId: territoryData.factorId,
                riskSource: territoryData.riskSource || '',
                probability: territoryData.probability || '',
                riskLevel: territoryData.riskLevel || 'low',
                endangeredPopulation: territoryData.endangeredPopulation || 0,
                endangeredArea: territoryData.endangeredArea || 0,
                predictedDisruption: territoryData.predictedDisruption || '',
                importedAt: new Date().toISOString(),
                source: territoryData.source || 'manual_entry'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Územie vytvorené s ID:', data.id);
        return data.id;
    } catch (error) {
        console.error('❌ Chyba pri vytváraní územia:', error);
        throw error;
    }
}

/**
 * Aktualizuje existujúce analyzované územie
 */
export async function updateTerritory(territoryId, territoryData) {
    try {
        const { data, error } = await supabase
            .from('territories')
            .update({
                municipalityCode: territoryData.municipalityCode,
                eventCode: territoryData.eventCode,
                factorId: territoryData.factorId,
                riskSource: territoryData.riskSource,
                probability: territoryData.probability,
                riskLevel: territoryData.riskLevel,
                endangeredPopulation: territoryData.endangeredPopulation,
                endangeredArea: territoryData.endangeredArea,
                predictedDisruption: territoryData.predictedDisruption
            })
            .eq('id', territoryId)
            .select();
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            throw new Error(`Územie s ID ${territoryId} nebolo nájdené alebo nemôže byť aktualizované`);
        }
        
        console.log('✅ Územie aktualizované:', territoryId);
        return true;
    } catch (error) {
        console.error('❌ Chyba pri aktualizácii územia:', error);
        throw error;
    }
}

/**
 * Zmaže analyzované územie
 */
export async function deleteTerritory(territoryId) {
    try {
        const { error } = await supabase
            .from('territories')
            .delete()
            .eq('id', territoryId);
        
        if (error) throw error;
        
        console.log('✅ Územie zmazané:', territoryId);
        return true;
    } catch (error) {
        console.error('❌ Chyba pri mazaní územia:', error);
        throw error;
    }
}

/**
 * Získa jedno územie podľa ID
 */
export async function getTerritory(territoryId) {
    try {
        const { data, error } = await supabase
            .from('territories')
            .select(`
                *,
                municipalities!territories_municipalityCode_fkey (*),
                events!territories_eventCode_fkey (*),
                factors!territories_factorId_fkey (*)
            `)
            .eq('id', territoryId)
            .single();
        
        if (error) throw error;
        
        if (data) {
            return {
                id: data.id,
                municipalityCode: data.municipalityCode,
                municipalityName: data.municipalities?.name || '',
                district: data.municipalities?.district || '',
                region: data.municipalities?.region || '',
                eventCode: data.eventCode,
                eventName: data.events?.nameSk || '',
                factorId: data.factorId,
                factorName: data.factors?.name || '',
                riskSource: data.riskSource,
                probability: data.probability,
                // riskLevel sa NEVYPLŇA - bude sa počítať dynamicky z probability
                endangeredPopulation: data.endangeredPopulation,
                endangeredArea: data.endangeredArea,
                predictedDisruption: data.predictedDisruption,
                importedAt: data.importedAt,
                source: data.source
            };
        }
        
        console.warn('⚠️ Územie nenájdené:', territoryId);
        return null;
    } catch (error) {
        console.error('❌ Chyba pri získavaní územia:', error);
        throw error;
    }
}

// ============================================================================
// HELPER FUNKCIE
// ============================================================================

/**
 * Určí úroveň rizika na základe pravdepodobnosti výskytu
 * UPRAVENÉ: Používa kódovník probabilities namiesto pevného mapovania
 * 
 * @param {string} probabilityName - Názov pravdepodobnosti (napr. "Každých 6 - 10 rokov")
 * @param {Array} probabilitiesCodelist - Pole objektov z tabuľky probabilities
 * @returns {string} Úroveň rizika ('critical', 'high', 'medium', 'low')
 */
export function getRiskLevel(probabilityName, probabilitiesCodelist = []) {
    // Ak nemáme kódovník, použijeme fallback
    if (!probabilitiesCodelist || probabilitiesCodelist.length === 0) {
        console.warn('⚠️ Kódovník pravdepodobností nie je k dispozícii, používam fallback');
        return 'low';
    }
    
    // Normalizuj vstup: trim, lowercase, odstráň viacnásobné medzery
    const normalizedInput = probabilityName ? 
        probabilityName.trim().toLowerCase().replace(/\s+/g, ' ') : 
        '';
    
    // Nájdi pravdepodobnosť v kódovníku s normalizovaným porovnaním
    const probability = probabilitiesCodelist.find(p => {
        const normalizedName = p.name ? 
            p.name.trim().toLowerCase().replace(/\s+/g, ' ') : 
            '';
        return normalizedName === normalizedInput;
    });
    
    if (probability && probability.riskLevel) {
        return probability.riskLevel;
    }
    
    // FALLBACK MAPA pre hodnoty ktoré nie sú v kódovníku
    // Toto umožňuje aplikácii fungovať aj s legacy dátami a variantmi textu
    const fallbackMap = {
        // Legacy hodnoty
        'ročne': 'critical',
        'každoročne': 'critical',
        '1': 'critical',
        '2': 'critical',
        '3': 'high',
        '4': 'high',
        '5': 'medium',
        'neznáme': 'low',
        'neurčené': 'low',
        '': 'low',
        
        // Varianty "každé" vs "každých" - kvôli nekonzistencii v dátach
        'každé 2 - 3 roky': 'critical',
        'každé 2 - 3 rokov': 'critical',
        'každé 2- 3 rokov': 'critical',
        'každé  2- 3 rokov': 'critical',
        'každých 2 - 3 roky': 'critical',
        'každých 2 - 3 rokov': 'critical',
        
        'každé 4 - 5 rokov': 'critical',
        'každých 4 - 5 rokov': 'critical',
        
        'každé 6 - 10 rokov': 'high',
        'každých 6 - 10 rokov': 'high',
        
        'každé 11 - 20 rokov': 'high',
        'každých 11 - 20 rokov': 'high',
        
        'každé 21 - 30 rokov': 'medium',
        'každých 21 - 30 rokov': 'medium',
        
        'každé 31 - 50 rokov': 'medium',
        'každých 31 - 50 rokov': 'medium',
        
        'každé 50 - 100 rokov': 'low',
        'každých 50 - 100 rokov': 'low',
        
        'každé 100 - 200 rokov': 'low',
        'každých 100 - 200 rokov': 'low',
        
        'každé 200 a viac rokov': 'low',
        'každých 200 a viac rokov': 'low'
    };
    
    // Skús fallback mapu
    if (fallbackMap[normalizedInput]) {
        return fallbackMap[normalizedInput];
    }
    
    // Ak stále nič, zaloguj a vráť low
    if (!window._missingProbabilities) {
        window._missingProbabilities = new Set();
    }
    if (!window._missingProbabilities.has(normalizedInput) && window._missingProbabilities.size < 10) {
        console.warn(`⚠️ Nenašla sa pravdepodobnosť "${probabilityName}" v kódovníku ani vo fallback mape, používam fallback: low`);
        window._missingProbabilities.add(normalizedInput);
    }
    
    return 'low';
}

/**
 * Vráti label pre úroveň rizika
 * Bodka je pridaná cez CSS ::before
 */
export function getRiskLabel(level) {
    const labels = {
        critical: 'Kritické',
        high: 'Vysoké',
        medium: 'Stredné',
        low: 'Nízke'
    };
    return labels[level] || 'Nízke';
}

// ============================================================================
// ŠTATISTICKÉ FUNKCIE
// ============================================================================

/**
 * Získa agregované štatistiky podľa okresu
 */
export async function getStatisticsByDistrict() {
    try {
        const { data, error } = await supabase
            .rpc('get_statistics_by_district');
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Chyba pri získavaní štatistík:', error);
        return [];
    }
}

/**
 * Získa top N krízových javov podľa počtu výskytov
 */
export async function getTopEvents(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('territories')
            .select('eventCode, events!territories_eventCode_fkey(nameSk)')
            .not('eventCode', 'is', null);
        
        if (error) throw error;
        
        // Spočítaj výskyty v JS (lepšie by bolo použiť RPC funkciu)
        const counts = {};
        data.forEach(item => {
            const eventName = item.events?.nameSk || item.eventCode;
            counts[eventName] = (counts[eventName] || 0) + 1;
        });
        
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));
    } catch (error) {
        console.error('❌ Chyba pri získavaní top udalostí:', error);
        return [];
    }
}