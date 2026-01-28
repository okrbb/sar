// ============================================================================
// Export Module
// Funkcie pre export dát do rôznych formátov
// ============================================================================

import { getRiskLabel } from './supabase.js';

// ============================================================================
// Excel Export using SheetJS
// ============================================================================

/**
 * Export všetkých území do Excel súboru
 * @param {Array} territories - Pole území na export
 * @param {Array} municipalities - Pole obcí pre lookup
 * @param {Array} events - Pole krízových javov pre lookup
 * @param {Array} factors - Pole faktorov pre lookup
 */
export async function exportToExcel(territories, municipalities, events, factors) {
    try {
        console.log('📊 Začínam export do Excel...');
        
        // Importuj ExcelJS z CDN
        const ExcelJS = await loadExcelJS();
        
        // Zoraď územia podľa okresov a obcí (slovenská abeceda)
        const sortedTerritories = [...territories].sort((a, b) => {
            // Primárne zoradenie podľa okresu
            const districtCompare = (a.district || '').localeCompare(b.district || '', 'sk');
            if (districtCompare !== 0) return districtCompare;
            
            // Sekundárne zoradenie podľa obce
            return (a.municipalityName || '').localeCompare(b.municipalityName || '', 'sk');
        });
        
        // Vytvor workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SAR';
        workbook.created = new Date();
        
        // Vytvor worksheet
        const worksheet = workbook.addWorksheet('Analýza území');
        
        // Definuj stĺpce s hlavičkami
        // UPRAVENÉ: Všetky stĺpce majú teraz zapnuté zalamovanie (wrapText)
        worksheet.columns = [
            { 
                header: 'Kód obce', 
                key: 'municipalityCode', 
                width: 12,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Obec', 
                key: 'municipalityName', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Okres', 
                key: 'district', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Kraj', 
                key: 'region', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Kód javu', 
                key: 'eventCode', 
                width: 12,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Krízový jav', 
                key: 'eventName', 
                width: 27,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Ohrozujúci faktor', 
                key: 'factorName', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Zdroj rizika', 
                key: 'riskSource', 
                width: 27,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Pravdepodobnosť', 
                key: 'probability', 
                width: 22,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Počet výskytu za obdobie', 
                key: 'probabilitylevel', 
                width: 14,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Úroveň rizika', 
                key: 'riskLevel', 
                width: 9,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Ohrozené obyvateľstvo', 
                key: 'endangeredPopulation', 
                width: 14,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Ohrozená plocha (km²)', 
                key: 'endangeredArea', 
                width: 15,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Predpokladaný sekundárny krízový jav 1', 
                key: 'predictedDisruption', 
                width: 27, 
                style: { alignment: { wrapText: true, vertical: 'top' } } 
            },
            { 
                header: 'Predpokladaný sekundárny krízový jav 2', 
                key: 'predictedDisruption2', 
                width: 27, 
                style: { alignment: { wrapText: true, vertical: 'top' } } 
            },
            { 
                header: 'Predpokladaný sekundárny krízový jav 3', 
                key: 'predictedDisruption3', 
                width: 27, 
                style: { alignment: { wrapText: true, vertical: 'top' } } 
            },
            { 
                header: 'Presah územia', 
                key: 'possibleOverlap', 
                width: 9,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            }
        ];
        
        // Pridaj dáta
        sortedTerritories.forEach(territory => {
            worksheet.addRow({
                municipalityCode: parseInt(territory.municipalityCode) || null,
                municipalityName: territory.municipalityName || '',
                district: territory.district || '',
                region: territory.region || '',
                eventCode: territory.eventCode || '',
                eventName: territory.eventName || '',
                factorName: territory.factorName || '',
                riskSource: territory.riskSource || '',
                probability: territory.probability || '',
                probabilitylevel: parseInt(territory.probabilitylevel) || null,
                riskLevel: getRiskLabel(territory.riskLevel),
                endangeredPopulation: parseInt(territory.endangeredPopulation) || null,
                endangeredArea: parseInt(territory.endangeredArea) || null,
                predictedDisruption: territory.predictedDisruption || '',
                predictedDisruption2: territory.predictedDisruption2 || '',
                predictedDisruption3: territory.predictedDisruption3 || '',
                possibleOverlap: territory.possibleOverlap || ''
            });
        });
        
        // Štýl hlavičky (prvý riadok)
        const headerRow = worksheet.getRow(1);
        headerRow.height = 40;
        headerRow.font = { bold: true, size: 11 };
        headerRow.alignment = { 
            vertical: 'middle', 
            horizontal: 'center',
            wrapText: true 
        };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        headerRow.border = {
            bottom: { style: 'medium', color: { argb: 'FF000000' } }
        };
        
        // Zapni autofilter
        // UPRAVENÉ: Rozšírené na 17 stĺpcov (aby pokrývalo všetky stĺpce)
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: 17 }
        };
        
        // Zamrazni prvý riadok
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];
        
        // Vytvor štatistický sheet
        const statsWorksheet = workbook.addWorksheet('Štatistiky');
        const stats = calculatePDFStatistics(territories);
        
        statsWorksheet.columns = [
            { header: 'Kategória', key: 'category', width: 35 },
            { header: 'Hodnota', key: 'value', width: 20 }
        ];
        
        // Štýl hlavičky štatistík
        const statsHeaderRow = statsWorksheet.getRow(1);
        statsHeaderRow.font = { bold: true };
        statsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
        statsHeaderRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        
        // Pridaj štatistiky
        statsWorksheet.addRow({ category: 'Úroveň rizika', value: '' });
        statsWorksheet.addRow({ category: 'Kritické', value: stats.riskLevels.critical });
        statsWorksheet.addRow({ category: 'Vysoké', value: stats.riskLevels.high });
        statsWorksheet.addRow({ category: 'Stredné', value: stats.riskLevels.medium });
        statsWorksheet.addRow({ category: 'Nízke', value: stats.riskLevels.low });
        statsWorksheet.addRow({ category: '', value: '' });
        statsWorksheet.addRow({ category: 'Celkové údaje', value: '' });
        statsWorksheet.addRow({ category: 'Celkový počet záznamov', value: stats.total });
        statsWorksheet.addRow({ category: 'Počet obcí', value: Object.keys(stats.municipalities).length });
        statsWorksheet.addRow({ category: 'Celkové ohrozené obyvateľstvo', value: stats.totalPopulation });
        statsWorksheet.addRow({ category: 'Celková ohrozená plocha (km²)', value: stats.totalArea.toFixed(2) });
        
        // Generuj súbor
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const fileName = `SAR_Analyza_${formatDate(new Date())}.xlsx`;
        
        // Stiahni súbor
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
        
        console.log('✅ Excel export úspešný:', fileName);
        return { success: true, fileName };
        
    } catch (error) {
        console.error('❌ Chyba pri exporte do Excel:', error);
        throw error;
    }
}

/**
 * Export filtrovaných území do Excel súboru
 * @param {Array} filteredTerritories - Pole filtrovaných území
 * @param {Object} filters - Aktívne filtre (voliteľné)
 */
export async function exportFilteredToExcel(filteredTerritories, filters = {}) {
    try {
        console.log('📊 Začínam export filtrovaných dát do Excel...');
        console.log('📊 Počet záznamov:', filteredTerritories.length);
        console.log('📊 Filtre:', filters);
        
        const ExcelJS = await loadExcelJS();
        
        // Zoraď filtrované územia podľa okresov a obcí
        const sortedTerritories = [...filteredTerritories].sort((a, b) => {
            const districtCompare = (a.district || '').localeCompare(b.district || '', 'sk');
            if (districtCompare !== 0) return districtCompare;
            return (a.municipalityName || '').localeCompare(b.municipalityName || '', 'sk');
        });
        
        // Vytvor workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SAR';
        workbook.created = new Date();
        
        // Vytvor worksheet
        const worksheet = workbook.addWorksheet('Filtrované dáta');
        
        // Definuj stĺpce
        worksheet.columns = [
            { 
                header: 'Kód obce', 
                key: 'municipalityCode', 
                width: 12,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Obec', 
                key: 'municipalityName', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Okres', 
                key: 'district', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Kraj', 
                key: 'region', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Kód javu', 
                key: 'eventCode', 
                width: 12,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Krízový jav', 
                key: 'eventName', 
                width: 27,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Ohrozujúci faktor', 
                key: 'factorName', 
                width: 18,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Zdroj rizika', 
                key: 'riskSource', 
                width: 27,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Pravdepodobnosť', 
                key: 'probability', 
                width: 22,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Počet výskytu za obdobie', 
                key: 'probabilitylevel', 
                width: 14,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Úroveň rizika', 
                key: 'riskLevel', 
                width: 9,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Ohrozené obyvateľstvo', 
                key: 'endangeredPopulation', 
                width: 14,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Ohrozená plocha (km²)', 
                key: 'endangeredArea', 
                width: 15,
                style: { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } }
            },
            { 
                header: 'Predpokladaný sekundárny krízový jav 1', 
                key: 'predictedDisruption', 
                width: 27, 
                style: { alignment: { wrapText: true, vertical: 'top' } } 
            },
            { 
                header: 'Predpokladaný sekundárny krízový jav 2', 
                key: 'predictedDisruption2', 
                width: 27, 
                style: { alignment: { wrapText: true, vertical: 'top' } } 
            },
            { 
                header: 'Predpokladaný sekundárny krízový jav 3', 
                key: 'predictedDisruption3', 
                width: 27, 
                style: { alignment: { wrapText: true, vertical: 'top' } } 
            },
            { 
                header: 'Presah územia', 
                key: 'possibleOverlap', 
                width: 9,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            }
        ];
        
        // Pridaj dáta
        sortedTerritories.forEach(territory => {
            worksheet.addRow({
                municipalityCode: parseInt(territory.municipalityCode) || null,
                municipalityName: territory.municipalityName || '',
                district: territory.district || '',
                region: territory.region || '',
                eventCode: territory.eventCode || '',
                eventName: territory.eventName || '',
                factorName: territory.factorName || '',
                riskSource: territory.riskSource || '',
                probability: territory.probability || '',
                probabilitylevel: parseInt(territory.probabilitylevel) || null,
                riskLevel: getRiskLabel(territory.riskLevel),
                endangeredPopulation: parseInt(territory.endangeredPopulation) || null,
                endangeredArea: parseInt(territory.endangeredArea) || null,
                predictedDisruption: territory.predictedDisruption || '',
                predictedDisruption2: territory.predictedDisruption2 || '',
                predictedDisruption3: territory.predictedDisruption3 || '',
                possibleOverlap: territory.possibleOverlap || ''
            });
        });
        
        // Štýl hlavičky
        const headerRow = worksheet.getRow(1);
        headerRow.height = 40;
        headerRow.font = { bold: true, size: 11 };
        headerRow.alignment = { 
            vertical: 'middle', 
            horizontal: 'center',
            wrapText: true 
        };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        headerRow.border = {
            bottom: { style: 'medium', color: { argb: 'FF000000' } }
        };
        
        // Zapni autofilter pre všetkých 13 stĺpcov
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: 13 }
        };
        
        // Zamrazni prvý riadok
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];
        
        // Vytvor názov súboru podľa aktívnych filtrov
        let fileNamePart = 'Filtrovane';
        
        if (filters.district) {
            fileNamePart = `okres_${filters.district.replace(/\s+/g, '_')}`;
        } else if (filters.region) {
            fileNamePart = filters.region.replace(/\s+/g, '_');
        } else if (filters.municipality) {
            fileNamePart = filters.municipality.replace(/\s+/g, '_');
        } else if (sortedTerritories.length > 0 && sortedTerritories[0].district) {
            fileNamePart = `okres_${sortedTerritories[0].district.replace(/\s+/g, '_')}`;
        }
        
        const fileName = `SAR_${fileNamePart}_${formatDate(new Date())}.xlsx`;
        console.log('📊 Názov súboru:', fileName);
        
        // Generuj súbor
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        // Stiahni súbor
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
        
        console.log('✅ Export filtrovaných dát úspešný:', fileName);
        return { success: true, fileName };
        
    } catch (error) {
        console.error('❌ Chyba pri exporte filtrovaných dát:', error);
        throw error;
    }
}

// ============================================================================
// PDF Export using jsPDF
// ============================================================================

/**
 * Export štatistického reportu do PDF
 * @param {Array} territories - Pole území na export
 * @param {Array} municipalities - Pole obcí
 * @param {Array} events - Pole krízových javov
 * @param {Array} factors - Pole faktorov
 */
export async function exportToPDF(territories, municipalities, events, factors) {
    try {
        console.log('📄 Začínam export štatistického reportu do PDF...');
        
        // Importuj pdfMake
        const pdfMake = await loadPdfMake();
        
        // Vypočítaj štatistiky
        const stats = calculatePDFStatistics(territories);
        
        // Priprav dáta pre grafy (top 10/15)
        const topMunicipalities = Object.entries(stats.municipalities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const topEvents = Object.entries(stats.events)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);
        
        const topDistricts = Object.entries(stats.districts)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10);
        
        const topFactors = Object.entries(stats.factors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const probabilities = Object.entries(stats.probabilities)
            .sort((a, b) => b[1] - a[1]);
        
        // Definícia PDF dokumentu
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 60, 40, 50],
            
            // Hlavička
            header: function(currentPage, pageCount) {
                return {
                    columns: [
                        { 
                            text: 'SAR - Štatistický report', 
                            style: 'header', 
                            alignment: 'center' 
                        }
                    ],
                    margin: [40, 20, 40, 10]
                };
            },
            
            // Pätička
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { 
                            text: `Vytvorené: ${formatDate(new Date())}`, 
                            alignment: 'left',
                            margin: [40, 10, 0, 0],
                            fontSize: 9,
                            color: '#666'
                        },
                        { 
                            text: `Strana ${currentPage} z ${pageCount}`, 
                            alignment: 'right',
                            margin: [0, 10, 40, 0],
                            fontSize: 9,
                            color: '#666'
                        }
                    ]
                };
            },
            
            // Obsah
            content: [
                // TITULKA
                { 
                    text: 'Analýza území', 
                    style: 'title', 
                    margin: [0, 0, 0, 5] 
                },
                { 
                    text: 'Štatistický prehľad mimoriadnych udalostí', 
                    style: 'subtitle',
                    margin: [0, 0, 0, 30]
                },
                
                // PREHĽAD KĽÚČOVÝCH ČÍSEL
                {
                    table: {
                        widths: ['*', '*', '*', '*'],
                        body: [
                            [
                                { 
                                    text: [
                                        { text: stats.total.toLocaleString('sk-SK') + '\n', fontSize: 24, bold: true, color: '#2980b9' },
                                        { text: 'Celkový počet\nanalýz', fontSize: 10, color: '#666' }
                                    ],
                                    alignment: 'center',
                                    border: [false, false, false, false],
                                    margin: [0, 10, 0, 10]
                                },
                                { 
                                    text: [
                                        { text: Object.keys(stats.municipalities).length + '\n', fontSize: 24, bold: true, color: '#2980b9' },
                                        { text: 'Počet obcí\nv analýze', fontSize: 10, color: '#666' }
                                    ],
                                    alignment: 'center',
                                    border: [false, false, false, false],
                                    margin: [0, 10, 0, 10]
                                },
                                { 
                                    text: [
                                        { text: stats.totalPopulation.toLocaleString('sk-SK') + '\n', fontSize: 24, bold: true, color: '#2980b9' },
                                        { text: 'Ohrozené\nobyvatele', fontSize: 10, color: '#666' }
                                    ],
                                    alignment: 'center',
                                    border: [false, false, false, false],
                                    margin: [0, 10, 0, 10]
                                },
                                { 
                                    text: [
                                        { text: stats.totalArea.toFixed(1) + ' km²\n', fontSize: 24, bold: true, color: '#2980b9' },
                                        { text: 'Ohrozená\nplocha', fontSize: 10, color: '#666' }
                                    ],
                                    alignment: 'center',
                                    border: [false, false, false, false],
                                    margin: [0, 10, 0, 10]
                                }
                            ]
                        ]
                    },
                    margin: [0, 0, 0, 30]
                },
                
                // ROZDELENIE PODĽA ÚROVNE RIZIKA
                { 
                    text: 'Rozdelenie podľa úrovne rizika', 
                    style: 'heading',
                    margin: [0, 10, 0, 10]
                },
                {
                    columns: [
                        {
                            width: '*',
                            table: {
                                widths: ['*', 60, 80],
                                body: [
                                    [
                                        { text: 'Úroveň', style: 'tableHeader' },
                                        { text: 'Počet', style: 'tableHeader' },
                                        { text: 'Podiel', style: 'tableHeader' }
                                    ],
                                    [
                                        { text: '🔴 Kritické', color: '#dc3545', bold: true },
                                        { text: stats.riskLevels.critical.toString(), alignment: 'center' },
                                        { text: ((stats.riskLevels.critical / stats.total * 100).toFixed(1) + '%'), alignment: 'center' }
                                    ],
                                    [
                                        { text: '🟠 Vysoké', color: '#fd7e14', bold: true },
                                        { text: stats.riskLevels.high.toString(), alignment: 'center' },
                                        { text: ((stats.riskLevels.high / stats.total * 100).toFixed(1) + '%'), alignment: 'center' }
                                    ],
                                    [
                                        { text: '🟡 Stredné', color: '#ffc107', bold: true },
                                        { text: stats.riskLevels.medium.toString(), alignment: 'center' },
                                        { text: ((stats.riskLevels.medium / stats.total * 100).toFixed(1) + '%'), alignment: 'center' }
                                    ],
                                    [
                                        { text: '🟢 Nízke', color: '#28a745', bold: true },
                                        { text: stats.riskLevels.low.toString(), alignment: 'center' },
                                        { text: ((stats.riskLevels.low / stats.total * 100).toFixed(1) + '%'), alignment: 'center' }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines'
                        }
                    ],
                    margin: [0, 0, 0, 30]
                },
                
                // TOP 10 OBCÍ
                { text: '', pageBreak: 'before' },
                { 
                    text: 'Top 10 najohrozenejších obcí', 
                    style: 'heading',
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [30, '*', 60],
                        body: [
                            [
                                { text: 'Por.', style: 'tableHeader' },
                                { text: 'Obec', style: 'tableHeader' },
                                { text: 'Počet rizík', style: 'tableHeader' }
                            ],
                            ...topMunicipalities.map(([name, count], index) => [
                                { text: (index + 1).toString(), alignment: 'center' },
                                name,
                                { text: count.toString(), alignment: 'center' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 30]
                },
                
                // TOP 15 KRÍZOVÝCH JAVOV
                { 
                    text: 'Top 15 najčastejších krízových javov', 
                    style: 'heading',
                    margin: [0, 10, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [30, '*', 60],
                        body: [
                            [
                                { text: 'Por.', style: 'tableHeader' },
                                { text: 'Krízový jav', style: 'tableHeader' },
                                { text: 'Výskyty', style: 'tableHeader' }
                            ],
                            ...topEvents.map(([name, count], index) => [
                                { text: (index + 1).toString(), alignment: 'center' },
                                { text: name.length > 60 ? name.substring(0, 57) + '...' : name, fontSize: 9 },
                                { text: count.toString(), alignment: 'center' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 30]
                },
                
                // OKRESY
                { text: '', pageBreak: 'before' },
                { 
                    text: 'Top 10 okresov podľa počtu rizík', 
                    style: 'heading',
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [30, '*', 50, 50, 50, 50],
                        body: [
                            [
                                { text: 'Por.', style: 'tableHeader' },
                                { text: 'Okres', style: 'tableHeader' },
                                { text: 'Celkom', style: 'tableHeader' },
                                { text: 'Kritické', style: 'tableHeader', fillColor: '#fee2e2' },
                                { text: 'Vysoké', style: 'tableHeader', fillColor: '#ffedd5' },
                                { text: 'Ostatné', style: 'tableHeader' }
                            ],
                            ...topDistricts.map(([name, data], index) => [
                                { text: (index + 1).toString(), alignment: 'center' },
                                name,
                                { text: data.total.toString(), alignment: 'center', bold: true },
                                { text: data.critical.toString(), alignment: 'center', color: '#dc3545' },
                                { text: data.high.toString(), alignment: 'center', color: '#fd7e14' },
                                { text: (data.medium + data.low).toString(), alignment: 'center' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 30]
                },
                
                // FAKTORY
                { 
                    text: 'Top 10 ohrozujúcich faktorov', 
                    style: 'heading',
                    margin: [0, 10, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [30, '*', 80],
                        body: [
                            [
                                { text: 'Por.', style: 'tableHeader' },
                                { text: 'Faktor', style: 'tableHeader' },
                                { text: 'Výskyty', style: 'tableHeader' }
                            ],
                            ...topFactors.map(([name, count], index) => [
                                { text: (index + 1).toString(), alignment: 'center' },
                                name,
                                { text: count.toString(), alignment: 'center' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 30]
                },
                
                // PRAVDEPODOBNOSTI
                { 
                    text: 'Rozdelenie podľa pravdepodobnosti', 
                    style: 'heading',
                    margin: [0, 10, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 80, 80],
                        body: [
                            [
                                { text: 'Pravdepodobnosť', style: 'tableHeader' },
                                { text: 'Počet', style: 'tableHeader' },
                                { text: 'Podiel', style: 'tableHeader' }
                            ],
                            ...probabilities.map(([name, count]) => [
                                name,
                                { text: count.toString(), alignment: 'center' },
                                { text: ((count / stats.total * 100).toFixed(1) + '%'), alignment: 'center' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines'
                }
            ],
            
            // Štýly
            styles: {
                header: {
                    fontSize: 16,
                    bold: true,
                    color: '#2980b9'
                },
                title: {
                    fontSize: 22,
                    bold: true,
                    alignment: 'center',
                    color: '#2c3e50'
                },
                subtitle: {
                    fontSize: 12,
                    alignment: 'center',
                    color: '#7f8c8d',
                    italics: true
                },
                heading: {
                    fontSize: 14,
                    bold: true,
                    color: '#2980b9'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: 'white',
                    fillColor: '#2980b9',
                    alignment: 'center'
                }
            },
            
            defaultStyle: {
                fontSize: 10,
                font: 'Roboto'
            }
        };
        
        // Vytvor a stiahni PDF
        const fileName = `SAR_Statistiky_${formatDate(new Date())}.pdf`;
        pdfMake.createPdf(docDefinition).download(fileName);
        
        console.log('✅ PDF štatistický report úspešný:', fileName);
        return { success: true, fileName };
        
    } catch (error) {
        console.error('❌ Chyba pri exporte štatistického reportu:', error);
        throw error;
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Dynamicky načíta ExcelJS knižnicu
 */
async function loadExcelJS() {
    if (window.ExcelJS) {
        return window.ExcelJS;
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
        script.onload = () => resolve(window.ExcelJS);
        script.onerror = () => reject(new Error('Nepodarilo sa načítať ExcelJS knižnicu'));
        document.head.appendChild(script);
    });
}

/**
 * Dynamicky načíta pdfMake knižnicu
 */
async function loadPdfMake() {
    if (window.pdfMake) {
        return window.pdfMake;
    }
    
    // Načítaj pdfMake
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Nepodarilo sa načítať pdfMake knižnicu'));
        document.head.appendChild(script);
    });
    
    // Načítaj vfs_fonts (virtuálny súborový systém pre fonty)
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Nepodarilo sa načítať pdfMake fonty'));
        document.head.appendChild(script);
    });
    
    // Nastaviť fonty
    if (window.pdfMake && window.pdfMake.vfs) {
        window.pdfMake.fonts = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            }
        };
    }
    
    return window.pdfMake;
}

/**
 * Vypočíta komplexné štatistiky pre PDF report
 */
function calculatePDFStatistics(territories) {
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
        const riskLevel = territory.riskLevel || 'low';
        if (stats.riskLevels[riskLevel] !== undefined) {
            stats.riskLevels[riskLevel]++;
        } else {
            // Fallback pre neznáme levely
            stats.riskLevels.low++;
        }
        
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
        if (stats.districts[territory.district][riskLevel] !== undefined) {
            stats.districts[territory.district][riskLevel]++;
        }
        
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
        
        // Totals - OPRAVA TU (Explicitná konverzia na čísla)
        // Používame parseInt pre ľudí a parseFloat pre plochu
        // isNaN kontrola zabezpečí, že ak je hodnota null/undefined, pripočíta sa 0
        const pop = parseInt(territory.endangeredPopulation);
        stats.totalPopulation += isNaN(pop) ? 0 : pop;

        const area = parseFloat(territory.endangeredArea);
        stats.totalArea += isNaN(area) ? 0 : area;
    });
    
    return stats;
}

/**
 * Formátuje dátum do formátu DD-MM-YYYY
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
}

/**
 * Zobrazí loading indikátor počas exportu
 */
export function showExportLoading(message = 'Exportujem dáta...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'exportLoading';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    loadingDiv.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
            <div class="loading"></div>
            <p style="margin-top: 1rem; color: #333;">${message}</p>
        </div>
    `;
    
    document.body.appendChild(loadingDiv);
}

/**
 * Skryje loading indikátor
 */
export function hideExportLoading() {
    const loadingDiv = document.getElementById('exportLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}