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
 */
export async function loadTerritories() {
    try {
        const { data, error } = await supabase
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
                    population
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
            `)
            .order('importedAt', { ascending: false });
        
        if (error) throw error;
        
        // Transformuj dáta do plochej štruktúry pre jednoduchšie spracovanie
        const territories = data.map(territory => ({
            id: territory.id,
            municipalityCode: territory.municipalityCode,
            municipalityName: territory.municipalities?.name || '',
            district: territory.municipalities?.district || '',
            region: territory.municipalities?.region || '',
            eventCode: territory.eventCode,
            eventName: territory.events?.nameSk || '',
            factorId: territory.factorId,
            factorName: territory.factors?.name || '',
            riskSource: territory.riskSource,
            probability: territory.probability,
            riskLevel: territory.riskLevel,
            endangeredPopulation: territory.endangeredPopulation,
            endangeredArea: territory.endangeredArea,
            predictedDisruption: territory.predictedDisruption,
            importedAt: territory.importedAt,
            source: territory.source
        }));
        
        console.log(`✅ Načítaných ${territories.length} analyzovaných území`);
        return territories;
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
            .select()
            .single();
        
        if (error) throw error;
        
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
                riskLevel: data.riskLevel,
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
 */
export function getRiskLevel(probability) {
    const riskMap = {
        'Každé 2 - 3 roky': 'critical',
        'Každých 4 - 5 rokov': 'critical',
        'Každých 6 - 10 rokov': 'high',
        'Každých 11 - 20 rokov': 'high',
        'Každých 21 - 30 rokov': 'medium',
        'Každých 31 - 50 rokov': 'medium',
        'Každých 50 - 100 rokov': 'medium',
        'Každých 100 - 200 rokov': 'low',
        'Každých 200 a viac rokov': 'low'
    };
    return riskMap[probability] || 'low';
}

/**
 * Vráti label pre úroveň rizika
 */
export function getRiskLabel(level) {
    const labels = {
        critical: '🔴 Kritické',
        high: '🟠 Vysoké',
        medium: '🟡 Stredné',
        low: '🟢 Nízke'
    };
    return labels[level] || '🟢 Nízke';
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
