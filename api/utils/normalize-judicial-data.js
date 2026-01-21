/**
 * Normalizes raw DataJud API data to Firestore schema
 * Handles: dates, party names, case numbers, completeness
 */

import admin from 'firebase-admin';
const Timestamp = admin.firestore.Timestamp;

const TRIBUNAL_MAP = {
  // Tribunais Superiores
  '0001': 'STF',
  '0002': 'CNJ',
  '0003': 'STJ',
  '0005': 'TST',
  '0006': 'TSE',
  '0007': 'STM',
  
  // Tribunais Regionais Federais
  '0004': 'TRF1',
  '0008': 'TRF2',
  '0009': 'TRF3',
  '0010': 'TRF4',
  '0011': 'TRF5',
  '0012': 'TRF6',
  
  // Justiça Estadual - TJs (principais)
  '8260': 'TJSP',
  '8190': 'TJRJ',
  '8130': 'TJMG',
  '8210': 'TJRS',
  '8160': 'TJPR',
  '8180': 'TJSC',
  '8140': 'TJBA',
  '8170': 'TJPE',
  '8185': 'TJCE',
  '8200': 'TJPA',
  '8150': 'TJGO',
  '8120': 'TJMT',
  '8110': 'TJMS',
  '8100': 'TJDFT'
};

function formatarProcessoCNJ(numero) {
  // Convert: 00000000020248411800200000000000001
  // To:      0000000-02.2024.8.26.0100
  if (!numero || numero.length !== 20) return numero;
  return `${numero.substring(0, 7)}-${numero.substring(7, 9)}.${numero.substring(9, 13)}.${numero.substring(13, 14)}.${numero.substring(14, 18)}.${numero.substring(18)}`;
}

function extractTribunalFromNumber(numero) {
  if (!numero || numero.length < 18) return 'DESCONHECIDO';
  const tribunalCode = numero.substring(14, 18);
  return TRIBUNAL_MAP[tribunalCode] || 'DESCONHECIDO';
}

function parseAndTimestamp(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return Timestamp.fromDate(date);
  } catch {
    return null;
  }
}

function sanitizeName(name) {
  if (!name) return null;
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeClasse(classeData) {
  if (!classeData) return null;
  return {
    codigo: classeData.codigo || null,
    nome: classeData.nome || 'Sem classificação'
  };
}

function normalizeAssunto(assuntoData) {
  if (!assuntoData) return null;
  return {
    codigo: assuntoData.codigo || null,
    nome: assuntoData.nome || 'Sem classificação'
  };
}

function normalizarPartes(partesArray) {
  const normalized = {};
  
  (partesArray || []).forEach(parte => {
    const polo = (parte.polo || 'outro').toLowerCase();
    
    if (!normalized[polo]) {
      normalized[polo] = [];
    }
    
    normalized[polo].push({
      nome: sanitizeName(parte.nome),
      documento: parte.documento?.replace(/[^0-9]/g, '') || null,
      tipoPessoa: parte.tipoPessoa || 'DESCONHECIDO'
    });
  });
  
  return {
    autor: normalized['autor'] || [],
    reu: normalized['réu'] || [],
    assistente: normalized['assistente'] || [],
    terceiro: normalized['terceiro'] || []
  };
}

function extractGrau(grauStr) {
  if (!grauStr) return 1;
  const match = grauStr.match(/\d+/);
  return match ? parseInt(match[0]) : 1;
}

function determineStatus(rawData) {
  const ultimoMovimento = rawData.movimentos?.[0]?.nome || '';
  
  if (ultimoMovimento.match(/Sentença|Julgado|Acórdão/i)) {
    return 'finalizada';
  }
  if (ultimoMovimento.match(/Arquivado|Extinção|Cancelado/i)) {
    return 'arquivada';
  }
  
  return 'ativa';
}

function normalizeMovimento(movimentoData) {
  if (!movimentoData) return null;
  
  return {
    data: parseAndTimestamp(movimentoData.dataHora),
    nome: movimentoData.nome || null,
    codigo: movimentoData.codigo || null,
    descricao: movimentoData.descricao || null,
    complementos: movimentoData.complementosTabelados || []
  };
}

function normalizeProceso(rawData) {
  if (!rawData?.numeroProcesso) {
    throw new Error('Missing numeroProcesso in raw data');
  }
  
  // Extract process number (remove non-numeric, validate 20 digits)
  const processoId = rawData.numeroProcesso.replace(/[^0-9]/g, '');
  if (processoId.length !== 20) {
    console.warn(`Invalid process number length: ${processoId}, expected 20 digits`);
  }
  
  const tribunal = extractTribunalFromNumber(processoId);
  
  return {
    // Primary identifiers
    processoId,
    numeroProcesso: formatarProcessoCNJ(processoId),
    tribunal,
    tribunalNome: tribunal,
    
    // Classification
    classe: normalizeClasse(rawData.classe),
    assunto: normalizeAssunto(rawData.assuntos?.[0]),
    
    // Dates
    dataAjuizamento: parseAndTimestamp(rawData.dataAjuizamento),
    dataUltimaAtualizacao: parseAndTimestamp(
      rawData.dataHoraUltimaAtualizacao || rawData.dataUltimaAtualizacao
    ),
    
    // Parties
    partes: normalizarPartes(rawData.partes),
    
    // Case details
    juiz: rawData.orgaoJulgador?.nome || null,
    valorCausa: parseFloat(rawData.valorCausa) || 0,
    instancia: extractGrau(rawData.grau),
    status: determineStatus(rawData),
    
    // Latest movement only (optimize for storage)
    ultimoMovimento: normalizeMovimento(rawData.movimentos?.[0]),
    
    // Sync tracking
    syncStatus: 'sincronizado',
    syncDate: Timestamp.now(),
    sourceSystem: 'datajud',
    contentHash: null, // Will be computed by dedup
    deleteMarked: false
  };
}

export { normalizeProceso };
