/**
 * FASE 5 (Parte 1): SERVIÇO DE MONITORAMENTO DE PROCESSOS
 * Gerencia o acompanhamento automático de processos judiciais
 */

import {
  collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Inicia monitoramento de um processo
 * @param {string} numeroProcesso - Número do processo
 * @param {string} tribunal - Tribunal (ex: TJSP)
 * @param {string} userEmail - Email do usuário
 * @returns {Promise<string>} ID do documento criado
 */
export async function iniciarMonitoramento(numeroProcesso, tribunal, userEmail) {
  console.log('📌 Iniciando monitoramento:', { numeroProcesso, tribunal, userEmail });

  if (!numeroProcesso || !tribunal || !userEmail) {
    throw new Error('Parâmetros obrigatórios: numeroProcesso, tribunal, userEmail');
  }

  try {
    const processoRef = collection(db, 'processos_monitorados');
    
    // Verificar se já existe monitoramento
    const q = query(
      processoRef,
      where('numeroProcesso', '==', numeroProcesso),
      where('userEmail', '==', userEmail)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.warn('⚠️ Este processo já está sendo monitorado');
      return snapshot.docs[0].id;
    }

    // Criar novo monitoramento
    const novoMonitoramento = {
      numeroProcesso,
      tribunal,
      userEmail,
      dataInicio: serverTimestamp(),
      ativo: true,
      ultimaAtualizacao: null,
      lastHashMovimentos: null,
      hasUpdate: false
    };

    const docRef = await addDoc(processoRef, novoMonitoramento);
    console.log('✅ Monitoramento iniciado com sucesso:', docRef.id);
    return docRef.id;

  } catch (erro) {
    console.error('❌ Erro ao iniciar monitoramento:', erro.message);
    throw erro;
  }
}

/**
 * Obtém processos monitorados de um usuário
 * @param {string} userEmail - Email do usuário
 * @returns {Promise<Array>} Lista de processos monitorados
 */
export async function obterProcessosMonitorados(userEmail) {
  console.log('🔍 Buscando processos monitorados para:', userEmail);

  if (!userEmail) {
    throw new Error('Email do usuário é obrigatório');
  }

  try {
    const q = query(
      collection(db, 'processos_monitorados'),
      where('userEmail', '==', userEmail),
      where('ativo', '==', true)
    );

    const snapshot = await getDocs(q);
    const processos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ ${processos.length} processo(s) encontrado(s)`);
    return processos;

  } catch (erro) {
    console.error('❌ Erro ao buscar processos monitorados:', erro.message);
    throw erro;
  }
}

/**
 * Para o monitoramento de um processo
 * @param {string} docId - ID do documento de monitoramento
 * @returns {Promise<void>}
 */
export async function pararMonitoramento(docId) {
  console.log('🛑 Parando monitoramento:', docId);

  if (!docId) {
    throw new Error('ID do monitoramento é obrigatório');
  }

  try {
    const docRef = doc(db, 'processos_monitorados', docId);
    await updateDoc(docRef, {
      ativo: false,
      dataParada: serverTimestamp()
    });

    console.log('✅ Monitoramento pausado com sucesso');
  } catch (erro) {
    console.error('❌ Erro ao parar monitoramento:', erro.message);
    throw erro;
  }
}

/**
 * Atualiza informações de um monitoramento
 * @param {string} docId - ID do documento
 * @param {Object} dados - Dados para atualizar
 * @returns {Promise<void>}
 */
export async function atualizarMonitoramento(docId, dados) {
  console.log('🔄 Atualizando monitoramento:', docId);

  if (!docId || !dados) {
    throw new Error('ID e dados são obrigatórios');
  }

  try {
    const docRef = doc(db, 'processos_monitorados', docId);
    await updateDoc(docRef, {
      ...dados,
      ultimaAtualizacao: serverTimestamp()
    });

    console.log('✅ Monitoramento atualizado com sucesso');
  } catch (erro) {
    console.error('❌ Erro ao atualizar monitoramento:', erro.message);
    throw erro;
  }
}

/**
 * Obtém detalhes de um monitoramento específico
 * @param {string} docId - ID do documento
 * @returns {Promise<Object>} Dados do monitoramento
 */
export async function obterMonitoramento(docId) {
  console.log('📋 Obtendo monitoramento:', docId);

  if (!docId) {
    throw new Error('ID do monitoramento é obrigatório');
  }

  try {
    const docRef = doc(db, 'processos_monitorados', docId);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      throw new Error('Monitoramento não encontrado');
    }

    return { id: docSnapshot.id, ...docSnapshot.data() };
  } catch (erro) {
    console.error('❌ Erro ao obter monitoramento:', erro.message);
    throw erro;
  }
}

/**
 * Remove um monitoramento completamente
 * @param {string} docId - ID do documento
 * @returns {Promise<void>}
 */
export async function removerMonitoramento(docId) {
  console.log('🗑️ Removendo monitoramento:', docId);

  if (!docId) {
    throw new Error('ID do monitoramento é obrigatório');
  }

  try {
    await deleteDoc(doc(db, 'processos_monitorados', docId));
    console.log('✅ Monitoramento removido com sucesso');
  } catch (erro) {
    console.error('❌ Erro ao remover monitoramento:', erro.message);
    throw erro;
  }
}

export default {
  iniciarMonitoramento,
  obterProcessosMonitorados,
  pararMonitoramento,
  atualizarMonitoramento,
  obterMonitoramento,
  removerMonitoramento
};
