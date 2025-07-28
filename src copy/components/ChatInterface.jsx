import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToAI, generateFirstQuestion, generateNextQuestion, generateFinalResult, validateUserInput } from '../services/openaiService';
import { generateSimpleFinalResult } from '../services/simpleFallbackService';
import { loadPromptContent } from '../services/promptService';
import { chatStorageService } from '../services/chatStorageService';
import { useAuth } from '../contexts/AuthContext';
import { promptRequiresDocument, promptCanBenefitFromDocument, generateDocumentRequestMessage, generateInitialDocumentMessage } from '../services/documentService';
import { replicaWorkflowService, shouldUseReplicaWorkflow } from '../services/replicaWorkflowService';
import { handleReplicaWorkflowWithFallback } from '../services/replicaFallbackPatch';
import DocumentUpload from './DocumentUpload';
import AttachedDocument from './AttachedDocument';

// Função utilitária para normalizar timestamps de diferentes fontes
const normalizeTimestamp = (timestamp) => {
  if (timestamp instanceof Date) {
    return timestamp;
  } else if (timestamp && typeof timestamp.toDate === 'function') {
    // Firestore Timestamp
    return timestamp.toDate();
  } else if (timestamp && typeof timestamp === 'string') {
    // String ISO
    return new Date(timestamp);
  } else if (timestamp && typeof timestamp === 'number') {
    // Unix timestamp
    return new Date(timestamp);
  } else {
    // Fallback para timestamp atual
    return new Date();
  }
};

const ChatInterface = ({ promptType, onBack, onClose, existingChat = null, onBackToHistory, onChatCreated, onChatUpdated, onChatDeleted }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [promptContent, setPromptContent] = useState('');
  const [collectedData, setCollectedData] = useState([]);
  const [conversationPhase, setConversationPhase] = useState('questioning'); // 'questioning', 'ready', 'generating'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentChatId, setCurrentChatId] = useState(existingChat?.id || null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [chatTitle, setChatTitle] = useState(existingChat?.title || '');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  
  // Estados para gerenciamento de documentos
  const [attachedDocuments, setAttachedDocuments] = useState(existingChat?.attachedDocuments || []);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [documentRequired, setDocumentRequired] = useState(false);
  
  // Estados específicos para o fluxo da Réplica
  const [isReplicaWorkflow, setIsReplicaWorkflow] = useState(false);
  const [replicaState, setReplicaState] = useState(null);
  const [replicaPhase, setReplicaPhase] = useState('init'); // 'init', 'document_upload', 'section_work', 'completion'
  
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  // Extrair número total de perguntas de uma mensagem ou array de mensagens
  const extractTotalQuestions = (input) => {
    if (!input) return 0;
    
    // Se for um array de mensagens, pegar a primeira mensagem do assistente
    if (Array.isArray(input)) {
      if (input.length === 0) return 0;
      const firstMessage = input[0];
      if (firstMessage && firstMessage.role === 'assistant' && firstMessage.content) {
        input = firstMessage.content;
      } else {
        return 0;
      }
    }
    
    // Se não for uma string, retornar 0
    if (typeof input !== 'string') return 0;
    
    // Procurar por padrões como "4 perguntas", "3 perguntas direcionadas", etc.
    const patterns = [
      /(\d+)\s*perguntas?\s*que\s*serão\s*feitas/i,
      /(\d+)\s+perguntas/i,
      /através\s+de\s+(\d+)\s+perguntas/i,
      /farei\s+(\d+)\s+perguntas/i,
      /(\d+)\s+perguntas\s+direcionadas/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 0;
  };

  // Função para extrair número da pergunta atual
  const extractCurrentQuestionNumber = (message) => {
    // Procurar por padrões como "Pergunta 1 de 4:", "Pergunta 2:"
    const patterns = [
      /pergunta\s+(\d+)\s+de\s+\d+/i,
      /pergunta\s+(\d+):/i,
      /(\d+)\s*[º°]\s*pergunta/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return null;
  };

  // Função para extrair número da pergunta atual de um array de mensagens
  const extractCurrentQuestionFromMessages = (messages) => {
    if (!messages || !Array.isArray(messages)) return 0;
    
    // Procurar pela última mensagem do assistente que contenha número da pergunta
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'assistant' && message.content) {
        const questionNumber = extractCurrentQuestionNumber(message.content);
        if (questionNumber) {
          return questionNumber;
        }
      }
    }
    
    return 1; // Fallback para primeira pergunta
  };

  // Função para voltar ao histórico (fallback)
  const handleBackToHistory = () => {
    if (onBackToHistory) {
      onBackToHistory();
    } else {
      console.warn('onBackToHistory não definido');
      // Fallback - tentar navegar para história se possível
      if (onBack) {
        onBack();
      }
    }
  };

  // Carregar conteúdo do prompt e inicializar chat com primeira pergunta
  useEffect(() => {
    console.log('🔄 useEffect de inicialização executado:', {
      isInitializing,
      isInitialized,
      existingChatId: existingChat?.id,
      currentChatId,
      messagesLength: messages.length
    });
    
    // Não reinicializar se já está inicializando ou foi inicializado
    if (isInitializing || isInitialized) {
      if (existingChat && currentChatId !== existingChat.id) {
        // É um chat diferente, permitir reinicialização
        console.log('🔄 Chat diferente detectado, reinicializando...');
        setIsInitialized(false);
        setIsInitializing(false);
      } else if (!existingChat && currentChatId) {
        // Já tem um chat em andamento, não reinicializar
        console.log('✋ Chat em andamento, não reinicializar');
        return;
      } else {
        console.log('✋ Já inicializado/inicializando, não reinicializar');
        return;
      }
    }
    
    const initializeChat = async () => {
      setIsInitializing(true);
      setIsLoading(true);
      
      try {
        console.log('Inicializando chat...', { user: user?.uid, existingChat: !!existingChat, currentChatId });
        
        // Se é um chat existente, carregar os dados
        if (existingChat) {
          console.log('Carregando chat existente:', {
            id: existingChat.id,
            title: existingChat.title,
            messagesCount: existingChat.messages?.length || 0,
            collectedDataCount: existingChat.collectedData?.length || 0,
            conversationPhase: existingChat.conversationPhase
          });

          // Normalizar mensagens para garantir que timestamps sejam válidos
          const normalizedMessages = (existingChat.messages || []).map(msg => ({
            ...msg,
            timestamp: normalizeTimestamp(msg.timestamp)
          }));

          console.log('Mensagens normalizadas:', normalizedMessages);

          // PRIMEIRO: Verificar se as mensagens normalizadas não estão vazias
          if (normalizedMessages.length === 0) {
            console.warn('⚠️ PROBLEMA: Mensagens normalizadas estão vazias!');
          }

          // Definir mensagens PRIMEIRO antes de qualquer operação
          console.log('🔄 Definindo mensagens no state...');
          setMessages(normalizedMessages);
          
          // Log imediatamente após setMessages
          console.log('Estado das mensagens após setMessages:', {
            messagesLength: normalizedMessages.length,
            firstMessage: normalizedMessages[0] || null,
            lastMessage: normalizedMessages[normalizedMessages.length - 1] || null
          });
          
          setCollectedData(existingChat.collectedData || []);
          setConversationPhase(existingChat.conversationPhase || 'questioning');
          setCurrentChatId(existingChat.id);
          setChatTitle(existingChat.title || '');
          
          // Extrair número total de perguntas das mensagens existentes
          const totalQuestions = extractTotalQuestions(normalizedMessages);
          if (totalQuestions > 0) {
            setTotalQuestions(totalQuestions);
          }
          
          // Extrair número da pergunta atual
          const currentQuestion = extractCurrentQuestionFromMessages(normalizedMessages);
          if (currentQuestion > 0) {
            setCurrentQuestionNumber(currentQuestion);
          }
          
          console.log('Chat existente carregado com sucesso:', {
            messagesLoaded: normalizedMessages.length,
            collectedDataLoaded: existingChat.collectedData?.length || 0,
            currentPhase: existingChat.conversationPhase,
            totalQuestions: totalQuestions,
            currentQuestion: currentQuestion
          });
          
          setIsInitialized(true);
          
          // Carregar conteúdo do prompt
          const content = await loadPromptContent(existingChat.promptType.id);
          setPromptContent(content);
          
          setIsLoading(false);
          setIsInitializing(false);
          return;
        }

        // Novo chat - carregar conteúdo do arquivo de prompt
        const content = await loadPromptContent(promptType.id);
        setPromptContent(content);

        // Verificar se é um fluxo de Réplica
        const isReplica = shouldUseReplicaWorkflow(promptType);
        setIsReplicaWorkflow(isReplica);

        let welcomeMessage;

        if (isReplica) {
          // Inicializar fluxo específico da Réplica
          console.log('🔄 Inicializando fluxo específico da Réplica');
          
          try {
            const workflowInit = replicaWorkflowService.initializeWorkflow();
            const currentState = replicaWorkflowService.getCurrentState();
            
            console.log('✅ Workflow inicializado:', {
              phase: workflowInit.phase,
              nextStep: workflowInit.nextStep,
              currentState: currentState
            });
            
            setReplicaState(currentState);
            setReplicaPhase(workflowInit.phase);
            
            welcomeMessage = {
              id: 1,
              role: 'assistant',
              content: workflowInit.message,
              timestamp: new Date()
            };

            setMessages([welcomeMessage]);
            setDocumentRequired(true);
            setShowDocumentUpload(true);
          } catch (replicaError) {
            console.error('❌ Erro ao inicializar Réplica:', replicaError);
            // Fallback para fluxo normal se falhar
            setIsReplicaWorkflow(false);
            
            welcomeMessage = {
              id: 1,
              role: 'assistant',
              content: `❌ Erro ao inicializar fluxo da Réplica: ${replicaError.message}\n\nUsando fluxo padrão.`,
              timestamp: new Date()
            };
            setMessages([welcomeMessage]);
          }
        } else {
          // Gerar primeira pergunta baseada no prompt (fluxo normal)
          const firstQuestion = await generateFirstQuestion(promptType, content);
        
          if (firstQuestion.success) {
            welcomeMessage = {
              id: 1,
              role: 'assistant',
              content: firstQuestion.message,
              timestamp: new Date()
            };
          } else {
            // Fallback caso a primeira pergunta falhe - criar mensagem completa e organizada
            const requiresDoc = promptRequiresDocument(promptType);
            const canBenefit = promptCanBenefitFromDocument(promptType);
            
            let fullMessage = `# 🤖 ${promptType.name}

Olá! Sou seu assistente jurídico especializado em **${promptType.name}**.

## 📋 Sobre este Assistente
${promptType.description}

## 🎯 Como Funciona
Vou coletar informações necessárias através de perguntas direcionadas para gerar o melhor resultado possível para seu caso.`;

            // Adicionar seção de documentos se necessário
            if (requiresDoc) {
              fullMessage += `\n\n## 📄 **DOCUMENTO OBRIGATÓRIO**
${generateInitialDocumentMessage(promptType)}

⚠️ **Importante:** Este assistente precisa de um documento para funcionar corretamente. Por favor, prepare o documento antes de prosseguir.`;
            } else if (canBenefit) {
              fullMessage += `\n\n## 📎 **Documentos Opcionais**
💡 **Dica:** Este assistente funciona melhor com documentos de apoio. 

Se você tiver documentos relacionados ao caso (petições, decisões, contratos, etc.), pode anexá-los para uma análise mais detalhada e precisa.`;
            }

            fullMessage += `\n\n## 🚀 Vamos Começar!
Para iniciar, me conte sobre o contexto do seu caso e o que você precisa que eu faça especificamente com relação a **${promptType.name}**.

---
*Assistente powered by BIPETech*`;

            welcomeMessage = {
              id: 1,
              role: 'assistant',
              content: fullMessage,
              timestamp: new Date()
            };
          }

          setMessages([welcomeMessage]);
        }

        // Configurar estado de upload de documentos (sem criar mensagens adicionais)
        if (!existingChat) {
          checkDocumentRequirement(promptType);
        }

        // Se usuário está autenticado, criar chat no Firestore
        if (user) {
          try {
            console.log('Usuário autenticado, criando chat no Firestore:', user.uid);
            const newChatTitle = `${promptType.name} - ${new Date().toLocaleDateString()}`;
            const createResult = await chatStorageService.createChat(promptType, newChatTitle);
            
            console.log('Resultado da criação do chat:', createResult);
            
            if (createResult.success) {
              setCurrentChatId(createResult.id);
              setChatTitle(newChatTitle);
              setMessages([welcomeMessage]);
              
              // Salvar primeira mensagem no Firestore
              await chatStorageService.saveProgress(
                createResult.id,
                [welcomeMessage],
                [],
                'questioning',
                []
              );
              console.log('Chat criado com sucesso no Firestore:', createResult.id);
              
              // Notificar componente pai sobre criação do chat
              if (onChatCreated) {
                onChatCreated(createResult.id);
              }
            } else {
              // Se falhar ao criar no Firestore, continuar em modo offline
              console.warn('Erro ao criar chat no Firestore, continuando em modo offline:', createResult.error);
              setCurrentChatId('offline-' + Date.now());
              setChatTitle(`${promptType.name} - ${new Date().toLocaleDateString()}`);
              setMessages([welcomeMessage]);
            }
          } catch (error) {
            console.warn('Erro ao criar chat no Firestore, continuando em modo offline:', error);
            setCurrentChatId('offline-' + Date.now());
            setChatTitle(`${promptType.name} - ${new Date().toLocaleDateString()}`);
            setMessages([welcomeMessage]);
          }
        } else {
          // Usuário não autenticado - modo offline
          console.log('Usuário não autenticado, iniciando chat em modo offline');
          setCurrentChatId('offline-' + Date.now());
          setChatTitle(`${promptType.name} - ${new Date().toLocaleDateString()}`);
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Erro ao inicializar chat:', error);
        setIsLoading(false);
        setIsInitializing(false);
      }
      
      setIsInitialized(true);
      setIsLoading(false);
      setIsInitializing(false);
    };

    initializeChat();
  }, [promptType, user, existingChat]);

  // Atualizar título do chat quando existingChat.title muda
  useEffect(() => {
    if (existingChat && existingChat.title) {
      setChatTitle(existingChat.title);
    }
  }, [existingChat?.title]);

  // Extrair número total de perguntas da primeira mensagem da IA
  useEffect(() => {
    if (messages.length > 0 && !totalQuestions) {
      const firstAssistantMessage = messages.find(msg => msg.role === 'assistant');
      if (firstAssistantMessage) {
        const total = extractTotalQuestions(firstAssistantMessage.content);
        if (total) {
          setTotalQuestions(total);
        }
      }
    }
  }, [messages, totalQuestions]);

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Salvar chat quando usuário se autentica (para chats que começaram offline)
  useEffect(() => {
    const migrateOfflineChat = async () => {
      if (user && currentChatId && currentChatId.startsWith('offline-') && messages.length > 0 && isInitialized) {
        try {
          console.log('Migrando chat offline para Firestore...', currentChatId);
          const chatTitle = `${promptType.name} - ${new Date().toLocaleDateString()}`;
          const createResult = await chatStorageService.createChat(promptType, chatTitle);
          
          if (createResult.success) {
            console.log('Chat offline migrado com sucesso:', createResult.id);
            setCurrentChatId(createResult.id);
            
            // Salvar todas as mensagens existentes
            await chatStorageService.saveProgress(
              createResult.id,
              messages,
              collectedData,
              conversationPhase,
              attachedDocuments
            );
            
            // Notificar componente pai sobre criação do chat
            if (onChatCreated) {
              onChatCreated(createResult.id);
            }
          }
        } catch (error) {
        console.error('Erro ao migrar chat offline:', error);
        }
      }
    };

    migrateOfflineChat();
  }, [user, currentChatId, messages.length, isInitialized]);

  // useEffect para monitorar mudanças nas mensagens para debug
  useEffect(() => {
    console.log('DEBUG: Mensagens mudaram:', {
      length: messages.length,
      chatId: currentChatId,
      isInitialized,
      isLoading,
      existingChatId: existingChat?.id,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content.substring(0, 100) + '...',
        timestamp: m.timestamp
      }))
    });
    
    // Log específico quando mensagens são resetadas
    if (messages.length === 0 && existingChat && existingChat.messages && existingChat.messages.length > 0) {
      console.warn('⚠️ PROBLEMA: Mensagens foram resetadas! existingChat tem mensagens mas state está vazio');
    }
  }, [messages, currentChatId, isInitialized, isLoading, existingChat]);

  // Debug: Log dos dados coletados
  useEffect(() => {
    console.log('🔍 DEBUG - Estado atual:', {
      conversationPhase,
      collectedDataLength: collectedData?.length || 0,
      currentQuestionIndex,
      messagesLength: messages?.length || 0,
      promptType: promptType?.name
    });
  }, [conversationPhase, collectedData, currentQuestionIndex, messages, promptType]);

  // Função para renomear chat
  const handleRenameChat = async (newTitle) => {
    if (!currentChatId || currentChatId.startsWith('offline-')) {
      console.log('Chat offline, não pode ser renomeado no Firestore');
      setChatTitle(newTitle);
      setIsRenamingChat(false);
      return;
    }

    try {
      const result = await chatStorageService.updateChatTitle(currentChatId, newTitle);
      
      if (result.success) {
        setChatTitle(newTitle);
        console.log('Chat renomeado com sucesso:', newTitle);
        
        // Notificar componente pai sobre atualização do chat
        if (onChatUpdated) {
          onChatUpdated(currentChatId, { title: newTitle });
        }
      } else {
        console.error('Erro ao renomear chat:', result.error);
      }
    } catch (error) {
      console.error('Erro ao renomear chat:', error);
    }
    
    setIsRenamingChat(false);
  };

  // Função para excluir chat
  const handleDeleteChat = async () => {
    if (!currentChatId || currentChatId.startsWith('offline-')) {
      console.log('Chat offline, não pode ser excluído do Firestore');
      if (onChatDeleted) {
        onChatDeleted(currentChatId);
      }
      if (onBack) {
        onBack();
      }
      return;
    }

    try {
      const result = await chatStorageService.deleteChat(currentChatId);
      
      if (result.success) {
        console.log('Chat excluído com sucesso:', currentChatId);
        
        // Notificar componente pai sobre exclusão do chat
        if (onChatDeleted) {
          onChatDeleted(currentChatId);
        }
        
        // Voltar para a tela anterior
        if (onBack) {
          onBack();
        }
      } else {
        console.error('Erro ao excluir chat:', result.error);
      }
    } catch (error) {
      console.error('Erro ao excluir chat:', error);
    }
    
    setShowDeleteConfirmation(false);
  };

  // Função para cancelar exclusão
  const cancelDeleteChat = () => {
    setShowDeleteConfirmation(false);
  };

  // Função para iniciar renomeação
  const startRenameChat = () => {
    setNewChatTitle(chatTitle);
    setIsRenamingChat(true);
  };

  // Função para cancelar renomeação
  const cancelRenameChat = () => {
    setIsRenamingChat(false);
    setNewChatTitle('');
  };

  // Função para confirmar renomeação
  const confirmRenameChat = () => {
    if (newChatTitle.trim()) {
      handleRenameChat(newChatTitle.trim());
    }
  };

  // Função específica para processar o fluxo da Réplica
  const handleReplicaWorkflow = async (userMessage) => {
    console.log('📝 Processando fluxo da Réplica:', {
      phase: replicaPhase,
      userMessage: userMessage.content,
      state: replicaState,
      documentsCount: attachedDocuments.length
    });

    const userInput = userMessage.content.toLowerCase().trim();
    
    try {
      console.log('🔍 Debug - Estado atual do fluxo:', {
        replicaPhase,
        attachedDocumentsLength: attachedDocuments.length,
        replicaStateExists: !!replicaState,
        currentSection: replicaState?.currentSection
      });
      
      // Verificar se replicaWorkflowService está disponível
      if (!replicaWorkflowService) {
        console.error('❌ replicaWorkflowService não está disponível!');
        return {
          success: false,
          message: '❌ Erro de configuração: Serviço da Réplica não foi carregado corretamente. Recarregue a página e tente novamente.'
        };
      }
      
      console.log('✅ replicaWorkflowService disponível');
      
      // Verificar métodos disponíveis
      const availableMethods = Object.getOwnPropertyNames(replicaWorkflowService).filter(name => typeof replicaWorkflowService[name] === 'function');
      console.log('🔧 Métodos disponíveis no serviço:', availableMethods);
      
      // Fase de upload de documentos
      if (replicaPhase === 'document_upload') {
        console.log('📄 Processando fase de upload de documentos...');
        
        if (attachedDocuments.length === 0) {
          console.log('⚠️ Nenhum documento anexado, retornando mensagem de aviso');
          return {
            success: true,
            message: '⚠️ **Documentos ainda não foram anexados**\n\nPor favor, use o botão "📎 Anexar Documentos" para carregar os documentos obrigatórios (petição inicial, contestação, etc.) antes de prosseguir.'
          };
        }

        // Processar documentos carregados
        console.log('⚙️ Processando documentos com replicaWorkflowService...');
        
        // Verificar se o método existe
        if (typeof replicaWorkflowService.processDocuments !== 'function') {
          console.error('❌ Método processDocuments não existe no serviço!');
          return {
            success: false,
            message: '❌ Erro interno: Método de processamento de documentos não disponível.'
          };
        }
        
        const processResult = replicaWorkflowService.processDocuments(attachedDocuments);
        
        console.log('📊 Resultado do processamento de documentos:', {
          success: processResult.success,
          message: processResult.message,
          hasMessage: !!processResult.message
        });
        
        if (processResult.success) {
          console.log('✅ Documentos processados, avançando para section_work...');
          setReplicaPhase('section_work');
          setReplicaState(replicaWorkflowService.getCurrentState());
          return {
            success: true,
            message: processResult.message
          };
        } else {
          console.log('❌ Falha no processamento de documentos');
          return {
            success: true,
            message: processResult.message
          };
        }
      }
      
      // Fase de trabalho em seções
      if (replicaPhase === 'section_work') {
        console.log('🔧 Processando fase de trabalho em seções...');
        console.log('👤 Input do usuário:', userInput);
        
        // Verificar se o usuário confirmou
        console.log('🔍 Processando confirmação do usuário...');
        const confirmation = replicaWorkflowService.processUserConfirmation(
          userInput, 
          replicaState?.currentSection || 0
        );
        
        console.log('📝 Resultado da confirmação:', {
          confirmed: confirmation.confirmed,
          message: confirmation.message
        });
        
        if (confirmation.confirmed) {
          // Gerar seção específica
          const sectionIndex = replicaState?.currentSection || 0;
          console.log('🔧 Gerando seção da Réplica:', sectionIndex);
          
          console.log('📝 Gerando prompt da seção...');
          const sectionPrompt = replicaWorkflowService.generateSectionPrompt(sectionIndex);
          console.log('� Prompt da seção gerado:', {
            length: sectionPrompt.length,
            preview: sectionPrompt.substring(0, 200) + '...'
          });
          
          try {
            console.log('🤖 Chamando IA para gerar seção...');
            // Formatar prompt como mensagem para a IA
            const aiMessages = [
              {
                role: 'user',
                content: sectionPrompt
              }
            ];
            
            console.log('📤 Enviando prompt formatado para IA:', {
              messageLength: sectionPrompt.length,
              documentsIncluded: attachedDocuments.length
            });
            
            // Usar o serviço OpenAI para gerar a seção
            const aiResponse = await sendMessageToAI(aiMessages);
            
            console.log('🤖 Resposta da IA recebida:', {
              success: aiResponse?.success,
              hasMessage: !!aiResponse?.message,
              messageLength: aiResponse?.message?.length || 0,
              messageType: typeof aiResponse?.message
            });
            
            if (aiResponse && aiResponse.success && aiResponse.message) {
              // Validar conteúdo da seção
              const validation = replicaWorkflowService.validateSectionContent(
                aiResponse.message, 
                sectionIndex
              );
              
              let responseMessage = aiResponse.message;
              
              // Adicionar avisos se houver
              if (validation.warnings && validation.warnings.length > 0) {
                responseMessage += '\n\n⚠️ **Avisos:**\n' + 
                  validation.warnings.map(w => `• ${w}`).join('\n');
              }
              
              // Avançar para próxima seção
              const nextStep = replicaWorkflowService.advanceToNextSection();
              setReplicaState(replicaWorkflowService.getCurrentState());
              
              if (nextStep.completed) {
                setReplicaPhase('completion');
                responseMessage += '\n\n' + nextStep.message;
              } else {
                responseMessage += '\n\n' + nextStep.message;
              }
              
              return {
                success: true,
                message: responseMessage
              };
            } else {
              console.error('❌ Resposta da IA inválida:', aiResponse);
              return {
                success: true,
                message: '❌ Erro ao gerar seção. A IA não retornou uma resposta válida. Tente novamente ou digite "ALTERAR" para modificar documentos.'
              };
            }
          } catch (aiError) {
            console.error('❌ Erro na chamada para IA:', aiError);
            return {
              success: true,
              message: `❌ Erro ao comunicar com a IA: ${aiError.message}. Verifique sua conexão ou tente novamente.`
            };
          }
        } else {
          return {
            success: true,
            message: confirmation.message
          };
        }
      }
      
      // Fase de conclusão
      if (replicaPhase === 'completion') {
        return {
          success: true,
          message: '✅ **Réplica Concluída**\n\nTodas as seções foram elaboradas com sucesso. A réplica está pronta para revisão e uso.',
          isResult: true
        };
      }
      
      // Estado inválido
      return {
        success: true,
        message: '❌ Estado inválido do fluxo. Reiniciando processo...'
      };
      
    } catch (error) {
      console.error('❌ Erro no fluxo da Réplica:', error);
      console.error('🔍 Stack trace:', error.stack);
      console.error('🔍 Detalhes do erro:', {
        message: error.message,
        name: error.name,
        replicaPhase,
        replicaState,
        attachedDocumentsLength: attachedDocuments.length,
        userMessage: userMessage.content
      });
      return {
        success: false,
        message: `❌ Erro interno no processamento: ${error.message}\n\nDetalhes para debug:\n- Fase: ${replicaPhase}\n- Seção atual: ${replicaState?.currentSection || 'N/A'}\n- Documentos: ${attachedDocuments.length}\n- Erro: ${error.name}\n\nTente reiniciar o fluxo ou entre em contato com o suporte.`
      };
    }
  };

  // Função para enviar mensagem
  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      let response;
      
      // FLUXO ESPECÍFICO DA RÉPLICA
      if (isReplicaWorkflow) {
        console.log('🔄 Executando fluxo da Réplica...');
        
        // PRIMEIRO: Tentar usar o serviço principal diretamente
        try {
          console.log('🎯 Tentando usar serviço principal da Réplica...');
          response = await handleReplicaWorkflow(userMessage);
          console.log('✅ Serviço principal executado com sucesso');
        } catch (mainServiceError) {
          console.warn('⚠️ Serviço principal falhou, usando fallback:', mainServiceError.message);
          
          // Usar função com fallback integrado apenas como backup
          response = await handleReplicaWorkflowWithFallback(
            userMessage,
            {
              replicaPhase,
              attachedDocuments,
              setReplicaPhase,
              setReplicaState,
              replicaState
            },
            {
              sendMessageToAI
            }
          );
        }
        
        console.log('📊 Resposta do fluxo da Réplica:', {
          success: response?.success,
          hasMessage: !!response?.message,
          messageLength: response?.message?.length || 0
        });
      } else {
        // FLUXO NORMAL DOS OUTROS PROMPTS
        console.log('🔍 DEBUG - Estado da conversa:', {
          conversationPhase,
          userContent: userMessage.content,
          userContentUpper: userMessage.content.toUpperCase(),
          isGerar: userMessage.content.toUpperCase() === 'GERAR',
          collectedDataLength: collectedData.length
        });
        
        // PRIORIDADE MÁXIMA: Se o usuário digitou "GERAR", sempre gerar resultado
        if (userMessage.content.toUpperCase() === 'GERAR') {
          console.log('🎯 DETECTADO COMANDO GERAR - Gerando resultado com IA');
        
        // Tentar usar a IA real primeiro
        try {
          console.log('� Tentando gerar resultado com OpenAI...');
          response = await generateFinalResult(promptType, promptContent, collectedData, messages, attachedDocuments);
          
          if (response.success && response.message) {
            console.log('✅ Resultado gerado com IA com sucesso!');
            setConversationPhase('completed');
          } else {
            throw new Error('Resposta da IA inválida');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao usar IA, usando fallback:', error.message);
          
          // Usar fallback se a IA falhar
          response = await generateSimpleFinalResult(promptType, collectedData);
          setConversationPhase('completed');          }
        } else if (conversationPhase === 'questioning') {
          // Validar resposta do usuário
          const validation = await validateUserInput(userMessage.content, promptContent);
          
          if (validation.isValid) {
            // Adicionar dado coletado
            const newCollectedData = [...collectedData, {
              question: messages[messages.length - 1]?.content || '',
              answer: userMessage.content,
              timestamp: new Date()
            }];
            setCollectedData(newCollectedData);
            
            // Gerar próxima pergunta incluindo contexto dos documentos
            response = await generateNextQuestion(promptType, promptContent, newCollectedData, messages, attachedDocuments);
            
            if (response.success) {
              if (response.isComplete) {
                setConversationPhase('ready');
              } else {
                setCurrentQuestionIndex(prev => prev + 1);
                
                // Extrair número da pergunta atual
                const questionNumber = extractCurrentQuestionNumber(response.message);
                if (questionNumber) {
                  setCurrentQuestionNumber(questionNumber);
                }
              }
            }
          } else {
            // Resposta inválida - pedir esclarecimento
            response = {
              success: true,
              message: `${validation.error || validation.message || 'Resposta inválida'}

Por favor, reformule sua resposta de forma mais clara e detalhada.`,
              isComplete: false
            };
          }
        } else if (conversationPhase === 'ready') {
          // Gerar resultado final
          console.log('🎯 Iniciando geração do resultado final...');
          console.log('📋 Dados disponíveis:', {
            promptType: promptType?.name,
            hasPromptContent: !!promptContent,
            collectedDataLength: collectedData?.length || 0,
            messagesLength: messages?.length || 0
          });
          
          // Usuário digitou algo diferente de "GERAR"
          response = {
            success: true,
            message: 'Para gerar o resultado final, digite exatamente "GERAR" (sem aspas).',
            isComplete: false
          };
        } else {
          // Conversa já finalizada
          response = {
            success: true,
            message: 'Esta conversa já foi finalizada. O resultado final foi gerado acima.',
            isComplete: false
          };
        }
      }

      console.log('🔍 DEBUG - Response antes de processar:', {
        success: response?.success,
        hasMessage: !!response?.message,
        messageType: typeof response?.message,
        messageLength: response?.message?.length || 0,
        messagePreview: response?.message?.substring(0, 100) || 'N/A'
      });

      if (response.message) {
        console.log('✅ Message válida encontrada, criando mensagem...', {
          success: response.success,
          messageLength: response.message.length
        });
        
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          isResult: response.isResult || false,
          isFallback: response.isFallback || false,
          isError: !response.success // Marcar como erro se success for false
        };

        console.log('📝 Mensagem criada:', {
          id: aiMessage.id,
          role: aiMessage.role,
          hasContent: !!aiMessage.content,
          contentType: typeof aiMessage.content,
          contentLength: aiMessage.content?.length || 0,
          isError: aiMessage.isError
        });

        const finalMessages = [...updatedMessages, aiMessage];
        console.log('📦 Array final de mensagens:', finalMessages.length, 'items');
        setMessages(finalMessages);

        // Salvar no Firestore se usuário estiver autenticado e não for chat offline
        if (user && currentChatId && !currentChatId.startsWith('offline-')) {
          try {
            await chatStorageService.saveProgress(
              currentChatId,
              finalMessages,
              collectedData,
              conversationPhase,
              attachedDocuments
            );
          } catch (error) {
            console.warn('Erro ao salvar progresso no Firestore:', error);
          }
        }
      } else if (response.success && !response.message) {
        // Caso onde success = true mas message está undefined
        console.error('❌ ERRO CRÍTICO: Response.success = true mas message está undefined!');
        console.error('🔍 Response completa:', response);
        
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '❌ Erro interno no processamento. Tente novamente ou reinicie o fluxo.',
          timestamp: new Date(),
          isError: true
        };

        setMessages([...updatedMessages, errorMessage]);
      } else {
        // Erro na API - mensagem específica baseada no tipo de erro
        let errorContent = 'Desculpe, ocorreu um erro ao processar sua resposta. Tente novamente ou reformule sua resposta.';
        
        if (response.error === 'rate_limit') {
          errorContent = 'Muitas solicitações. Aguarde um momento antes de tentar novamente.';
        } else if (response.error === 'context_length') {
          errorContent = 'A conversa ficou muito longa. Vamos recomeçar com um novo chat.';
        } else if (response.error === 'invalid_request') {
          errorContent = 'Houve um problema com sua solicitação. Tente reformular sua pergunta.';
        }

        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
          isError: true
        };

        setMessages([...updatedMessages, errorMessage]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Mensagem de erro mais específica baseada no tipo de erro
      let errorContent = 'Desculpe, ocorreu um erro inesperado. Tente novamente.';
      
      if (error.message.includes('API Key')) {
        errorContent = `🔑 ${error.message}\n\nPara resolver:\n1. Configure sua API Key da OpenAI no arquivo .env\n2. Reinicie o servidor\n3. Consulte o arquivo OPENAI_API_SETUP.md para instruções detalhadas`;
      } else if (error.message.includes('403')) {
        errorContent = `🚫 Acesso negado à API da OpenAI.\n\nPossíveis causas:\n• API Key inválida ou expirada\n• Conta sem créditos\n• Limites excedidos\n\nVerifique sua conta em: https://platform.openai.com/`;
      } else if (error.message.includes('429')) {
        errorContent = `⏱️ Muitas requisições enviadas.\n\nAguarde alguns minutos antes de tentar novamente.`;
      } else if (error.message.includes('400')) {
        errorContent = `❌ Erro na requisição.\n\nTente reformular sua mensagem ou reiniciar a conversa.`;
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true
      };

      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para pressionar Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Função de emergência para garantir que sempre retornamos algo válido
  const generateEmergencyResult = (promptType, collectedData) => {
    console.log('🚨 Usando função de emergência para geração de resultado');
    
    const now = new Date().toLocaleString('pt-BR');
    const typeName = promptType?.name || 'Documento Jurídico';
    
    let dataSection = '';
    if (collectedData && Array.isArray(collectedData) && collectedData.length > 0) {
      dataSection = collectedData.map((item, index) => 
        `${index + 1}. ${item.answer || 'Não informado'}`
      ).join('\n');
    } else {
      dataSection = 'Nenhuma informação específica coletada.';
    }
    
    return {
      success: true,
      message: `# ${typeName}

## Resultado Gerado em ${now}

### Informações Processadas:
${dataSection}

### Status:
✅ Processamento concluído com sucesso

### Observações:
Este documento foi gerado automaticamente pelo sistema DireitoHub.

---
*Sistema operacional e funcionando corretamente*`,
      isResult: true,
      isFallback: true
    };
  };

  // Função para processar documento anexado
  const handleDocumentProcessed = (documentData) => {
    if (documentData.error) {
      // Mostrar erro como mensagem do assistente
      const errorMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `❌ **Erro ao processar documento**: ${documentData.error}

Por favor, tente novamente com um arquivo válido (.txt ou .docx, máximo 10MB).`,
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Adicionar documento à lista de anexados
    const newDocument = {
      id: Date.now(),
      name: documentData.fileName, // Compatibilidade: usar 'name' como propriedade principal
      fileName: documentData.fileName, // Manter para compatibilidade
      content: documentData.content,
      fileSize: documentData.fileSize,
      fileType: documentData.fileType,
      wordCount: documentData.wordCount,
      uploadedAt: new Date()
    };

    setAttachedDocuments(prev => [...prev, newDocument]);
    setShowDocumentUpload(false);
    setDocumentRequired(false);

    // Mensagem de confirmação
    const totalDocuments = attachedDocuments.length + 1;
    const confirmationMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: `✅ **Documento anexado com sucesso!**

📄 **${documentData.fileName}** (Documento ${totalDocuments})
- Tamanho: ${(documentData.fileSize / 1024).toFixed(1)} KB
- Palavras: ${documentData.wordCount}
- Tipo: ${documentData.fileType.toUpperCase()}

${totalDocuments > 1 ? 
  `📚 **Total de documentos anexados: ${totalDocuments}**\n\nTodos os documentos serão analisados em conjunto pela IA para gerar uma resposta mais completa e fundamentada.` :
  `Agora posso analisar o conteúdo do documento.`
}

${isReplicaWorkflow ? 
  'Para prosseguir com a elaboração da réplica, confirme digitando "SIM" ou anexe mais documentos se necessário.' :
  'Prossiga com suas perguntas ou digite "GERAR" quando estiver pronto para o resultado final.'
}`,
      timestamp: new Date(),
      isDocumentConfirmation: true
    };

    setMessages(prev => [...prev, confirmationMessage]);

    // Salvar progresso se usuário autenticado
    if (user && currentChatId && !currentChatId.startsWith('offline-')) {
      const updatedMessages = [...messages, confirmationMessage];
      chatStorageService.saveProgress(
        currentChatId,
        updatedMessages,
        collectedData,
        conversationPhase,
        [...attachedDocuments, newDocument]
      ).catch(error => {
        console.warn('Erro ao salvar progresso com documento:', error);
      });
    }
  };

  // Função para remover documento
  const handleRemoveDocument = (fileName) => {
    setAttachedDocuments(prev => prev.filter(doc => (doc.name || doc.fileName) !== fileName));
    
    const removalMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `🗑️ Documento "${fileName}" foi removido.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, removalMessage]);
  };

  // Função para verificar se precisa de documento (apenas configura estado, não cria mensagens)
  const checkDocumentRequirement = (promptType) => {
    if (window.DEBUG_PROMPTS) {
      console.log('🔍 ChatInterface checkDocumentRequirement chamada para:', promptType);
    }
    
    const requiresDocument = promptRequiresDocument(promptType);
    const canBenefit = promptCanBenefitFromDocument(promptType);
    
    if (window.DEBUG_PROMPTS) {
      console.log('📊 Resultados das verificações:', {
        requiresDocument,
        canBenefit,
        attachedDocumentsCount: attachedDocuments.length
      });
    }
    
    if (requiresDocument) {
      if (window.DEBUG_PROMPTS) {
        console.log('✅ Documento obrigatório detectado, configurando estados...');
      }
      setDocumentRequired(true);
      // Mostrar upload automaticamente para documentos obrigatórios
      if (attachedDocuments.length === 0) {
        setShowDocumentUpload(true);
        if (window.DEBUG_PROMPTS) {
          console.log('✅ Exibindo upload de documento');
        }
        return true;
      }
    } else if (window.DEBUG_PROMPTS) {
      console.log('ℹ️ Documento não obrigatório para este prompt');
    }
    
    return false;
  };

  // Função para processar formatação Markdown básica
  const processMarkdown = (text) => {
    if (!text) return 'Erro: conteúdo da mensagem não disponível';
    
    let processedText = text;
    
    // Escapar HTML existente para evitar XSS
    processedText = processedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    // Processar títulos #### (h4) - negrito e menor
    processedText = processedText.replace(/^#### (.+)$/gm, '<div style="font-size: 1.05em; font-weight: bold; color: #1f2937; margin-bottom: 6px; margin-top: 10px;">$1</div>');
    
    // Processar títulos ### (h3) - negrito e maior
    processedText = processedText.replace(/^### (.+)$/gm, '<div style="font-size: 1.1em; font-weight: bold; color: #1f2937; margin-bottom: 8px; margin-top: 12px;">$1</div>');
    
    // Processar títulos ## (h2) - negrito e ainda maior
    processedText = processedText.replace(/^## (.+)$/gm, '<div style="font-size: 1.2em; font-weight: bold; color: #1f2937; margin-bottom: 12px; margin-top: 16px;">$1</div>');
    
    // Processar títulos # (h1) - negrito e maior ainda
    processedText = processedText.replace(/^# (.+)$/gm, '<div style="font-size: 1.3em; font-weight: bold; color: #1f2937; margin-bottom: 12px; margin-top: 16px;">$1</div>');
    
    // Processar texto em negrito **texto** ou __texto__
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold; color: #1f2937;">$1</strong>');
    processedText = processedText.replace(/__(.*?)__/g, '<strong style="font-weight: bold; color: #1f2937;">$1</strong>');
    
    // Processar texto em itálico *texto* ou _texto_ (apenas se não faz parte de negrito)
    processedText = processedText.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em style="font-style: italic; font-weight: 600; color: #374151;">$1</em>');
    processedText = processedText.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em style="font-style: italic; font-weight: 600; color: #374151;">$1</em>');
    
    // Processar sublinhado (simulado com border-bottom)
    processedText = processedText.replace(/\+\+(.+?)\+\+/g, '<span style="border-bottom: 1px solid #374151; font-weight: 600;">$1</span>');
    
    // Processar listas com - ou * (início de linha)
    processedText = processedText.replace(/^[\-\*] (.+)$/gm, '<div style="display: flex; align-items: flex-start; margin-bottom: 4px;"><span style="color: #0ea5e9; font-weight: bold; margin-right: 8px;">•</span><span style="font-weight: 500;">$1</span></div>');
    
    // Processar listas numeradas
    processedText = processedText.replace(/^(\d+)\. (.+)$/gm, '<div style="display: flex; align-items: flex-start; margin-bottom: 4px;"><span style="color: #0ea5e9; font-weight: bold; margin-right: 8px; min-width: 20px;">$1.</span><span style="font-weight: 500;">$2</span></div>');
    
    // Processar sub-listas com espaços (duas ou mais)
    processedText = processedText.replace(/^  [\-\*] (.+)$/gm, '<div style="display: flex; align-items: flex-start; margin-bottom: 3px; margin-left: 20px;"><span style="color: #facc15; font-weight: bold; margin-right: 8px;">◦</span><span style="font-weight: 500;">$1</span></div>');
    
    // Processar blocos de código com ``` (multilinhas) - deve vir ANTES do código inline
    processedText = processedText.replace(/```([\s\S]*?)```/g, '<pre style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 8px 0; overflow-x: auto; font-family: monospace; font-size: 0.9em; color: #374151;"><code>$1</code></pre>');
    
    // Processar código inline `código` - deve vir DEPOIS dos blocos de código
    processedText = processedText.replace(/`([^`\n]+)`/g, '<code style="background-color: #f3f4f6; color: #7c3aed; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em; font-weight: 600;">$1</code>');
    
    // Processar texto destacado com ==texto==
    processedText = processedText.replace(/==(.+?)==/g, '<mark style="background-color: #fef3c7; padding: 1px 2px; border-radius: 2px; font-weight: 600;">$1</mark>');
    
    // Processar separadores horizontais ---
    processedText = processedText.replace(/^---$/gm, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 16px 0;">');
    
    // Processar quebras de linha duplas como separação de parágrafos
    processedText = processedText.replace(/\n\n+/g, '<br><br>');
    
    // Processar quebras de linha simples
    processedText = processedText.replace(/\n/g, '<br>');
    
    return processedText;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex-1">
              {isRenamingChat ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newChatTitle}
                    onChange={(e) => setNewChatTitle(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Novo título do chat"
                    autoFocus
                  />
                  <button
                    onClick={confirmRenameChat}
                    className="text-green-600 hover:text-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={cancelRenameChat}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {chatTitle}
                  </h1>
                  <button
                    onClick={startRenameChat}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Renomear chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Indicador de progresso */}
            {conversationPhase === 'questioning' && totalQuestions && (
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {currentQuestionNumber} de {totalQuestions}
              </div>
            )}
            
            {/* Botão de histórico */}
            <button
              onClick={handleBackToHistory}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="Voltar ao histórico"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {/* Botão de exclusão */}
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="text-red-600 hover:text-red-700 transition-colors"
              title="Excluir chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">💬</div>
            <p>Nenhuma mensagem ainda</p>
            <p className="text-xs mt-2">
              Chat ID: {currentChatId || 'N/A'} | 
              Inicializado: {isInitialized ? 'Sim' : 'Não'} | 
              Carregando: {isLoading ? 'Sim' : 'Não'}
            </p>
          </div>
        )}
        
        {isLoading && messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Carregando mensagens...</p>
          </div>
        )}
        
        {/* Log de debug para verificar renderização */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-100 border border-red-300 rounded p-2 mb-4 text-xs">
            <p><strong>Debug Renderização:</strong></p>
            <p>Mensagens para renderizar: {messages.length}</p>
            <p>Array de mensagens: {JSON.stringify(messages.map(m => ({id: m.id, role: m.role, content: m.content.substring(0, 50)})))}</p>
            <p>Condição renderização: {messages.length > 0 ? 'VERDADEIRA' : 'FALSA'}</p>
            <p>isInitialized: {isInitialized ? 'Sim' : 'Não'}</p>
            <p>isLoading: {isLoading ? 'Sim' : 'Não'}</p>
            <p>currentChatId: {currentChatId || 'N/A'}</p>
            <p>existingChat: {existingChat ? `ID: ${existingChat.id}` : 'N/A'}</p>
          </div>
        )}
        
        {/* Renderização das mensagens */}
        {messages.length > 0 && messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : message.isResult
                  ? 'bg-green-50 border border-green-200 text-gray-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.isResult && (
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    {message.isFallback ? 'Resultado Final (Modo Offline)' : 'Resultado Final'}
                  </span>
                  {message.isFallback && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      Configure a API OpenAI para resultados mais detalhados
                    </span>
                  )}
                </div>
              )}
              <div 
                className="whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: processMarkdown(message.content || 'Erro: conteúdo da mensagem não disponível')
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <p className={`text-xs ${
                  message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                }`}>
                  {normalizeTimestamp(message.timestamp).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
                {message.isResult && (
                  <button
                    onClick={() => navigator.clipboard.writeText(message.content)}
                    className="text-xs text-green-600 hover:text-green-800 ml-2"
                  >
                    Copiar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Área de entrada de mensagem */}
      <div className="bg-white border-t border-gray-200 p-4">
        {/* Documentos anexados */}
        {attachedDocuments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              📎 Documentos Anexados ({attachedDocuments.length} de até 10)
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {attachedDocuments.map((doc, index) => (
                <AttachedDocument
                  key={doc.id}
                  document={{...doc, index: index + 1}}
                  onRemove={handleRemoveDocument}
                  isReadOnly={conversationPhase === 'completed'}
                />
              ))}
            </div>
            {attachedDocuments.length > 1 && (
              <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                🤖 <strong>Análise conjunta:</strong> Todos os {attachedDocuments.length} documentos serão analisados em conjunto pela IA para uma resposta mais precisa e fundamentada.
              </div>
            )}
          </div>
        )}

        {/* Upload de documentos */}
        {(showDocumentUpload || documentRequired) && conversationPhase !== 'completed' && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              📄 Upload de Documento {attachedDocuments.length > 0 ? `(${attachedDocuments.length + 1}º documento)` : ''}
            </h4>
            <DocumentUpload
              onDocumentProcessed={handleDocumentProcessed}
              isLoading={isLoading}
              disabled={conversationPhase === 'completed'}
            />
            {!documentRequired && (
              <button
                onClick={() => setShowDocumentUpload(false)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancelar upload
              </button>
            )}
            {attachedDocuments.length > 0 && (
              <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                💡 <strong>Múltiplos documentos:</strong> Você pode anexar vários documentos (petição inicial, contestação, provas, etc.) que serão analisados em conjunto.
              </div>
            )}
          </div>
        )}

        {/* Botão para anexar mais documentos */}
        {!showDocumentUpload && !documentRequired && conversationPhase !== 'completed' && attachedDocuments.length < 10 && (
          <div className="mb-3">
            <button
              onClick={() => setShowDocumentUpload(true)}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
            >
              📎 {attachedDocuments.length === 0 ? 'Anexar Documento' : `Anexar Mais Documentos (${attachedDocuments.length} anexado${attachedDocuments.length > 1 ? 's' : ''})`}
            </button>
          </div>
        )}
        
        {/* Aviso quando limite de documentos é atingido */}
        {attachedDocuments.length >= 10 && conversationPhase !== 'completed' && (
          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            📄 <strong>Limite atingido:</strong> Máximo de 10 documentos anexados. Para anexar mais, remova alguns documentos primeiro.
          </div>
        )}
        {/* Instrução especial para fase de geração */}
        {conversationPhase === 'ready' && (
          <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-yellow-800 mb-1">
                  ⚡ Pronto para gerar! Digite <span className="bg-yellow-200 px-2 py-1 rounded font-mono text-yellow-900 font-bold">GERAR</span> e pressione Enter
                </p>
                <p className="text-xs text-yellow-700">
                  Palavra exata necessária para iniciar o processamento do documento
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicator durante geração */}
        {isLoading && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-800">
                {conversationPhase === 'generating' ? 'Gerando resultado...' : 'Processando...'}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || conversationPhase === 'completed'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            placeholder={
              conversationPhase === 'ready' 
                ? 'Digite GERAR para gerar o resultado...' 
                : conversationPhase === 'completed'
                ? 'Conversa finalizada'
                : 'Digite sua mensagem...'
            }
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !currentMessage.trim() || conversationPhase === 'completed'}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {conversationPhase === 'ready' && currentMessage.toUpperCase() === 'GERAR' ? (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium">Gerar</span>
              </div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar exclusão
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este chat? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteChat}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de documentos anexados */}
      {attachedDocuments.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Documentos Anexados
          </h3>
          <div className="space-y-2">
            {attachedDocuments.map(doc => (
              <AttachedDocument
                key={doc.id}
                fileName={doc.fileName}
                fileSize={doc.fileSize}
                fileType={doc.fileType}
                onRemove={() => handleRemoveDocument(doc.fileName)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;