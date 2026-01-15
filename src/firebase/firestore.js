import { 
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

// Serviço de usuários
const userService = {
  // Criar usuário
  async createUser(userId, userData) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obter usuário por ID
  async getUser(userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      // Usuário não existe, retornar como não encontrado (não é erro)
      return { success: false, error: 'Usuário não encontrado' };
    } catch (error) {
      // Se for erro de permissão, é esperado para usuários novos
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Usuário ainda não possui documento no Firestore');
        return { success: false, error: 'Usuário não configurado' };
      }
      console.warn('Erro ao buscar usuário no Firestore:', error.message);
      return { success: false, error: 'Erro de conexão com o banco de dados' };
    }
  },

  // Atualizar usuário
  async updateUser(userId, userData) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...userData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Deletar usuário
  async deleteUser(userId) {
    try {
      await deleteDoc(doc(db, 'users', userId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Serviço de clientes (para futuro uso)
const clientService = {
  // Buscar cliente por ID
  async getClientById(clientId) {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      if (!clientSnap.exists()) {
        return { success: false, error: 'Cliente não encontrado' };
      }
      return { success: true, data: { id: clientSnap.id, ...clientSnap.data() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  // Buscar clientes por nome ou email (autocomplete)
  async searchClients(userId, searchTerm) {
    try {
      // Busca todos os clientes do usuário
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const term = searchTerm.trim().toLowerCase();
      // Filtra no cliente por nome ou email contendo o termo (case-insensitive)
      const clients = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(client =>
          (client.nome && client.nome.toLowerCase().includes(term)) ||
          (client.name && client.name.toLowerCase().includes(term)) ||
          (client.email && client.email.toLowerCase().includes(term))
        );
      // Ordena por nome
      clients.sort((a, b) => (a.nome || a.name || '').localeCompare(b.nome || b.name || ''));
      return { success: true, data: clients };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  // Criar cliente
  async createClient(userId, clientData) {
    try {
      const clientRef = doc(collection(db, 'clients'));
      await setDoc(clientRef, {
        ...clientData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: clientRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Criar cliente a partir de agendamento
  async createClientFromAppointment(lawyerId, appointmentData) {
    try {
      // Verificar se cliente já existe
      const existingClient = await this.getClientByEmail(lawyerId, appointmentData.clientEmail);
      
      if (existingClient.success && existingClient.data) {
        // Cliente já existe, apenas atualizar informações se necessário
        const clientData = {
          lastAppointment: appointmentData.appointmentDate,
          totalAppointments: (existingClient.data.totalAppointments || 0) + 1,
          totalSpent: (existingClient.data.totalSpent || 0) + (appointmentData.finalPrice || 0),
          lastContact: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(doc(db, 'clients', existingClient.data.id), clientData);
        return { success: true, id: existingClient.data.id, updated: true, clientCode: existingClient.data.userCode };
      } else {
        // Cliente não existe, criar novo
        const clientRef = doc(collection(db, 'clients'));
        
        // Gerar código único para o cliente
        const { userCodeService } = await import('../services/userCodeService');
        const codeResult = await userCodeService.generateUniqueUserCode();
        const clientCode = codeResult.success ? codeResult.code : null;
        
        const clientData = {
          userId: lawyerId,
          name: appointmentData.clientName,
          email: appointmentData.clientEmail,
          phone: appointmentData.clientPhone || '',
          userCode: clientCode,
          codeGeneratedAt: serverTimestamp(),
          firstAppointment: appointmentData.appointmentDate,
          lastAppointment: appointmentData.appointmentDate,
          totalAppointments: 1,
          totalSpent: appointmentData.finalPrice || 0,
          status: 'ativo',
          lastContact: serverTimestamp(),
          source: 'agendamento',
          caseTypes: [appointmentData.caseType || 'Consulta Geral'],
          notes: `Cliente adicionado automaticamente através de agendamento.\n\nDescrição do primeiro caso:\n${appointmentData.caseDescription}`,
          lgpdConsent: appointmentData.lgpdConsent || false,
          lgpdConsentDate: appointmentData.lgpdConsentDate || serverTimestamp(),
          dataProtectionInfo: {
            consentGiven: appointmentData.lgpdConsent || false,
            consentDate: appointmentData.lgpdConsentDate || serverTimestamp(),
            dataController: appointmentData.lawyerName || 'Advogado',
            purpose: 'Gestão de clientes, histórico de consultas e comunicação sobre serviços jurídicos',
            legalBasis: 'Execução de contrato e legítimo interesse',
            retentionPeriod: 'Conforme legislação aplicável'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(clientRef, clientData);
        console.log(`✅ Cliente criado com código: ${clientCode}`);
        return { success: true, id: clientRef.id, created: true, clientCode };
      }
    } catch (error) {
      console.error('Erro ao criar cliente a partir de agendamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar cliente por email
  async getClientByEmail(userId, email) {
    try {
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', userId),
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: true, data: null };
      }
      
      const doc = querySnapshot.docs[0];
      return { success: true, data: { id: doc.id, ...doc.data() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obter clientes do usuário
  async getClients(userId) {
    try {
      // Consulta simples sem orderBy para evitar erro de índice
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const clients = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar no cliente por data de criação (mais recente primeiro)
      clients.sort((a, b) => {
        const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || new Date());
        const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || new Date());
        return dateB - dateA;
      });
      
      return { success: true, data: clients };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Atualizar cliente
  async updateClient(clientId, clientData) {
    try {
      await updateDoc(doc(db, 'clients', clientId), {
        ...clientData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Deletar cliente
  async deleteClient(clientId) {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Serviço de processos (para futuro uso)
export const caseService = {
  // Função auxiliar para limpar dados undefined
  _cleanDataForFirebase(data) {
    const cleanData = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      // Apenas incluir campos que não são undefined
      if (value !== undefined) {
        // Se for um objeto, limpar recursivamente
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const cleanedObject = this._cleanDataForFirebase(value);
          if (Object.keys(cleanedObject).length > 0) {
            cleanData[key] = cleanedObject;
          }
        } 
        // Se for um array, filtrar valores undefined
        else if (Array.isArray(value)) {
          const cleanedArray = value.filter(item => item !== undefined);
          if (cleanedArray.length > 0) {
            cleanData[key] = cleanedArray;
          }
        } 
        // Valores primitivos válidos
        else {
          cleanData[key] = value;
        }
      }
    });
    
    return cleanData;
  },

  // Criar processo
  async createCase(userId, caseData) {
    try {
      const caseRef = doc(collection(db, 'cases'));
      
      // Preparar dados para o Firebase e limpar undefined
      const processToSave = this._cleanDataForFirebase({
        ...caseData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Garantir que arrays existam
        assuntos: caseData.assuntos || [],
        movimentos: caseData.movimentos || [],
        
        // Converter datas para formato adequado
        ...(caseData.dataAjuizamento && {
          dataAjuizamento: caseData.dataAjuizamento
        }),
        ...(caseData.dataHoraUltimaAtualizacao && {
          dataHoraUltimaAtualizacao: caseData.dataHoraUltimaAtualizacao
        })
      });
      
      console.log('🔥 Salvando processo no Firebase (limpo):', processToSave);
      
      await setDoc(caseRef, processToSave);
      return { success: true, id: caseRef.id };
    } catch (error) {
      console.error('❌ Erro ao criar processo no Firebase:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter processos do usuário
  async getCases(userId) {
    try {
      console.log('🔄 Buscando processos no Firebase para usuário:', userId);
      
      // Consulta simples sem orderBy para evitar erro de índice
      const q = query(
        collection(db, 'cases'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Documentos encontrados:', querySnapshot.size);
      
      const cases = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Documento processado:', doc.id, data);
        return {
          id: doc.id,
          ...data,
          // Garantir que arrays existam
          assuntos: data.assuntos || [],
          movimentos: data.movimentos || [],
          // Converter timestamps do Firebase para datas
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      });
      
      // Ordenar no cliente por data de criação (mais recente primeiro)
      cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      console.log('🔥 Processos carregados do Firebase:', cases);
      console.log('🏛️ Processos do DataJud encontrados:', cases.filter(c => c.isFromDataJud));
      return { success: true, data: cases };
    } catch (error) {
      console.error('❌ Erro ao buscar processos no Firebase:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar processo
  async updateCase(caseId, caseData) {
    try {
      console.log('📝 Tentando atualizar documento:', caseId);
      
      // Verificar se o documento existe primeiro
      const docSnap = await getDoc(doc(db, 'cases', caseId));
      if (!docSnap.exists()) {
        console.error('❌ Documento não encontrado para atualização:', caseId);
        console.log('📋 Tentando criar novo documento ao invés de atualizar...');
        
        // Se o documento não existe, criar um novo
        const createResult = await this.createCase(caseData.userId, caseData);
        if (createResult.success) {
          console.log('✅ Documento criado com sucesso:', createResult.id);
          return { success: true, id: createResult.id, created: true };
        }
        
        return { success: false, error: `Documento não encontrado: ${caseId}` };
      }
      
      // Obter dados existentes para preservar userId
      const existingData = docSnap.data();
      const userId = existingData.userId || caseData.userId;
      
      // Preparar dados para atualização e limpar undefined
      const processToUpdate = this._cleanDataForFirebase({
        ...caseData,
        userId, // Sempre incluir userId para validação de permissão
        updatedAt: serverTimestamp(),
        
        // Garantir que arrays existam
        assuntos: caseData.assuntos || [],
        movimentos: caseData.movimentos || [],
        
        // Converter datas para formato adequado
        ...(caseData.dataAjuizamento && {
          dataAjuizamento: caseData.dataAjuizamento
        }),
        ...(caseData.dataHoraUltimaAtualizacao && {
          dataHoraUltimaAtualizacao: caseData.dataHoraUltimaAtualizacao
        })
      });
      
      console.log('🔥 Atualizando processo no Firebase (limpo):', processToUpdate);
      
      try {
        await updateDoc(doc(db, 'cases', caseId), processToUpdate);
        console.log('✅ Documento atualizado com sucesso:', caseId);
        return { success: true };
      } catch (updateError) {
        // Se updateDoc falhar por permissão, tenta setDoc com merge
        if (updateError.message.includes('permission')) {
          console.warn('⚠️ updateDoc falhou por permissão, tentando setDoc com merge...');
          await setDoc(doc(db, 'cases', caseId), processToUpdate, { merge: true });
          console.log('✅ Documento atualizado com setDoc com sucesso:', caseId);
          return { success: true };
        }
        throw updateError;
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar processo no Firebase:', error);
      return { success: false, error: error.message };
    }
  },

  // Deletar processo
  async deleteCase(caseId) {
    try {
      console.log('🔥 Deletando processo do Firebase:', caseId);
      await deleteDoc(doc(db, 'cases', caseId));
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao deletar processo no Firebase:', error);
      return { success: false, error: error.message };
    }
  },

  // Funções específicas para processos do DataJud
  
  // Buscar processos do DataJud por usuário
  async getDataJudCases(userId) {
    try {
      // Consulta simples sem orderBy para evitar erro de índice
      const q = query(
        collection(db, 'cases'),
        where('userId', '==', userId),
        where('isFromDataJud', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const cases = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          assuntos: data.assuntos || [],
          movimentos: data.movimentos || [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      });
      
      // Ordenar no cliente por data de importação (mais recente primeiro)
      cases.sort((a, b) => {
        const dateA = new Date(a.dataJudImportDate || a.createdAt);
        const dateB = new Date(b.dataJudImportDate || b.createdAt);
        return dateB - dateA;
      });
      
      console.log('🔥 Processos do DataJud carregados:', cases);
      return { success: true, data: cases };
    } catch (error) {
      console.error('❌ Erro ao buscar processos do DataJud:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Buscar processo por número
  async getCaseByNumber(userId, processNumber) {
    try {
      const q = query(
        collection(db, 'cases'),
        where('userId', '==', userId),
        where('number', '==', processNumber),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Processo não encontrado' };
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const processData = {
        id: doc.id,
        ...data,
        assuntos: data.assuntos || [],
        movimentos: data.movimentos || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      };
      
      return { success: true, data: processData };
    } catch (error) {
      console.error('❌ Erro ao buscar processo por número:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Verificar se um processo existe
  async getCaseById(caseId) {
    try {
      const docSnap = await getDoc(doc(db, 'cases', caseId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...data,
            assuntos: data.assuntos || [],
            movimentos: data.movimentos || [],
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date()
          }
        };
      }
      return { success: false, error: 'Processo não encontrado' };
    } catch (error) {
      console.error('❌ Erro ao buscar processo por ID:', error);
      return { success: false, error: error.message };
    }
  },

  // Estatísticas dos processos do usuário
  async getCaseStatistics(userId) {
    try {
      const q = query(
        collection(db, 'cases'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      let total = 0;
      let dataJudCount = 0;
      let statusCount = {
        'Em andamento': 0,
        'Concluído': 0,
        'Aguardando': 0,
        'Suspenso': 0
      };
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;
        
        if (data.isFromDataJud) {
          dataJudCount++;
        }
        
        if (statusCount.hasOwnProperty(data.status)) {
          statusCount[data.status]++;
        }
      });
      
      return {
        success: true,
        data: {
          total,
          dataJudCount,
          regularCount: total - dataJudCount,
          statusCount
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se processo do DataJud já foi salvo
  async checkDataJudProcessExists(userId, dataJudId) {
    try {
      console.log('🔍 Verificando existência do processo DataJud:', { userId, dataJudId });
      
      const q = query(
        collection(db, 'cases'),
        where('userId', '==', userId),
        where('dataJudId', '==', dataJudId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        console.log('✅ Processo DataJud encontrado no Firebase:', doc.id);
        return {
          success: true,
          exists: true,
          data: {
            id: doc.id,
            ...data,
            assuntos: data.assuntos || [],
            movimentos: data.movimentos || [],
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date()
          }
        };
      }
      
      console.log('ℹ️ Processo DataJud não encontrado no Firebase');
      return { success: true, exists: false };
    } catch (error) {
      console.error('❌ Erro ao verificar processo do DataJud:', error);
      return { success: false, error: error.message };
    }
  }
};

// Serviço de documentos (para futuro uso)
export const documentService = {
  // Criar documento
  async createDocument(userId, documentData) {
    try {
      const docRef = doc(collection(db, 'documents'));
      await setDoc(docRef, {
        ...documentData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obter documentos do usuário
  async getDocuments(userId) {
    try {
      // Consulta simples sem orderBy para evitar erro de índice
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar no cliente por data de criação (mais recente primeiro)
      documents.sort((a, b) => {
        const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || new Date());
        const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || new Date());
        return dateB - dateA;
      });
      
      return { success: true, data: documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Serviço de chat (Juri.AI)
const chatService = {
  // Criar novo chat
  async createChat(userId, chatData) {
    try {
      const chatRef = doc(collection(db, 'chats'));
      const chatToSave = {
        ...chatData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: chatData.messages || [],
        collectedData: chatData.collectedData || [],
        conversationPhase: chatData.conversationPhase || 'questioning',
        isCompleted: chatData.isCompleted || false
      };
      
      await setDoc(chatRef, chatToSave);
      return { success: true, id: chatRef.id };
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter chats do usuário
  async getChats(userId) {
    try {
      const q = query(
        collection(db, 'chats'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const chats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        lastUpdate: doc.data().updatedAt?.toDate?.() || new Date()
      }));
      
      // Ordenar por data de atualização (mais recente primeiro)
      chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return { success: true, data: chats };
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar chat
  async updateChat(chatId, chatData) {
    try {
      const updateData = {
        ...chatData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'chats', chatId), updateData);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar chat:', error);
      return { success: false, error: error.message };
    }
  },

  // Deletar chat
  async deleteChat(chatId) {
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      return { success: false, error: error.message };
    }
  },

  // Adicionar mensagem ao chat
  async addMessage(chatId, messageData) {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        return { success: false, error: 'Chat não encontrado' };
      }
      
      const currentMessages = chatDoc.data().messages || [];
      const updatedMessages = [...currentMessages, {
        ...messageData,
        timestamp: serverTimestamp()
      }];
      
      await updateDoc(chatRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar dados coletados
  async updateCollectedData(chatId, collectedData) {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        collectedData: collectedData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar dados coletados:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar fase da conversa
  async updateConversationPhase(chatId, phase) {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        conversationPhase: phase,
        updatedAt: serverTimestamp(),
        isCompleted: phase === 'completed'
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar fase da conversa:', error);
      return { success: false, error: error.message };
    }
  },

  // Escutar mudanças em tempo real em um chat
  onChatSnapshot(chatId, callback) {
    const chatRef = doc(db, 'chats', chatId);
    return onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        });
      }
    });
  }
};

// Serviço de calendário
const calendarFirestore = {
  // Criar evento
  async createEvent(userId, eventData) {
    try {
      const eventRef = doc(collection(db, 'events'));
      await setDoc(eventRef, {
        ...eventData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: eventRef.id };
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter eventos do usuário
  async getEvents(userId, date) {
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Usar apenas o filtro de userId para evitar índices compostos
      const q = query(
        collection(db, 'events'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      let events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));

      // Filtrar por data no cliente se necessário
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];
      
      events = events.filter(event => {
        const eventDate = event.date || '';
        return eventDate >= startStr && eventDate <= endStr;
      });
      
      return { success: true, data: events };
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar evento
  async updateEvent(eventId, eventData) {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        ...eventData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return { success: false, error: error.message };
    }
  },

  // Deletar evento
  async deleteEvent(eventId) {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      return { success: false, error: error.message };
    }
  },

  // Criar processo
  async createProcess(userId, processData) {
    try {
      const processRef = doc(collection(db, 'processes'));
      await setDoc(processRef, {
        ...processData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: processRef.id };
    } catch (error) {
      console.error('Erro ao criar processo:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter processos do usuário
  async getProcesses(userId, date) {
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Usar apenas o filtro de userId para evitar índices compostos
      const q = query(
        collection(db, 'processes'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      let processes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));

      // Filtrar por data no cliente se necessário
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];
      
      processes = processes.filter(process => {
        const processDate = process.date || '';
        return processDate >= startStr && processDate <= endStr;
      });
      
      return { success: true, data: processes };
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar processo
  async updateProcess(processId, processData) {
    try {
      await updateDoc(doc(db, 'processes', processId), {
        ...processData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar processo:', error);
      return { success: false, error: error.message };
    }
  },

  // Deletar processo
  async deleteProcess(processId) {
    try {
      await deleteDoc(doc(db, 'processes', processId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar processo:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter itens próximos (eventos e processos)
  async getUpcomingItems(userId, daysAhead = 7) {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);
      
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      // Buscar eventos próximos
      const eventsQuery = query(
        collection(db, 'events'),
        where('userId', '==', userId),
        where('date', '>=', todayStr),
        where('date', '<=', futureDateStr)
      );
      
      // Buscar processos próximos
      const processesQuery = query(
        collection(db, 'processes'),
        where('userId', '==', userId),
        where('date', '>=', todayStr),
        where('date', '<=', futureDateStr)
      );
      
      const [eventsSnapshot, processesSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(processesQuery)
      ]);
      
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'event',
        ...doc.data()
      }));
      
      const processes = processesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'process',
        ...doc.data()
      }));
      
      const allItems = [...events, ...processes].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      
      return { success: true, data: allItems };
    } catch (error) {
      console.error('Erro ao buscar itens próximos:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar itens por termo
  async searchItems(userId, searchTerm) {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('userId', '==', userId)
      );
      
      const processesQuery = query(
        collection(db, 'processes'),
        where('userId', '==', userId)
      );
      
      const [eventsSnapshot, processesSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(processesQuery)
      ]);
      
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'event',
        ...doc.data()
      }));
      
      const processes = processesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'process',
        ...doc.data()
      }));
      
      const allItems = [...events, ...processes];
      
      // Filtrar por termo de busca
      const filteredItems = allItems.filter(item => 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.processNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.client?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return { success: true, data: filteredItems };
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter estatísticas do calendário
  async getCalendarStats(userId) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const todayStr = today.toISOString().split('T')[0];
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      const endOfMonthStr = endOfMonth.toISOString().split('T')[0];
      
      // Contar eventos
      const eventsThisMonth = query(
        collection(db, 'events'),
        where('userId', '==', userId),
        where('date', '>=', startOfMonthStr),
        where('date', '<=', endOfMonthStr)
      );
      
      const eventsToday = query(
        collection(db, 'events'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      
      // Contar processos
      const processesThisMonth = query(
        collection(db, 'processes'),
        where('userId', '==', userId),
        where('date', '>=', startOfMonthStr),
        where('date', '<=', endOfMonthStr)
      );
      
      const processesToday = query(
        collection(db, 'processes'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      
      const [
        eventsThisMonthSnapshot,
        eventsTodaySnapshot,
        processesThisMonthSnapshot,
        processesTodaySnapshot
      ] = await Promise.all([
        getDocs(eventsThisMonth),
        getDocs(eventsToday),
        getDocs(processesThisMonth),
        getDocs(processesToday)
      ]);
      
      const stats = {
        eventsThisMonth: eventsThisMonthSnapshot.size,
        eventsToday: eventsTodaySnapshot.size,
        processesThisMonth: processesThisMonthSnapshot.size,
        processesToday: processesTodaySnapshot.size,
        totalThisMonth: eventsThisMonthSnapshot.size + processesThisMonthSnapshot.size,
        totalToday: eventsTodaySnapshot.size + processesTodaySnapshot.size
      };
      
      return { success: true, data: stats };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { success: false, error: error.message };
    }
  }
};

// Serviço de páginas do advogado
const lawyerPageService = {
  // Criar página
  async createPage(userId, pageData) {
    try {
      // Se for escritório, validar CNPJ
      if (pageData.tipoPagina === 'escritorio') {
        const cnpjCheck = await this.checkCNPJExists(pageData.cnpj);
        if (!cnpjCheck.success) {
          return cnpjCheck;
        }
        
        // Limpar CNPJ para salvar no formato padrão
        pageData.cnpj = pageData.cnpj.replace(/[^\d]/g, '');
      }
      
      const pageId = `page_${Date.now()}`;
      const pageDoc = {
        ...pageData,
        id: pageId,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'lawyerPages', pageId), pageDoc);
      return { success: true, data: { ...pageDoc, id: pageId } };
    } catch (error) {
      console.error('Erro ao criar página:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter páginas do usuário
  async getPagesByUser(userId) {
    try {
      const q = query(
        collection(db, 'lawyerPages'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const pages = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        pages.push({
          id: doc.id,
          ...data,
          // Converter timestamps para Date se existirem
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        });
      });
      
      // Ordenar no cliente por data de criação (mais recente primeiro)
      pages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, data: pages };
    } catch (error) {
      console.error('Erro ao buscar páginas:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter página por slug (para visualização pública)
  async getPageBySlug(slug) {
    try {
      const q = query(
        collection(db, 'lawyerPages'),
        where('slug', '==', slug),
        where('isActive', '==', true),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Página não encontrada' };
      }
      
      const doc = querySnapshot.docs[0];
      return { 
        success: true, 
        data: {
          id: doc.id,
          ...doc.data()
        }
      };
    } catch (error) {
      console.error('Erro ao buscar página por slug:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar página
  async updatePage(pageId, pageData) {
    try {
      // Se for escritório, validar CNPJ
      if (pageData.tipoPagina === 'escritorio') {
        const cnpjCheck = await this.checkCNPJExists(pageData.cnpj, pageId);
        if (!cnpjCheck.success) {
          return cnpjCheck;
        }
        
        // Limpar CNPJ para salvar no formato padrão
        pageData.cnpj = pageData.cnpj.replace(/[^\d]/g, '');
      }
      
      const updateData = {
        ...pageData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'lawyerPages', pageId), updateData);
      
      // Retornar os dados atualizados com o ID
      return { 
        success: true, 
        data: { 
          ...pageData, 
          id: pageId,
          updatedAt: new Date()
        } 
      };
    } catch (error) {
      console.error('Erro ao atualizar página:', error);
      return { success: false, error: error.message };
    }
  },

  // Deletar página
  async deletePage(pageId) {
    try {
      await deleteDoc(doc(db, 'lawyerPages', pageId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar página:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se slug está disponível
  async isSlugAvailable(slug, excludePageId = null) {
    try {
      let q = query(
        collection(db, 'lawyerPages'),
        where('slug', '==', slug)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (excludePageId) {
        return querySnapshot.docs.every(doc => doc.id !== excludePageId);
      }
      
      return querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar slug:', error);
      return false;
    }
  },

  // Função para validar CNPJ
  validateCNPJ(cnpj) {
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCNPJ.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    let weight = 5;
    
    // Primeiro dígito verificador
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    
    if (parseInt(cleanCNPJ[12]) !== digit) return false;
    
    // Segundo dígito verificador
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    
    return parseInt(cleanCNPJ[13]) === digit;
  },

  // Verificar se CNPJ já está em uso
  async checkCNPJExists(cnpj, excludePageId = null) {
    try {
      const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
      
      if (!this.validateCNPJ(cleanCNPJ)) {
        return { success: false, error: 'CNPJ inválido' };
      }
      
      const q = query(
        collection(db, 'lawyerPages'),
        where('tipoPagina', '==', 'escritorio'),
        where('cnpj', '==', cleanCNPJ)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Se está editando, excluir a própria página da verificação
      const existingPages = querySnapshot.docs.filter(doc => 
        excludePageId ? doc.id !== excludePageId : true
      );
      
      if (existingPages.length > 0) {
        return { 
          success: false, 
          error: 'CNPJ já cadastrado para outro escritório',
          exists: true 
        };
      }
      
      return { success: true, exists: false };
    } catch (error) {
      console.error('Erro ao verificar CNPJ:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar página por ID
  async getPageById(pageId) {
    try {
      console.log('🔍 lawyerPageService.getPageById:', pageId);
      const docSnap = await getDoc(doc(db, 'lawyerPages', pageId));
      if (docSnap.exists()) {
        return { 
          success: true, 
          data: {
            id: docSnap.id,
            ...docSnap.data()
          }
        };
      }
      return { success: false, error: 'Página não encontrada' };
    } catch (error) {
      console.error('❌ Erro ao buscar página por ID:', error);
      return { success: false, error: error.message };
    }
  },

  // Alias para compatibilidade com componentes existentes
  async getUserPages(userId) {
    return await this.getPagesByUser(userId);
  },

  // Buscar todas as páginas ativas para o diretório público
  async getAllActivePages() {
    try {
      console.log('🔍 Buscando todas as páginas ativas...');
      
      const q = query(
        collection(db, 'lawyerPages'),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const pages = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        pages.push({
          id: doc.id,
          ...data,
          // Converter timestamps para Date se existirem
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        });
      });
      
      // Ordenar por data de criação (mais recente primeiro)
      pages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      console.log('✅ Páginas ativas encontradas:', pages.length);
      return { success: true, data: pages };
    } catch (error) {
      console.error('❌ Erro ao buscar páginas ativas:', error);
      return { success: false, error: error.message };
    }
  }
};

// Serviço de agendamentos
const appointmentService = {
  // Atualizar agendamento (atribuir advogado, etc)
  async updateAppointment(appointmentId, updateData) {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return { success: false, error: error.message };
    }
  },
  // Criar agendamento
  async createAppointment(appointmentData) {
    try {
      const appointmentRef = doc(collection(db, 'appointments'));
      await setDoc(appointmentRef, {
        ...appointmentData,
        status: 'pendente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Suporte para agendamento atribuído a outro advogado
        assignedLawyerId: appointmentData.assignedLawyerId || null,
        assignedLawyerName: appointmentData.assignedLawyerName || null
      });
      return { success: true, id: appointmentRef.id };
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter agendamentos por cliente
  async getAppointmentsByClient(clientId) {
    try {
      console.log('🔍 Buscando agendamentos do cliente:', clientId);
      const q = query(
        collection(db, 'appointments'),
        where('clientUserId', '==', clientId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Agendamentos encontrados:', querySnapshot.size);
      querySnapshot.docs.forEach(doc => {
        console.log('  - ID:', doc.id, 'clientUserId:', doc.data().clientUserId);
      });
      
      const appointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        appointmentDate: doc.data().appointmentDate?.toDate?.() || new Date(doc.data().appointmentDate)
      }));
      
      // Sort by createdAt in JavaScript instead of Firestore
      appointments.sort((a, b) => b.createdAt - a.createdAt);
      
      return { success: true, data: appointments };
    } catch (error) {
      console.error('Erro ao buscar agendamentos do cliente:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter agendamentos por advogado
  async getAppointmentsByLawyer(lawyerId) {
    try {
      // Buscar agendamentos onde o advogado é o dono OU foi atribuído
      const q1 = query(
        collection(db, 'appointments'),
        where('lawyerUserId', '==', lawyerId)
      );
      const q2 = query(
        collection(db, 'appointments'),
        where('assignedLawyerId', '==', lawyerId)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const appointments = [
        ...snap1.docs,
        ...snap2.docs
      ].reduce((acc, doc) => {
        // Evitar duplicatas
        if (!acc.some(a => a.id === doc.id)) {
          acc.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
            appointmentDate: doc.data().appointmentDate?.toDate?.() || new Date(doc.data().appointmentDate)
          });
        }
        return acc;
      }, []);

      // Sort by createdAt in JavaScript instead of Firestore
      appointments.sort((a, b) => b.createdAt - a.createdAt);
      return { success: true, data: appointments };
    } catch (error) {
      console.error('Erro ao buscar agendamentos do advogado:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter agendamentos públicos do advogado (sem autenticação)
  async getPublicAppointmentsByLawyer(lawyerId) {
    try {
      // Buscar agendamentos onde o advogado é o dono OU foi atribuído
      // Sem filtros de privacidade - deixar firestore.rules decidir
      const q1 = query(
        collection(db, 'appointments'),
        where('lawyerUserId', '==', lawyerId)
      );
      const q2 = query(
        collection(db, 'appointments'),
        where('assignedLawyerId', '==', lawyerId)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const appointments = [
        ...snap1.docs,
        ...snap2.docs
      ].reduce((acc, doc) => {
        // Evitar duplicatas
        if (!acc.some(a => a.id === doc.id)) {
          acc.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
            appointmentDate: doc.data().appointmentDate?.toDate?.() || new Date(doc.data().appointmentDate)
          });
        }
        return acc;
      }, []);

      // Sort by createdAt in JavaScript instead of Firestore
      appointments.sort((a, b) => b.createdAt - a.createdAt);
      return { success: true, data: appointments };
    } catch (error) {
      console.warn('Aviso ao buscar agendamentos públicos do advogado:', error.message);
      // Retornar array vazio em vez de erro para permitir página carregar
      return { success: true, data: [] };
    }
  },

  // Confirmar agendamento
  async confirmAppointment(appointmentId, finalPrice, videoCallLink) {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'aguardando_pagamento',
        finalPrice: finalPrice,
        videoCallLink: videoCallLink,
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Cancelar agendamento
  async cancelAppointment(appointmentId, reason) {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'cancelado',
        cancelReason: reason,
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Finalizar agendamento
  async finalizeAppointment(appointmentId, finalizedBy) {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'finalizado',
        finalizedBy: finalizedBy,
        finalizedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao finalizar agendamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Gerar evento para calendário
  async generateCalendarEvent(appointmentId) {
    try {
      const docSnap = await getDoc(doc(db, 'appointments', appointmentId));
      if (!docSnap.exists()) {
        return { success: false, error: 'Agendamento não encontrado' };
      }
      
      const appointment = docSnap.data();
      const appointmentDate = appointment.appointmentDate?.toDate?.() || new Date(appointment.appointmentDate);
      
      const event = {
        id: appointmentId,
        title: `Consulta Jurídica - ${appointment.clientName}`,
        start: appointmentDate,
        end: new Date(appointmentDate.getTime() + 60 * 60 * 1000), // 1 hora
        description: `Consulta com ${appointment.lawyerName}\nCliente: ${appointment.clientName}\nEmail: ${appointment.clientEmail}\nValor: R$ ${appointment.finalPrice || appointment.proposedPrice}`,
        location: appointment.videoCallLink ? 'Chamada de Vídeo' : 'A definir'
      };
      
      return { success: true, data: event };
    } catch (error) {
      console.error('Erro ao gerar evento do calendário:', error);
      return { success: false, error: error.message };
    }
  },

  // Gerar link de pagamento
  async generatePaymentLink(appointmentId, paymentInfo) {
    try {
      // Aqui você pode integrar com gateways de pagamento como Stripe, PagSeguro, etc.
      // Por enquanto, vamos simular o processo
      
      await updateDoc(doc(db, 'appointments', appointmentId), {
        paymentInfo: paymentInfo,
        paymentLinkGenerated: true,
        paymentLinkGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Simular link de pagamento
      const paymentLink = `https://pagamento.exemplo.com/pay/${appointmentId}`;
      
      return { success: true, paymentLink: paymentLink };
    } catch (error) {
      console.error('Erro ao gerar link de pagamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Confirmar pagamento
  async confirmPayment(appointmentId, paymentData) {
    try {
      const batch = writeBatch(db);
      
      // Atualizar status do agendamento
      const appointmentRef = doc(db, 'appointments', appointmentId);
      batch.update(appointmentRef, {
        status: 'pago',
        paymentData: paymentData,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Commitar apenas a atualização do appointment
      // O registro financeiro será feito por uma Cloud Function ou pelo advogado
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Alias para compatibilidade com componentes existentes
  async getLawyerAppointments(lawyerId) {
    return await this.getAppointmentsByLawyer(lawyerId);
  },

  // Adicionar mensagem ao chat do agendamento
  async addAppointmentMessage(appointmentId, messageData) {
    try {
      const messagesRef = collection(db, 'appointments', appointmentId, 'messages');
      const newMessageRef = doc(messagesRef);
      
      await setDoc(newMessageRef, {
        ...messageData,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      return { success: true, id: newMessageRef.id };
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter mensagens do agendamento
  async getAppointmentMessages(appointmentId) {
    try {
      const messagesRef = collection(db, 'appointments', appointmentId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      return { success: true, data: messages };
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Deletar mensagem
  async deleteAppointmentMessage(appointmentId, messageId) {
    try {
      await deleteDoc(doc(db, 'appointments', appointmentId, 'messages', messageId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      return { success: false, error: error.message };
    }
  }
};

// Serviço financeiro
const financialService = {
  // Registrar pagamento
  async recordPayment(lawyerId, paymentData) {
    try {
      const financialRef = doc(collection(db, 'financial'));
      await setDoc(financialRef, {
        ...paymentData,
        lawyerId,
        type: 'receita',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: financialRef.id };
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter histórico de pagamentos
  async getPaymentHistory(lawyerId) {
    try {
      const q = query(
        collection(db, 'financial'),
        where('lawyerId', '==', lawyerId),
        where('type', '==', 'receita')
      );
      
      const querySnapshot = await getDocs(q);
      const payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        date: doc.data().date?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      // Sort by createdAt in JavaScript instead of Firestore
      payments.sort((a, b) => b.createdAt - a.createdAt);
      
      return { success: true, data: payments };
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter histórico de saques
  async getWithdrawalHistory(lawyerId) {
    try {
      const q = query(
        collection(db, 'financial'),
        where('lawyerId', '==', lawyerId),
        where('type', '==', 'saque')
      );
      
      const querySnapshot = await getDocs(q);
      const withdrawals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        date: doc.data().date?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      // Sort by createdAt in JavaScript instead of Firestore
      withdrawals.sort((a, b) => b.createdAt - a.createdAt);
      
      return { success: true, data: withdrawals };
    } catch (error) {
      console.error('Erro ao buscar histórico de saques:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter resumo financeiro
  async getFinancialSummary(lawyerId) {
    try {
      const [paymentsResult, withdrawalsResult] = await Promise.all([
        this.getPaymentHistory(lawyerId),
        this.getWithdrawalHistory(lawyerId)
      ]);
      
      if (!paymentsResult.success || !withdrawalsResult.success) {
        return { success: false, error: 'Erro ao carregar dados financeiros' };
      }
      
      const payments = paymentsResult.data || [];
      const withdrawals = withdrawalsResult.data || [];
      
      const totalReceived = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalWithdrawn = withdrawals.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0);
      const balance = totalReceived - totalWithdrawn;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyReceived = payments
        .filter(p => {
          const paymentDate = p.date || p.createdAt;
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      // Calcular D+30: valores disponíveis e bloqueados
      const now = new Date();
      let availableForWithdrawal = 0;
      let pendingAmount = 0;
      
      payments.forEach(payment => {
        const paymentDate = payment.date || payment.createdAt;
        const releaseDate = new Date(paymentDate);
        releaseDate.setDate(releaseDate.getDate() + 30); // D+30
        
        const amount = payment.amount || 0;
        
        if (now >= releaseDate) {
          // Valor já liberado (passou dos 30 dias)
          availableForWithdrawal += amount;
        } else {
          // Valor ainda bloqueado (ainda em D+30)
          pendingAmount += amount;
        }
      });
      
      // Subtrair os saques já realizados do valor disponível
      availableForWithdrawal = Math.max(0, availableForWithdrawal - totalWithdrawn);
      
      return {
        success: true,
        data: {
          totalReceived,
          totalWithdrawn,
          balance,
          monthlyReceived,
          availableForWithdrawal, // Valor disponível para saque (após D+30 e descontando saques)
          pendingAmount, // Valor bloqueado (ainda em D+30)
          paymentsCount: payments.length,
          withdrawalsCount: withdrawals.length,
          payments: payments.slice(0, 5), // últimos 5 pagamentos
          withdrawals: withdrawals.slice(0, 5) // últimos 5 saques
        }
      };
    } catch (error) {
      console.error('Erro ao gerar resumo financeiro:', error);
      return { success: false, error: error.message };
    }
  },

  // Solicitar saque
  async requestWithdrawal(lawyerId, withdrawalData) {
    try {
      const financialRef = doc(collection(db, 'financial'));
      await setDoc(financialRef, {
        ...withdrawalData,
        lawyerId,
        type: 'saque',
        status: 'solicitado',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: financialRef.id };
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter histórico de pagamentos por página específica
  async getPaymentHistoryByPage(pageId, userId) {
    try {
      console.log('🔍 Verificando acesso financeiro para página:', pageId);
      
      // Verificar permissões de acesso financeiro
      const accessCheck = await collaborationService.canViewFinancial(userId, pageId);
      if (!accessCheck.success || !accessCheck.canView) {
        return { 
          success: false, 
          error: accessCheck.reason || 'Acesso negado às informações financeiras' 
        };
      }

      // Buscar dados da página para obter o lawyerId (dono)
      const pageResult = await lawyerPageService.getPageById(pageId);
      if (!pageResult.success) {
        return { success: false, error: 'Página não encontrada' };
      }

      const lawyerId = pageResult.data.userId;

      // Buscar pagamentos do dono da página
      const q = query(
        collection(db, 'financial'),
        where('lawyerId', '==', lawyerId),
        where('type', '==', 'receita')
      );
      
      const querySnapshot = await getDocs(q);
      const payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        date: doc.data().date?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      // Sort by createdAt in JavaScript instead of Firestore
      payments.sort((a, b) => b.createdAt - a.createdAt);
      
      return { 
        success: true, 
        data: payments,
        pageInfo: pageResult.data 
      };
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos por página:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter resumo financeiro por página específica
  async getFinancialSummaryByPage(pageId, userId) {
    try {
      console.log('🔍 Verificando acesso financeiro para resumo da página:', pageId);
      
      // Verificar permissões de acesso financeiro
      const accessCheck = await collaborationService.canViewFinancial(userId, pageId);
      if (!accessCheck.success || !accessCheck.canView) {
        return { 
          success: false, 
          error: accessCheck.reason || 'Acesso negado às informações financeiras' 
        };
      }

      // Buscar dados da página para obter o lawyerId (dono)
      const pageResult = await lawyerPageService.getPageById(pageId);
      if (!pageResult.success) {
        return { success: false, error: 'Página não encontrada' };
      }

      const lawyerId = pageResult.data.userId;

      // Usar o método existente para obter o resumo financeiro do dono
      const summaryResult = await this.getFinancialSummary(lawyerId);
      
      if (summaryResult.success) {
        return {
          success: true,
          data: {
            ...summaryResult.data,
            pageInfo: pageResult.data
          }
        };
      }

      return summaryResult;
    } catch (error) {
      console.error('Erro ao gerar resumo financeiro por página:', error);
      return { success: false, error: error.message };
    }
  }
};

// Serviço de colaboração entre advogados
const collaborationService = {
  // Verificar e garantir que o usuário tem um userCode
  async ensureUserCode(userId) {
    try {
      const userResult = await userService.getUser(userId);
      if (!userResult.success) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      const userData = userResult.data;
      
      // Se já tem userCode, retornar
      if (userData.userCode) {
        return { success: true, userCode: userData.userCode };
      }

      // Se não tem, gerar um novo
      console.log('🔧 Usuário sem userCode, gerando...');
      const { generateUniqueUserCode } = await import('../services/userCodeService');
      const codeResult = await generateUniqueUserCode();
      
      if (!codeResult.success) {
        return { success: false, error: 'Erro ao gerar código único' };
      }

      // Atualizar usuário com o novo código
      const updateResult = await userService.updateUser(userId, {
        userCode: codeResult.code
      });

      if (updateResult.success) {
        console.log('✅ UserCode gerado e salvo:', codeResult.code);
        return { success: true, userCode: codeResult.code };
      } else {
        return { success: false, error: 'Erro ao salvar código do usuário' };
      }
    } catch (error) {
      console.error('Erro ao garantir userCode:', error);
      return { success: false, error: error.message };
    }
  },

  // Enviar convite para colaborar
  async sendInvite(senderUserId, inviteData) {
    try {
      console.log('🔄 collaborationService.sendInvite chamado:', {
        senderUserId,
        inviteData
      });

      // Validação específica do senderUserId
      if (!senderUserId) {
        console.error('❌ ERRO CRÍTICO: senderUserId é null/undefined!');
        return { success: false, error: 'senderUserId é obrigatório' };
      }

      console.log('✅ senderUserId validado:', {
        value: senderUserId,
        type: typeof senderUserId,
        length: senderUserId?.length
      });

      const inviteRef = doc(collection(db, 'collaboration_invites'));
      const fullInviteData = {
        ...inviteData,
        senderUserId,
        status: 'pending', // pending, accepted, rejected
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('💾 Dados que serão salvos (incluindo senderUserId):', fullInviteData);

      await setDoc(inviteRef, fullInviteData);
      
      console.log('✅ Convite salvo com sucesso, ID:', inviteRef.id);
      
      // Verificação adicional: ler o documento recém-criado
      const savedDoc = await getDoc(inviteRef);
      if (savedDoc.exists()) {
        const savedData = savedDoc.data();
        console.log('🔍 Verificação pós-salvamento - senderUserId:', savedData.senderUserId);
      }
      
      return { success: true, id: inviteRef.id };
    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar usuário por código do cliente
  async findUserByClientCode(clientCode) {
    try {
      console.log('🔍 Buscando usuário por código:', clientCode);

      const q = query(
        collection(db, 'users'),
        where('userCode', '==', clientCode)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Resultado da busca - documentos encontrados:', querySnapshot.size);
      
      if (querySnapshot.empty) {
        console.log('❌ Nenhum usuário encontrado com código:', clientCode);
        return { success: false, error: 'Usuário não encontrado com este código' };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('✅ Usuário encontrado:', {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        userCode: userData.userCode
      });
      
      return { 
        success: true, 
        data: {
          id: userDoc.id,
          name: userData.name,
          email: userData.email,
          userCode: userData.userCode
        }
      };
    } catch (error) {
      console.error('💥 Erro ao buscar usuário:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter convites recebidos
  async getReceivedInvites(userId) {
    try {
      console.log('🔍 Buscando convites recebidos para usuário:', userId);

      const q = query(
        collection(db, 'collaboration_invites'),
        where('targetUserId', '==', userId)
        // Removendo orderBy temporariamente para testar
        // orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Convites encontrados:', querySnapshot.size);
      
      const invites = [];
      
      for (const docSnap of querySnapshot.docs) {
        const inviteData = docSnap.data();
        console.log('📋 Processando convite:', docSnap.id, inviteData);
        
        // Buscar dados do remetente
        console.log('👤 Buscando dados do remetente:', inviteData.senderUserId);
        const senderResult = await userService.getUser(inviteData.senderUserId);
        console.log('👤 Resultado busca remetente:', senderResult);
        
        // Buscar dados da página
        let pageData = null;
        if (inviteData.pageId) {
          console.log('📄 Buscando dados da página:', inviteData.pageId);
          const pageResult = await lawyerPageService.getPageById(inviteData.pageId);
          console.log('📄 Resultado busca página:', pageResult);
          pageData = pageResult.success ? pageResult.data : null;
        }
        
        const processedInvite = {
          id: docSnap.id,
          ...inviteData,
          senderData: senderResult.success ? senderResult.data : null,
          pageData: pageData,
          createdAt: inviteData.createdAt?.toDate?.() || new Date(),
          updatedAt: inviteData.updatedAt?.toDate?.() || new Date()
        };
        
        console.log('📋 Convite processado:', processedInvite);
        invites.push(processedInvite);
      }
      
      console.log('✅ Convites processados:', invites.length);
      return { success: true, data: invites };
    } catch (error) {
      console.error('❌ Erro ao buscar convites recebidos:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter convites enviados
  async getSentInvites(userId) {
    try {
      const q = query(
        collection(db, 'collaboration_invites'),
        where('senderUserId', '==', userId)
        // Removendo orderBy temporariamente para testar
        // orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const invites = [];
      
      for (const docSnap of querySnapshot.docs) {
        const inviteData = docSnap.data();
        
        // Buscar dados do destinatário
        const targetResult = await userService.getUser(inviteData.targetUserId);
        
        invites.push({
          id: docSnap.id,
          ...inviteData,
          targetData: targetResult.success ? targetResult.data : null,
          createdAt: inviteData.createdAt?.toDate?.() || new Date(),
          updatedAt: inviteData.updatedAt?.toDate?.() || new Date()
        });
      }
      
      return { success: true, data: invites };
    } catch (error) {
      console.error('Erro ao buscar convites enviados:', error);
      return { success: false, error: error.message };
    }
  },

  // Responder a um convite
  async respondToInvite(inviteId, response, userId) {
    try {
      const inviteRef = doc(db, 'collaboration_invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);
      
      if (!inviteSnap.exists()) {
        return { success: false, error: 'Convite não encontrado' };
      }
      
      const inviteData = inviteSnap.data();
      
      // Verificar se o usuário pode responder este convite
      if (inviteData.targetUserId !== userId) {
        return { success: false, error: 'Não autorizado a responder este convite' };
      }
      
      // Atualizar status do convite
      await updateDoc(inviteRef, {
        status: response, // 'accepted' ou 'rejected'
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Se aceito, criar colaboração ativa
      if (response === 'accepted') {
        const collaborationRef = doc(collection(db, 'collaborations'));
        await setDoc(collaborationRef, {
          ownerUserId: inviteData.senderUserId,
          collaboratorUserId: userId,
          pageId: inviteData.pageId,
          role: inviteData.role,
          permissions: inviteData.permissions,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao responder convite:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter colaborações onde o usuário é dono
  async getOwnedCollaborations(userId) {
    try {
      const q = query(
        collection(db, 'collaborations'),
        where('ownerUserId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const collaborations = [];
      
      for (const docSnap of querySnapshot.docs) {
        const collabData = docSnap.data();
        
        // Buscar dados do colaborador
        const collaboratorResult = await userService.getUser(collabData.collaboratorUserId);
        
        collaborations.push({
          id: docSnap.id,
          ...collabData,
          collaboratorData: collaboratorResult.success ? collaboratorResult.data : null,
          createdAt: collabData.createdAt?.toDate?.() || new Date(),
          updatedAt: collabData.updatedAt?.toDate?.() || new Date()
        });
      }
      
      return { success: true, data: collaborations };
    } catch (error) {
      console.error('Erro ao buscar colaborações próprias:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter colaborações onde o usuário é colaborador
  async getCollaboratorAccess(userId) {
    try {
      const q = query(
        collection(db, 'collaborations'),
        where('collaboratorUserId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const collaborations = [];
      
      for (const docSnap of querySnapshot.docs) {
        const collabData = docSnap.data();
        
        // Buscar dados do dono
        const ownerResult = await userService.getUser(collabData.ownerUserId);
        
        collaborations.push({
          id: docSnap.id,
          ...collabData,
          ownerData: ownerResult.success ? ownerResult.data : null,
          createdAt: collabData.createdAt?.toDate?.() || new Date(),
          updatedAt: collabData.updatedAt?.toDate?.() || new Date()
        });
      }
      
      return { success: true, data: collaborations };
    } catch (error) {
      console.error('Erro ao buscar acessos como colaborador:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar usuário por ID (para carregar dados do remetente)
  async getUserById(userId) {
    try {
      console.log('🔍 collaborationService.getUserById:', userId);
      return await userService.getUser(userId);
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por ID:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar página por ID (para carregar dados da página)
  async getPageById(pageId) {
    try {
      console.log('🔍 collaborationService.getPageById:', pageId);
      return await lawyerPageService.getPageById(pageId);
    } catch (error) {
      console.error('❌ Erro ao buscar página por ID:', error);
      return { success: false, error: error.message };
    }
  },

  // Aceitar convite
  async acceptInvite(inviteId) {
    try {
      console.log('✅ Aceitando convite:', inviteId);
      
      // Buscar dados do convite para obter o userId do destinatário
      const inviteRef = doc(db, 'collaboration_invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);
      
      if (!inviteSnap.exists()) {
        return { success: false, error: 'Convite não encontrado' };
      }
      
      const inviteData = inviteSnap.data();
      console.log('📄 Dados do convite para aceitar:', inviteData);
      
      // Usar respondToInvite que cria a colaboração ativa
      return await this.respondToInvite(inviteId, 'accepted', inviteData.targetUserId);
    } catch (error) {
      console.error('❌ Erro ao aceitar convite:', error);
      return { success: false, error: error.message };
    }
  },

  // Recusar convite
  async declineInvite(inviteId) {
    try {
      console.log('❌ Recusando convite:', inviteId);
      const inviteRef = doc(db, 'collaboration_invites', inviteId);
      await updateDoc(inviteRef, {
        status: 'declined',
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao recusar convite:', error);
      return { success: false, error: error.message };
    }
  },

  // Remover colaboração
  async removeCollaboration(collaborationId, userId) {
    try {
      const collabRef = doc(db, 'collaborations', collaborationId);
      const collabSnap = await getDoc(collabRef);
      
      if (!collabSnap.exists()) {
        return { success: false, error: 'Colaboração não encontrada' };
      }
      
      const collabData = collabSnap.data();
      
      // Verificar se o usuário pode remover (dono ou colaborador)
      if (collabData.ownerUserId !== userId && collabData.collaboratorUserId !== userId) {
        return { success: false, error: 'Não autorizado a remover esta colaboração' };
      }
      
      await deleteDoc(collabRef);
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover colaboração:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar permissões de um usuário para uma página
  async checkUserPermissions(userId, pageId) {
    try {
      // Verificar se é o dono da página
      const pageResult = await lawyerPageService.getPageById(pageId);
      if (pageResult.success && pageResult.data.userId === userId) {
        return {
          success: true,
          data: {
            isOwner: true,
            role: 'owner',
            permissions: ['clients', 'appointments', 'financial', 'edit', 'delete', 'invite', 'deactivate']
          }
        };
      }
      
      // Verificar se tem acesso como colaborador
      const q = query(
        collection(db, 'collaborations'),
        where('collaboratorUserId', '==', userId),
        where('pageId', '==', pageId)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const collabData = querySnapshot.docs[0].data();
        
        // Definir permissões baseadas no role do colaborador
        let rolePermissions = [];
        switch (collabData.role) {
          case 'lawyer':
            rolePermissions = ['clients', 'appointments', 'financial'];
            break;
          case 'intern':
            rolePermissions = ['clients', 'appointments'];
            break;
          case 'financial':
            rolePermissions = ['financial'];
            break;
          default:
            rolePermissions = [];
        }
        
        return {
          success: true,
          data: {
            isOwner: false,
            role: collabData.role,
            permissions: rolePermissions
          }
        };
      }
      
      return {
        success: true,
        data: {
          isOwner: false,
          role: null,
          permissions: []
        }
      };
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se o usuário pode editar a página
  async canEditPage(userId, pageId) {
    try {
      const permissionsResult = await this.checkUserPermissions(userId, pageId);
      if (!permissionsResult.success) {
        return { success: false, error: permissionsResult.error };
      }

      const { isOwner } = permissionsResult.data;
      
      // SOMENTE o dono pode editar
      const canEdit = isOwner;
      
      return {
        success: true,
        canEdit,
        reason: canEdit ? null : 'Apenas o proprietário da página pode editar'
      };
    } catch (error) {
      console.error('Erro ao verificar permissão de edição:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se o usuário pode deletar a página
  async canDeletePage(userId, pageId) {
    try {
      const permissionsResult = await this.checkUserPermissions(userId, pageId);
      if (!permissionsResult.success) {
        return { success: false, error: permissionsResult.error };
      }

      const { isOwner } = permissionsResult.data;
      
      // SOMENTE o dono pode deletar
      const canDelete = isOwner;
      
      return {
        success: true,
        canDelete,
        reason: canDelete ? null : 'Apenas o proprietário da página pode excluir'
      };
    } catch (error) {
      console.error('Erro ao verificar permissão de exclusão:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se o usuário pode enviar convites para a página
  async canInviteToPage(userId, pageId) {
    try {
      const permissionsResult = await this.checkUserPermissions(userId, pageId);
      if (!permissionsResult.success) {
        return { success: false, error: permissionsResult.error };
      }

      const { isOwner } = permissionsResult.data;
      
      // SOMENTE o dono pode convidar
      const canInvite = isOwner;
      
      return {
        success: true,
        canInvite,
        reason: canInvite ? null : 'Apenas o proprietário da página pode enviar convites'
      };
    } catch (error) {
      console.error('Erro ao verificar permissão de convite:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se o usuário pode desativar a página
  async canDeactivatePage(userId, pageId) {
    try {
      const permissionsResult = await this.checkUserPermissions(userId, pageId);
      if (!permissionsResult.success) {
        return { success: false, error: permissionsResult.error };
      }

      const { isOwner } = permissionsResult.data;
      
      // SOMENTE o dono pode desativar
      const canDeactivate = isOwner;
      
      return {
        success: true,
        canDeactivate,
        reason: canDeactivate ? null : 'Apenas o proprietário da página pode desativar'
      };
    } catch (error) {
      console.error('Erro ao verificar permissão de desativação:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se o usuário pode visualizar informações financeiras
  async canViewFinancial(userId, pageId) {
    try {
      const permissionsResult = await this.checkUserPermissions(userId, pageId);
      if (!permissionsResult.success) {
        return { success: false, error: permissionsResult.error };
      }

      const { isOwner, role, permissions } = permissionsResult.data;
      
      // Owner sempre pode ver, colaborador precisa ter permissão financeira
      const canView = isOwner || 
                     role === 'lawyer' || 
                     role === 'financial';
      
      return {
        success: true,
        canView,
        reason: canView ? null : 'Acesso financeiro não autorizado para este perfil'
      };
    } catch (error) {
      console.error('Erro ao verificar permissão financeira:', error);
      return { success: false, error: error.message };
    }
  },

  // Obter páginas que o usuário pode visualizar informações financeiras
  async getPagesWithFinancialAccess(userId) {
    try {
      console.log('🔍 getPagesWithFinancialAccess: Buscando páginas com acesso financeiro para:', userId);

      // Buscar páginas próprias
      console.log('📄 getPagesWithFinancialAccess: Buscando páginas próprias...');
      const ownPagesResult = await lawyerPageService.getPagesByUser(userId);
      console.log('📊 getPagesWithFinancialAccess: Resultado páginas próprias:', ownPagesResult);
      
      let accessiblePages = [];
      
      if (ownPagesResult.success) {
        console.log(`✅ getPagesWithFinancialAccess: ${ownPagesResult.data.length} páginas próprias encontradas`);
        // Todas as páginas próprias têm acesso financeiro
        accessiblePages = ownPagesResult.data.map(page => ({
          ...page,
          accessType: 'owner',
          role: 'owner'
        }));
        console.log('📋 getPagesWithFinancialAccess: Páginas próprias processadas:', accessiblePages.map(p => ({
          id: p.id,
          nome: p.nomePagina,
          accessType: p.accessType
        })));
      } else {
        console.log('❌ getPagesWithFinancialAccess: Erro ao buscar páginas próprias:', ownPagesResult.error);
      }

      // Buscar colaborações com acesso financeiro
      console.log('🤝 getPagesWithFinancialAccess: Buscando colaborações...');
      const collaborationsResult = await this.getCollaboratorAccess(userId);
      console.log('📊 getPagesWithFinancialAccess: Resultado colaborações:', collaborationsResult);
      
      if (collaborationsResult.success) {
        console.log(`🤝 getPagesWithFinancialAccess: ${collaborationsResult.data.length} colaborações encontradas`);
        for (const collaboration of collaborationsResult.data) {
          console.log('🔍 getPagesWithFinancialAccess: Analisando colaboração:', {
            pageId: collaboration.pageId,
            role: collaboration.role,
            permissions: collaboration.permissions
          });
          
          // Verificar se tem permissão financeira
          if (collaboration.role === 'lawyer' || 
              collaboration.role === 'financial') {
            
            console.log('✅ getPagesWithFinancialAccess: Colaboração tem acesso financeiro');
            
            // Buscar dados da página
            const pageResult = await lawyerPageService.getPageById(collaboration.pageId);
            if (pageResult.success) {
              console.log('📄 getPagesWithFinancialAccess: Dados da página colaborativa carregados:', pageResult.data.id);
              accessiblePages.push({
                ...pageResult.data,
                accessType: 'collaboration',
                role: collaboration.role,
                permissions: collaboration.permissions
              });
            } else {
              console.log('❌ getPagesWithFinancialAccess: Erro ao carregar dados da página colaborativa:', pageResult.error);
            }
          } else {
            console.log('❌ getPagesWithFinancialAccess: Colaboração sem acesso financeiro');
          }
        }
      } else {
        console.log('❌ getPagesWithFinancialAccess: Erro ao buscar colaborações:', collaborationsResult.error);
      }

      console.log('✅ getPagesWithFinancialAccess: Total de páginas com acesso financeiro encontradas:', accessiblePages.length);
      console.log('📋 getPagesWithFinancialAccess: Resumo final:', accessiblePages.map(p => ({
        id: p.id,
        nome: p.nomePagina,
        accessType: p.accessType,
        role: p.role
      })));
      
      return { success: true, data: accessiblePages };
    } catch (error) {
      console.error('❌ getPagesWithFinancialAccess: Erro ao buscar páginas com acesso financeiro:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar perfil de colaborador
  async updateCollaboratorRole(collaborationId, newRole, userId) {
    try {
      console.log('🔄 Atualizando perfil do colaborador:', collaborationId, 'para role:', newRole);

      // Verificar se o usuário é o dono da colaboração
      const collabRef = doc(db, 'collaborations', collaborationId);
      const collabSnap = await getDoc(collabRef);
      
      if (!collabSnap.exists()) {
        return { success: false, error: 'Colaboração não encontrada' };
      }
      
      const collabData = collabSnap.data();
      
      if (collabData.ownerUserId !== userId) {
        return { success: false, error: 'Apenas o proprietário pode alterar perfis' };
      }

      // Definir permissões baseadas no novo role
      let permissions = [];
      switch (newRole) {
        case 'lawyer':
          permissions = ['clients', 'appointments', 'financial'];
          break;
        case 'intern':
          permissions = ['clients', 'appointments'];
          break;
        case 'financial':
          permissions = ['financial'];
          break;
        default:
          return { success: false, error: 'Role inválido' };
      }

      // Atualizar a colaboração
      await updateDoc(collabRef, {
        role: newRole,
        permissions: permissions,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Perfil do colaborador atualizado com sucesso');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil do colaborador:', error);
      return { success: false, error: error.message };
    }
  },

  // Excluir convite enviado
  async deleteInvite(inviteId) {
    try {
      await deleteDoc(doc(db, 'collaboration_invites', inviteId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir convite:', error);
      return { success: false, error: error.message };
    }
  }
};

// Exportações nomeadas
export {
  userService,
  clientService,
  chatService,
  calendarFirestore,
  lawyerPageService,
  appointmentService,
  financialService,
  collaborationService
};

// Exportação padrão
export default {
  userService,
  clientService,
  chatService,
  calendarFirestore,
  lawyerPageService,
  appointmentService,
  financialService,
  collaborationService
};
