/**
 * FASE 1: MAPEAR POLOS
 * Separa partes do DataJud em autores, requeridos e advogados
 * com validação robusta de dados
 */

/**
 * Mapeia partes do DataJud em estrutura de polos
 * @param {Array} partes - Array de partes [{nome, polo, tipoPessoa, documento?, inscricao?}]
 * @param {Array} representantes - Array de representantes/advogados
 * @returns {Object} {autores: [], requeridos: [], advogados: []}
 */
export function mapearPolos(partes = [], representantes = []) {
  console.log('🗂️  Iniciando mapeamento de polos...');
  console.log('📊 Partes recebidas:', partes);
  console.log('� Partes é array?', Array.isArray(partes), 'length:', partes?.length);
  console.log('👥 Representantes recebidos:', representantes);
  console.log('👥 Representantes é array?', Array.isArray(representantes), 'length:', representantes?.length);
  
  const resultado = {
    autores: [],
    requeridos: [],
    advogados: []
  };

  // Se ambos estão vazios, retornar early
  if ((!partes || partes.length === 0) && (!representantes || representantes.length === 0)) {
    console.log('⚠️ Nenhuma parte ou representante fornecido');
    return resultado;
  }

  // Validação: partes deve ser array
  if (!Array.isArray(partes)) {
    console.warn('⚠️ Partes não é um array válido, tipo:', typeof partes, 'valor:', partes);
    return resultado;
  }

  // Validação: representantes deve ser array
  const reps = Array.isArray(representantes) ? representantes : [];

  console.log(`📋 Processando ${partes.length} partes...`);

  // Processar partes
  partes.forEach((parte, idx) => {
    console.log(`  ├─ Parte ${idx}:`, parte);
    
    if (!parte || typeof parte !== 'object') {
      console.warn('⚠️ Parte inválida encontrada:', parte);
      return;
    }

    const { nome, polo, tipoPessoa, documento, inscricao } = parte;
    
    console.log(`  │  - nome: ${nome}, polo: ${polo}, tipoPessoa: ${tipoPessoa}`);

    // Validar nome e polo
    if (!nome || !polo) {
      console.warn('⚠️ Parte sem nome ou polo:', parte);
      return;
    }

    // Mapear tipo de pessoa válido
    const tipo = String(tipoPessoa || 'PESSOA_FISICA').toUpperCase();

    // Estruturar item da parte
    const itemParte = {
      nome: String(nome).trim(),
      tipoPessoa: tipo,
      polo: String(polo).toUpperCase(),
      documento: documento ? String(documento).replace(/\D/g, '') : null,
      inscricao: inscricao ? String(inscricao).replace(/\D/g, '') : null
    };

    // Filtrar nulos/vazios
    Object.keys(itemParte).forEach(key => {
      if (itemParte[key] === null || itemParte[key] === '' || itemParte[key] === undefined) {
        delete itemParte[key];
      }
    });

    // Distribuir por polo
    if (polo.toUpperCase() === 'ATIVA') {
      console.log('✅ Parte ATIVA mapeada como autor:', itemParte.nome);
      resultado.autores.push(itemParte);
    } else if (polo.toUpperCase() === 'PASSIVA') {
      console.log('✅ Parte PASSIVA mapeada como requerido:', itemParte.nome);
      resultado.requeridos.push(itemParte);
    } else {
      console.warn('⚠️ Polo desconhecido:', polo);
    }
  });

  // Processar representantes/advogados
  reps.forEach((rep) => {
    if (!rep || typeof rep !== 'object') {
      console.warn('⚠️ Representante inválido encontrado:', rep);
      return;
    }

    const { nome, documento, inscricao, funcao } = rep;

    if (!nome) {
      console.warn('⚠️ Representante sem nome:', rep);
      return;
    }

    // Estruturar item do advogado
    const itemAdvogado = {
      nome: String(nome).trim(),
      documento: documento ? String(documento).replace(/\D/g, '') : null,
      inscricao: inscricao ? String(inscricao).replace(/\D/g, '') : null,
      funcao: funcao ? String(funcao).trim() : 'ADVOGADO',
      tipoPessoa: 'PESSOA_FISICA'
    };

    // Filtrar nulos/vazios
    Object.keys(itemAdvogado).forEach(key => {
      if (itemAdvogado[key] === null || itemAdvogado[key] === '' || itemAdvogado[key] === undefined) {
        delete itemAdvogado[key];
      }
    });

    console.log('✅ Advogado/Representante mapeado:', itemAdvogado.nome);
    resultado.advogados.push(itemAdvogado);
  });

  console.log('📊 Mapeamento concluído:', {
    totalAutores: resultado.autores.length,
    totalRequeridos: resultado.requeridos.length,
    totalAdvogados: resultado.advogados.length
  });

  return resultado;
}

/**
 * Valida se um documento é válido (CPF ou CNPJ)
 * @param {string} documento - CPF ou CNPJ
 * @param {string} tipo - 'CPF' ou 'CNPJ'
 * @returns {boolean}
 */
export function validarDocumento(documento, tipo = 'CPF') {
  if (!documento) return false;

  const doc = String(documento).replace(/\D/g, '');

  if (tipo === 'CPF') {
    return doc.length === 11;
  } else if (tipo === 'CNPJ') {
    return doc.length === 14;
  }

  return false;
}

/**
 * Valida número da OAB
 * @param {string} oab - Número da OAB
 * @returns {boolean}
 */
export function validarOAB(oab) {
  if (!oab) return false;
  const num = String(oab).replace(/\D/g, '');
  return num.length >= 6 && num.length <= 10;
}

export default {
  mapearPolos,
  validarDocumento,
  validarOAB
};
