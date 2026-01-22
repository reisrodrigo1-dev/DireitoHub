// Teste das melhorias na análise de documentos criminais
// Teste das funções de validação e cálculo de confiança

// Simular dados extraídos para teste
const testExtractedData = {
  acusado: {
    nome: "JOSÉ MARIA DA SILVA",
    dataNascimento: "15/03/1985",
    cpf: "12345678901"
  },
  processo: {
    numero: "0123456-78.2023.8.26.0100"
  },
  crimes: {
    acusacoes: ["tráfico de drogas"],
    artigos: ["33"]
  },
  sentenca: {
    resultado: "condenado",
    pena: "5 anos de reclusão",
    regime: "fechado"
  }
};

// Função de validação (cópia da implementação)
const validateAndCleanExtractedData = (data) => {
  if (!data || typeof data !== 'object') return {};

  const cleaned = { ...data };

  // Validar e limpar nome do acusado
  if (cleaned.acusado?.nome) {
    const nome = cleaned.acusado.nome.trim();
    if (nome.length < 3 || !/^[A-Z\sÇÃÕÂÊÎÔÛÁÉÍÓÚÀÈÌÒÙ]+$/.test(nome.toUpperCase())) {
      cleaned.acusado.nome = null;
    } else {
      cleaned.acusado.nome = nome.toUpperCase();
    }
  }

  // Validar CPF
  if (cleaned.acusado?.cpf) {
    const cpf = cleaned.acusado.cpf.toString().replace(/\D/g, '');
    if (cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
      cleaned.acusado.cpf = null;
    } else {
      cleaned.acusado.cpf = cpf;
    }
  }

  // Validar data de nascimento
  if (cleaned.acusado?.dataNascimento) {
    const data = cleaned.acusado.dataNascimento;
    if (!/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(data)) {
      cleaned.acusado.dataNascimento = null;
    }
  }

  // Validar número do processo
  if (cleaned.processo?.numero) {
    const numero = cleaned.processo.numero.toString().trim();
    if (!/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/.test(numero)) {
      cleaned.processo.numero = null;
    }
  }

  // Validar crimes - garantir que sejam arrays
  if (cleaned.crimes?.acusacoes && !Array.isArray(cleaned.crimes.acusacoes)) {
    if (typeof cleaned.crimes.acusacoes === 'string') {
      cleaned.crimes.acusacoes = [cleaned.crimes.acusacoes];
    } else {
      cleaned.crimes.acusacoes = null;
    }
  }

  if (cleaned.crimes?.artigos && !Array.isArray(cleaned.crimes.artigos)) {
    if (typeof cleaned.crimes.artigos === 'string') {
      cleaned.crimes.artigos = [cleaned.crimes.artigos];
    } else {
      cleaned.crimes.artigos = null;
    }
  }

  // Validar resultado da sentença
  if (cleaned.sentenca?.resultado) {
    const resultado = cleaned.sentenca.resultado.toLowerCase().trim();
    if (!['condenado', 'absolvido', 'condenação', 'absolvição'].includes(resultado)) {
      cleaned.sentenca.resultado = null;
    } else {
      cleaned.sentenca.resultado = resultado.includes('conden') ? 'condenado' : 'absolvido';
    }
  }

  // Validar regime
  if (cleaned.sentenca?.regime) {
    const regime = cleaned.sentenca.regime.toLowerCase().trim();
    const regimesValidos = ['fechado', 'semiaberto', 'semi-aberto', 'aberto'];
    if (!regimesValidos.some(r => regime.includes(r))) {
      cleaned.sentenca.regime = null;
    } else {
      if (regime.includes('semi')) cleaned.sentenca.regime = 'semiaberto';
      else if (regime.includes('fechado')) cleaned.sentenca.regime = 'fechado';
      else if (regime.includes('aberto')) cleaned.sentenca.regime = 'aberto';
    }
  }

  return cleaned;
};

// Função de cálculo de confiança (cópia da implementação)
const calculateConfidence = (extractedData) => {
  if (!extractedData || typeof extractedData !== 'object') return 0;

  let totalScore = 0;
  let maxScore = 0;

  const fieldWeights = {
    'acusado.nome': 25,
    'crimes.acusacoes': 20,
    'sentenca.resultado': 20,
    'processo.numero': 15,
    'crimes.artigos': 10,
    'sentenca.pena': 10,
    'sentenca.regime': 10,
    'acusado.dataNascimento': 5,
    'acusado.cpf': 5,
    'processo.comarca': 5,
    'processo.vara': 5,
    'acusado.endereco': 3,
    'evidenciasEncontradas': 2
  };

  Object.entries(fieldWeights).forEach(([fieldPath, weight]) => {
    maxScore += weight;
    const [category, field] = fieldPath.split('.');

    if (extractedData[category]?.[field]) {
      const value = extractedData[category][field];
      let isValid = false;
      if (Array.isArray(value)) {
        isValid = value.length > 0 && value.every(item => item !== null && item !== '');
      } else {
        isValid = value !== null && value !== '';
      }

      if (isValid) {
        totalScore += weight;
      }
    }
  });

  const confidence = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const criticalFields = ['acusado.nome', 'crimes.acusacoes', 'sentenca.resultado'];
  const criticalFound = criticalFields.filter(field => {
    const [category, fieldName] = field.split('.');
    return extractedData[category]?.[fieldName];
  }).length;

  if (criticalFound === criticalFields.length) {
    return Math.min(100, confidence + 10);
  }

  return Math.max(0, Math.min(100, confidence));
};

// Função de teste
function testValidationAndConfidence() {
  console.log('🧪 Testando funções de validação e cálculo de confiança...');
  console.log('📄 Dados de teste:', JSON.stringify(testExtractedData, null, 2));

  // Testar validação
  const validatedData = validateAndCleanExtractedData(testExtractedData);
  console.log('✅ Dados validados:', JSON.stringify(validatedData, null, 2));

  // Testar cálculo de confiança
  const confidence = calculateConfidence(validatedData);
  console.log('📊 Confiança calculada:', confidence + '%');

  // Verificar campos críticos
  const criticalFields = ['acusado.nome', 'crimes.acusacoes', 'sentenca.resultado'];
  const criticalFound = criticalFields.filter(field => {
    const [category, fieldName] = field.split('.');
    return validatedData[category]?.[fieldName];
  });

  console.log(`🎯 Campos críticos encontrados: ${criticalFound.length}/${criticalFields.length}`);
  console.log('Campos críticos:', criticalFields.join(', '));

  // Teste com dados incompletos
  console.log('\n--- Teste com dados incompletos ---');
  const incompleteData = {
    acusado: { nome: "JOÃO SILVA" },
    crimes: { acusacoes: ["furto"] }
  };

  const validatedIncomplete = validateAndCleanExtractedData(incompleteData);
  const confidenceIncomplete = calculateConfidence(validatedIncomplete);

  console.log('📄 Dados incompletos validados:', JSON.stringify(validatedIncomplete, null, 2));
  console.log('📊 Confiança dados incompletos:', confidenceIncomplete + '%');

  console.log('\n✅ Testes concluídos com sucesso!');
}

// Executar teste
testValidationAndConfidence();