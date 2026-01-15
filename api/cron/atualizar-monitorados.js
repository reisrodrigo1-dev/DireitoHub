/**
 * FASE 5 (Parte 2): SERVERLESS FUNCTION CRON - ATUALIZAR MONITORADOS
 * GET /api/cron/atualizar-monitorados
 * Executado diariamente às 8h (0 8 * * *)
 * Busca atualizações de processos e notifica usuários
 */

import crypto from 'crypto';

/**
 * Calcula hash SHA256 dos movimentos
 * @param {Object} movimentos - Dados dos movimentos
 * @returns {string} Hash SHA256
 */
function calcularHashMovimentos(movimentos) {
  const str = JSON.stringify(movimentos || {});
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Busca dados atuais de um processo via API DataJud
 * @param {string} numeroProcesso - Número do processo
 * @param {string} tribunal - Tribunal
 * @returns {Promise<Object>} Dados do processo
 */
async function buscarDadosProcesso(numeroProcesso, tribunal) {
  console.log(`🔍 Buscando dados: ${numeroProcesso} (${tribunal})`);

  try {
    // Chamar a função buscar-numero existente
    const apiUrl = `https://www.direitohub.com.br/api/datajud/buscar-numero`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numeroProcesso, tribunais: [tribunal] })
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const resultado = await response.json();
    return resultado.data?.[0] || null;

  } catch (erro) {
    console.error(`❌ Erro ao buscar dados:`, erro.message);
    return null;
  }
}

/**
 * Envia notificação por email ao usuário (placeholder)
 * @param {string} userEmail - Email do usuário
 * @param {Object} processoInfo - Informações do processo
 * @returns {Promise<boolean>} Sucesso
 */
async function enviarNotificacao(userEmail, processoInfo) {
  console.log(`📧 Enviando notificação para: ${userEmail}`);

  try {
    // Placeholder - integrar com Sendgrid ou similar
    console.log(`✅ Notificação enviada: Processo ${processoInfo.numeroProcesso} foi atualizado!`);
    return true;

  } catch (erro) {
    console.error(`❌ Erro ao enviar email:`, erro.message);
    return false;
  }
}

/**
 * Processa um único processo monitorado (mock sem Firebase Admin)
 * @param {Object} monitoramento - Documento de monitoramento
 * @returns {Promise<boolean>} Se houve atualização
 */
async function processarMonitoramento(monitoramento) {
  const { id, numeroProcesso, tribunal, userEmail, lastHashMovimentos } = monitoramento;

  console.log(`\n🔄 Processando: ${numeroProcesso}`);

  try {
    // Buscar dados atuais
    const dadosAtuais = await buscarDadosProcesso(numeroProcesso, tribunal);

    if (!dadosAtuais) {
      console.warn(`⚠️ Não foi possível buscar dados para ${numeroProcesso}`);
      return false;
    }

    // Calcular hash dos movimentos
    const hashAtual = calcularHashMovimentos(dadosAtuais.movimentos);

    // Comparar com hash anterior
    const houveMudanca = hashAtual !== lastHashMovimentos;

    if (houveMudanca) {
      console.log(`🔔 ATUALIZAÇÃO DETECTADA! Novo hash: ${hashAtual.substring(0, 8)}...`);

      // Em produção, atualizar em Firestore aqui
      // await db.collection('processos_monitorados').doc(id).update({...})

      // Enviar notificação ao usuário
      await enviarNotificacao(userEmail, dadosAtuais);

      return true;

    } else {
      console.log(`✅ Sem alterações`);
      return false;
    }

  } catch (erro) {
    console.error(`❌ Erro ao processar ${numeroProcesso}:`, erro.message);
    return false;
  }
}

/**
 * Handler da função CRON
 */
export default async function handler(req, res) {
  // Verificar autenticação via header customizado
  const authHeader = req.headers['x-cron-secret'];
  if (authHeader !== process.env.CRON_SECRET) {
    console.error('❌ Autenticação CRON falhou');
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  console.log('🚀 ==================== INICIANDO ATUALIZAÇÃO ====================');
  console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);

  try {
    // Mock: simular alguns processos para teste
    const mockMonitoramentos = [
      {
        id: 'mock-1',
        numeroProcesso: '0000123456789012345678',
        tribunal: 'TJSP',
        userEmail: 'teste@example.com',
        lastHashMovimentos: null
      }
    ];

    console.log(`\n📊 Total de processos a verificar: ${mockMonitoramentos.length}`);

    let processados = 0;
    let atualizados = 0;

    // Processar cada monitoramento
    for (const monitoramento of mockMonitoramentos) {
      const houveMudanca = await processarMonitoramento(monitoramento);

      if (houveMudanca) {
        atualizados++;
      }
      processados++;

      // Pequeno delay entre requisições
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n✅ ==================== ATUALIZAÇÃO CONCLUÍDA ====================`);
    console.log(`📈 Processados: ${processados}, Atualizados: ${atualizados}`);

    return res.status(200).json({
      mensagem: 'Atualização concluída com sucesso',
      processados,
      atualizados,
      timestamp: new Date().toISOString()
    });

  } catch (erro) {
    console.error('❌ Erro geral na execução CRON:', erro.message);
    return res.status(500).json({
      erro: 'Erro ao processar monitoramento',
      detalhes: erro.message
    });
  }
}
