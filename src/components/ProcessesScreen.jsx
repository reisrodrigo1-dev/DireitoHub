import React, { useState, useEffect } from 'react';
import LegalDebateModal from './LegalDebateModal';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { clientService } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { caseService } from '../firebase/firestore';
import DataJudSearchModal from './DataJudSearchModal';
import DataJudProcessDetails from './DataJudProcessDetails';
import CalendarModal from './CalendarModal';
import { temAudiencia } from '../services/calendarService';
import { processCalendarIntegration } from '../services/processCalendarIntegration';
import { appointmentService } from '../firebase/firestore';

const ProcessesScreen = () => {
  // Estado para modal de debate jurídico
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [debateProcess, setDebateProcess] = useState(null);

  // Função para salvar debate no Firestore (associado ao processo)
  const handleSaveDebate = async (debateData) => {
    // debateData: { name, side, chat, analysis, processId, processTitle }
    try {
      await addDoc(collection(getFirestore(), 'legalDebates'), {
        name: debateData.name,
        processId: debateData.processId,
        processTitle: debateData.processTitle,
        side: debateData.side,
        chat: debateData.chat,
        analysis: debateData.analysis,
        createdAt: Timestamp.now(),
      });
    } catch (e) {
      alert('Erro ao salvar debate: ' + (e?.message || e));
    }
  };
  const { user } = useAuth();
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDataJudModal, setShowDataJudModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedProcessForCalendar, setSelectedProcessForCalendar] = useState(null);
  const [showProcessDetails, setShowProcessDetails] = useState(false);
  const [processForDetails, setProcessForDetails] = useState(null);

  // Estados para associação de cliente
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [selectedProcessForAssociation, setSelectedProcessForAssociation] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [associations, setAssociations] = useState([]);

  // Estado para exibir clientes do banco na tela
  const [clientesBanco, setClientesBanco] = useState([]);
  const [clientesRawResult, setClientesRawResult] = useState(null);
  useEffect(() => {
    async function fetchAllClientsAndAppointments() {
      if (user?.uid) {
        try {
          // Buscar clientes
          const clientsResult = await clientService.getClients(user.uid);
          if (!clientsResult.success) {
            setClientesBanco([]);
            setClientesRawResult({ error: clientsResult.error });
            return;
          }
          // Buscar agendamentos
          const appointmentsResult = await appointmentService.getAppointmentsByLawyer(user.uid);
          if (!appointmentsResult.success) {
            setClientesBanco(clientsResult.data);
            setClientesRawResult(clientsResult);
            return;
          }
          // Organizar agendamentos por email do cliente
          const appointmentsByClient = {};
          appointmentsResult.data.forEach(appointment => {
            const email = appointment.clientEmail;
            if (!appointmentsByClient[email]) {
              appointmentsByClient[email] = [];
            }
            appointmentsByClient[email].push(appointment);
          });
          // Enriquecer clientes igual à tela ClientsScreen
          const enrichedClients = clientsResult.data.map(client => {
            const clientAppointments = appointmentsByClient[client.email] || [];
            const paidAppointments = clientAppointments.filter(apt => 
              apt.status === 'pago' || apt.status === 'confirmado' || apt.status === 'finalizado'
            );
            const totalSpent = paidAppointments.reduce((total, apt) => {
              const value = parseFloat(apt.finalPrice || apt.estimatedPrice || 0);
              return total + value;
            }, 0);
            const lastAppointment = clientAppointments.length > 0 
              ? clientAppointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0]
              : null;
            return {
              ...client,
              totalAppointments: clientAppointments.length,
              totalSpent: totalSpent,
              lastContact: lastAppointment ? lastAppointment.appointmentDate : client.firstContactDate,
              lastAppointmentStatus: lastAppointment?.status
            };
          });
          setClientesBanco(enrichedClients);
          setClientesRawResult(clientsResult);
          // Log detalhado dos clientes buscados, incluindo paginaOrigemId e paginaOrigemNome
          console.log('[Clientes buscados do banco de dados]', enrichedClients.map(c => ({
            id: c.id,
            nome: c.nome || c.name,
            email: c.email,
            paginaOrigemId: c.paginaOrigemId,
            paginaOrigemNome: c.paginaOrigemNome,
            ...c
          })));
        } catch (err) {
          setClientesBanco([]);
          setClientesRawResult({ error: err?.message || String(err) });
        }
      } else {
        setClientesBanco([]);
        setClientesRawResult(null);
      }
    }
    fetchAllClientsAndAppointments();
  }, [user]);

  // Carregar associações ao montar ou quando processos mudam
  useEffect(() => {
    async function fetchAssociations() {
      if (user?.uid && window.clientProcessService?.getAssociations) {
        const result = await window.clientProcessService.getAssociations(user.uid);
        console.log('[DEBUG] Resultado de getAssociations:', result);
        if (result.success && Array.isArray(result.data)) {
          // Enriquecer cada associação com o nome do cliente
          const enriched = await Promise.all(result.data.map(async (assoc) => {
            let clienteNome = '';
            if (assoc.clienteId && window.clientService?.getClientById) {
              const clientResult = await window.clientService.getClientById(user.uid, assoc.clienteId);
              if (clientResult.success && clientResult.data) {
                clienteNome = clientResult.data.nome || clientResult.data.name || '';
              }
            }
            return { ...assoc, clienteNome };
          }));
          setAssociations(enriched);
        }
      }
    }
    fetchAssociations();
  }, [user, processes]);


  // Atualiza cache local de clientes sempre que o modal de associação abrir
  useEffect(() => {
    async function updateClientCache() {
      if (showAssociateModal && user?.uid && window.clientService?.getClients) {
        try {
          const allClientsResult = await window.clientService.getClients(user.uid);
          if (allClientsResult.success && Array.isArray(allClientsResult.data)) {
            window.clientList = allClientsResult.data;
            console.log('[Autocomplete] Cache local de clientes atualizado:', window.clientList);
          }
        } catch (err) {
          console.warn('[Autocomplete] Erro ao atualizar cache local de clientes:', err);
        }
      }
    }
    updateClientCache();
  }, [showAssociateModal, user]);

  // Buscar clientes ao digitar usando clientesBanco já carregado
  useEffect(() => {
    if (clientSearch.length > 1 && clientesBanco.length > 0) {
      // Enriquecimento igual à tela Clientes
      let enrichedClients = clientesBanco.map(client => ({
        ...client,
        totalAppointments: client.totalAppointments || (client.appointments ? client.appointments.length : 0),
        totalSpent: client.totalSpent || (client.appointments ? client.appointments.reduce((sum, a) => sum + (a.valor || 0), 0) : 0),
        caseTypes: client.caseTypes || (client.cases ? Array.from(new Set(client.cases.map(c => c.area))).filter(Boolean) : []),
        status: client.status || 'ativo',
      }));

      // Filtro local igual à tela de clientes
      const search = clientSearch.toLowerCase();
      const filtered = enrichedClients.filter(client =>
        (client.nome && client.nome.toLowerCase().includes(search)) ||
        (client.name && client.name.toLowerCase().includes(search)) ||
        (client.email && client.email.toLowerCase().includes(search)) ||
        (client.phone && client.phone.toLowerCase().includes(search))
      );
      setClientSuggestions(filtered);
    } else {
      setClientSuggestions([]);
    }
  }, [clientSearch, clientesBanco]);


  // Função para associar cliente ao processo (com integração backend)
  const handleAssociateClient = async () => {
    console.log('[ASSOCIAR] Clique no botão Associar', { selectedProcessForAssociation, selectedClient });
    if (!selectedProcessForAssociation || !selectedClient) {
      alert('Processo ou cliente não selecionado!');
      return;
    }
    // Montar objeto com todos os campos necessários
    // Enriquecer selectedClient com dados do backend (caso não estejam presentes)
    let paginaOrigemId = selectedClient.paginaOrigemId || selectedClient.paginaId || '';
    let paginaOrigemNome = selectedClient.paginaOrigemNome || selectedClient.nomePagina || '';
    // Se não veio do frontend, tenta buscar do backend
    if ((!paginaOrigemId || !paginaOrigemNome) && window.clientService?.getClientById) {
      const clientResult = await window.clientService.getClientById(user.uid, selectedClient.id);
      if (clientResult.success && clientResult.data) {
        if (!paginaOrigemId) paginaOrigemId = clientResult.data.paginaOrigemId || clientResult.data.paginaId || '';
        if (!paginaOrigemNome) paginaOrigemNome = clientResult.data.paginaOrigemNome || clientResult.data.nomePagina || '';
      }
    }
    const association = {
      processoId: selectedProcessForAssociation.id,
      nomeProcesso: selectedProcessForAssociation.nome || selectedProcessForAssociation.name || '',
      clienteId: selectedClient.id,
      advogadoId: user?.uid || '',
      nomeAdvogado: user?.displayName || user?.name || '',
      paginaOrigemId,
      paginaOrigemNome
    };
    try {
      if (window.clientProcessService?.associateClientToProcess) {
        console.log('[ASSOCIAR] Chamando associateClientToProcess', association);
        const result = await window.clientProcessService.associateClientToProcess(association);
        console.log('[ASSOCIAR] Resultado da associação:', result);
        alert('Resultado da associação: ' + JSON.stringify(result));
        if (result.success) {
          let clienteNome = selectedClient.nome || selectedClient.name;
          if (!clienteNome && window.clientService?.getClientById) {
            const clientResult = await window.clientService.getClientById(user.uid, selectedClient.id);
            if (clientResult.success && clientResult.data) {
              clienteNome = clientResult.data.nome || clientResult.data.name;
            }
          }
          setAssociations(prev => ([
            ...prev.filter(a => a.processoId !== selectedProcessForAssociation.id),
            { ...association, clienteNome }
          ]));
          alert('Cliente associado com sucesso!');
          setShowAssociateModal(false);
          setSelectedClient(null);
          setSelectedProcessForAssociation(null);
          setClientSearch('');
        } else {
          alert('Erro ao associar cliente: ' + (result.error || 'Erro desconhecido.'));
        }
      } else {
        alert('Serviço associateClientToProcess não disponível!');
      }
    } catch (err) {
      console.error('[ASSOCIAR] Erro ao associar cliente:', err);
      alert('Erro ao associar cliente: ' + (err?.message || JSON.stringify(err)));
    }
  };


  // Helper para buscar nome do cliente associado ao processo (busca backend se necessário)
  const getClientNameForProcess = (processId) => {
    const assoc = associations.find(a => a.processoId === processId);
    if (!assoc) return null;
    if (assoc.clienteNome) return assoc.clienteNome;
    // Busca do backend se não tiver nome
    if (window.clientService?.getClientById && assoc.clienteId) {
      // Busca síncrona não é possível, então retorna placeholder e atualiza depois
      window.clientService.getClientById(user.uid, assoc.clienteId).then(result => {
        if (result.success && result.data) {
          assoc.clienteNome = result.data.nome || result.data.name || '';
          setAssociations([...associations]);
        }
      });
      return 'Buscando cliente...';
    }
    return 'Cliente associado';
  };
  const mockProcesses = [
    {
      id: '1',
      number: '1234567-89.2024.8.26.0001',
      title: 'Ação de Cobrança',
      client: 'Maria Silva Santos',
      court: '1ª Vara Cível - SP',
      status: 'Em andamento',
      priority: 'alta',
      startDate: '2024-01-15',
      lastUpdate: '2024-07-10',
      nextHearing: '2024-08-15',
      description: 'Cobrança de honorários advocatícios em contrato de prestação de serviços'
    },
    {
      id: '2',
      number: '9876543-21.2024.8.26.0002',
      title: 'Divórcio Consensual',
      client: 'João Carlos Oliveira',
      court: '2ª Vara de Família - SP',
      status: 'Concluído',
      priority: 'media',
      startDate: '2024-02-20',
      lastUpdate: '2024-06-30',
      nextHearing: null,
      description: 'Divórcio consensual com partilha de bens'
    },
    {
      id: '3',
      number: '5555555-55.2024.8.26.0003',
      title: 'Ação Trabalhista',
      client: 'Ana Paula Costa',
      court: '15ª Vara do Trabalho - SP',
      status: 'Aguardando',
      priority: 'baixa',
      startDate: '2024-03-10',
      lastUpdate: '2024-07-05',
      nextHearing: '2024-08-20',
      description: 'Reclamação trabalhista por verbas rescisórias'
    },
    // Exemplo de processo salvo do DataJud com todas as informações
    {
      id: '4',
      number: '1111111-11.2024.8.26.0100',
      title: 'Procedimento Comum Cível',
      client: 'Cliente DataJud',
      court: '1ª Vara Cível Central',
      status: 'Em andamento',
      priority: 'media',
      startDate: '2024-01-10',
      lastUpdate: '2024-07-15',
      nextHearing: '2024-08-25',
      description: 'Processo importado do DataJud com todas as informações preservadas',
      
      // Dados específicos do DataJud
      isFromDataJud: true,
      dataJudImportDate: '2024-07-15T10:30:00Z',
      tribunal: 'TJSP',
      tribunalNome: 'Tribunal de Justiça de São Paulo',
      grau: 'G1',
      classe: {
        codigo: 436,
        nome: 'Procedimento Comum Cível'
      },
      assuntos: [
        {
          codigo: 1127,
          nome: 'Responsabilidade Civil'
        },
        {
          codigo: 10375,
          nome: 'Dano Material'
        }
      ],
      movimentos: [
        {
          codigo: 26,
          nome: 'Distribuição',
          dataHora: '2024-01-10T09:00:00Z'
        },
        {
          codigo: 51,
          nome: 'Audiência',
          dataHora: '2024-08-25T14:00:00Z'
        }
      ],
      orgaoJulgador: {
        codigo: 1234,
        nome: '1ª Vara Cível Central',
        codigoMunicipioIBGE: 3550308
      },
      sistema: {
        codigo: 1,
        nome: 'SAJ'
      },
      formato: {
        codigo: 1,
        nome: 'Eletrônico'
      },
      nivelSigilo: 0,
      dataAjuizamento: '2024-01-10T09:00:00Z',
      dataHoraUltimaAtualizacao: '2024-07-15T10:30:00Z',
      dataJudId: 'exemplo_datajud_123',
      dataJudScore: 1.0,
      dataJudOriginal: {
        _id: 'exemplo_datajud_123',
        _score: 1.0,
        numeroProcesso: '11111111120248260100',
        classe: {
          codigo: 436,
          nome: 'Procedimento Comum Cível'
        },
        assuntos: [
          {
            codigo: 1127,
            nome: 'Responsabilidade Civil'
          },
          {
            codigo: 10375,
            nome: 'Dano Material'
          }
        ],
        movimentos: [
          {
            codigo: 26,
            nome: 'Distribuição',
            dataHora: '2024-01-10T09:00:00Z'
          },
          {
            codigo: 51,
            nome: 'Audiência',
            dataHora: '2024-08-25T14:00:00Z'
          }
        ],
        orgaoJulgador: {
          codigo: 1234,
          nome: '1ª Vara Cível Central',
          codigoMunicipioIBGE: 3550308
        },
        sistema: {
          codigo: 1,
          nome: 'SAJ'
        },
        formato: {
          codigo: 1,
          nome: 'Eletrônico'
        },
        nivelSigilo: 0,
        dataAjuizamento: '2024-01-10T09:00:00Z',
        dataHoraUltimaAtualizacao: '2024-07-15T10:30:00Z',
        tribunalNome: 'Tribunal de Justiça de São Paulo',
        grau: 'G1'
      }
    }
  ];

  useEffect(() => {
    loadProcesses();
  }, [user]); // Recarregar quando o usuário mudar

  // Log para monitorar mudanças no estado dos processos
  useEffect(() => {
    console.log('🔄 Estado dos processos atualizado:', processes);
    console.log('📊 Total de processos no estado:', processes.length);
    console.log('🏛️ Processos do DataJud no estado:', processes.filter(p => p.isFromDataJud).length);
  }, [processes]);

  // Função para sincronizar processos com calendário
  const syncProcessesWithCalendar = async (processesToSync = null) => {
    if (!user?.uid) return;
    
    try {
      const targetProcesses = processesToSync || processes;
      console.log('📅 Iniciando sincronização com calendário para', targetProcesses.length, 'processos');
      
      const result = await processCalendarIntegration.syncAllProcesses(user.uid, targetProcesses);
      
      if (result.success) {
        console.log(`✅ Sincronização concluída: ${result.eventsCreated} eventos criados de ${result.processesSync} processos`);
        
        // Mostrar notificação de sucesso
        if (result.eventsCreated > 0) {
          alert(`✅ ${result.eventsCreated} eventos foram adicionados ao calendário automaticamente!`);
        }
      } else {
        console.error('❌ Erro na sincronização:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar com calendário:', error);
    }
  };

  // Função para sincronizar um processo específico
  const syncSingleProcess = async (processData) => {
    if (!user?.uid) return;
    
    try {
      console.log('📅 Sincronizando processo individual:', processData.number);
      
      const result = await processCalendarIntegration.syncProcessWithCalendar(user.uid, processData);
      
      if (result.success && result.eventsCreated > 0) {
        console.log(`✅ ${result.eventsCreated} eventos criados no calendário para o processo ${processData.number}`);
        alert(`✅ ${result.eventsCreated} eventos do processo foram adicionados ao calendário!`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao sincronizar processo:', error);
      return { success: false, error: error.message };
    }
  };

  // Função para remover processo do calendário
  const removeProcessFromCalendar = async (processNumber) => {
    if (!user?.uid) return;
    
    try {
      const result = await processCalendarIntegration.removeProcessFromCalendar(user.uid, processNumber);
      
      if (result.success) {
        console.log(`🗑️ ${result.eventsDeleted} eventos removidos do calendário para o processo ${processNumber}`);
        if (result.eventsDeleted > 0) {
          alert(`🗑️ ${result.eventsDeleted} eventos do processo foram removidos do calendário!`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao remover processo do calendário:', error);
      return { success: false, error: error.message };
    }
  };

  const loadProcesses = async () => {
    setLoading(true);
    try {
      if (user?.uid) {
        console.log('🔄 Carregando processos do Firebase para usuário:', user.uid);
        // Carregar processos do Firebase
        const result = await caseService.getCases(user.uid);
        if (result.success) {
          console.log('✅ Processos carregados do Firebase:', result.data);
          console.log('📊 Total de processos:', result.data?.length || 0);
          console.log('🏛️ Processos do DataJud:', result.data?.filter(p => p.isFromDataJud)?.length || 0);
          setProcesses(result.data || []);
          
          // Sincronizar automaticamente com calendário
          if (result.data && result.data.length > 0) {
            setTimeout(() => {
              syncProcessesWithCalendar(result.data);
            }, 1000); // Aguardar um segundo para dar tempo do estado ser atualizado
          }
        } else {
          console.error('❌ Erro ao carregar processos:', result.error);
          // Fallback para dados mockados em caso de erro
          setProcesses(mockProcesses);
        }
      } else {
        console.log('⚠️ Sem usuário logado, usando dados mockados');
        // Sem usuário, usar dados mockados
        setProcesses(mockProcesses);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar processos:', error);
      // Fallback para dados mockados em caso de erro
      setProcesses(mockProcesses);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProcess = () => {
    setSelectedProcess(null);
    setShowAddModal(true);
  };

  const handleSearchDataJud = () => {
    setShowDataJudModal(true);
  };

  const handleSelectFromDataJud = (processData) => {
    setSelectedProcess(processData);
    setShowAddModal(true);
  };

  const handleEditProcess = (process) => {
    setSelectedProcess(process);
    setShowAddModal(true);
  };

  const handleDeleteProcess = async (processId) => {
    if (window.confirm('Tem certeza que deseja excluir este processo?')) {
      try {
        if (user?.uid) {
          // Deletar do Firebase
          const result = await caseService.deleteCase(processId);
          if (result.success) {
            console.log('✅ Processo deletado do Firebase:', processId);
            setProcesses(processes.filter(p => p.id !== processId));
          } else {
            console.error('❌ Erro ao deletar processo:', result.error);
            alert('Erro ao deletar processo. Tente novamente.');
          }
        } else {
          // Sem usuário, deletar apenas da lista local
          setProcesses(processes.filter(p => p.id !== processId));
        }
      } catch (error) {
        console.error('❌ Erro ao deletar processo:', error);
        alert('Erro ao deletar processo. Tente novamente.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Em andamento':
        return 'bg-blue-100 text-blue-800';
      case 'Concluído':
        return 'bg-green-100 text-green-800';
      case 'Aguardando':
        return 'bg-yellow-100 text-yellow-800';
      case 'Suspenso':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-100 text-red-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baixa':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProcesses = processes.filter(process => {
    const matchesSearch = process.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         process.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         process.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Log para monitorar processos filtrados
  useEffect(() => {
    console.log('🔍 Processos filtrados:', filteredProcesses);
    console.log('🔍 Termo de busca:', searchTerm);
    console.log('🔍 Filtro de status:', statusFilter);
    console.log('🔍 Total filtrado:', filteredProcesses.length);
  }, [filteredProcesses, searchTerm, statusFilter]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para adicionar audiência automaticamente ao calendário
  const handleAutoAddToCalendar = (processo) => {
    if (temAudiencia(processo)) {
      const confirmAdd = window.confirm(
        `Este processo tem uma audiência marcada para ${new Date(processo.nextHearing).toLocaleDateString('pt-BR')}. Deseja adicionar ao calendário?`
      );
      
      if (confirmAdd) {
        setSelectedProcessForCalendar(processo);
        setShowCalendarModal(true);
      }
    }
  };

  // Calcular audiências próximas
  const proximasAudiencias = processes
    .filter(p => temAudiencia(p))
    .filter(p => new Date(p.nextHearing) > new Date())
    .sort((a, b) => new Date(a.nextHearing) - new Date(b.nextHearing))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Exibir clientes buscados do banco de dados (visível) */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
        <div className="font-bold text-yellow-700 mb-2">Clientes buscados do banco de dados:</div>
        <div className="text-xs text-yellow-800 mb-2">user.uid: <b>{user?.uid || 'N/A'}</b></div>
        <details className="mb-2">
          <summary className="cursor-pointer text-yellow-700 underline">Ver resultado bruto de getClients</summary>
          <pre className="bg-yellow-100 p-2 rounded overflow-x-auto text-xs">{JSON.stringify(clientesRawResult, null, 2)}</pre>
        </details>
        <details className="mb-2">
          <summary className="cursor-pointer text-yellow-700 underline">Ver window.clientService</summary>
          <pre className="bg-yellow-100 p-2 rounded overflow-x-auto text-xs">{JSON.stringify({
            typeofClientService: typeof window.clientService,
            hasGetClients: !!window.clientService?.getClients,
            getClientsType: typeof window.clientService?.getClients
          }, null, 2)}</pre>
        </details>
        {clientesBanco.length === 0 ? (
          <div className="text-yellow-700">Nenhum cliente encontrado.</div>
        ) : (
          <ul className="text-xs text-yellow-800 space-y-1">
            {clientesBanco.map(c => (
              <li key={c.id}>
                <b>{c.nome || c.name}</b> | Email: {c.email} | Telefone: {c.phone} | Status: {c.status || 'ativo'}
              </li>
            ))}
          </ul>
        )}
        {/* Exibir associações cliente-processo */}
        <div className="mt-4">
          <div className="font-bold text-yellow-700 mb-2">Associações cliente-processo:</div>
          {associations.length === 0 ? (
            <div className="text-yellow-700">Nenhuma associação encontrada.</div>
          ) : (
            <ul className="text-xs text-yellow-800 space-y-1">
              {associations.map((a, idx) => {
                let nome = a.clienteNome;
                if ((!nome || nome.trim() === '') && a.clienteId && window.clientService?.getClientById && user?.uid) {
                  window.clientService.getClientById(user.uid, a.clienteId).then(result => {
                    if (result.success && result.data) {
                      a.clienteNome = result.data.nome || result.data.name || '';
                      setAssociations(prev => [...prev]);
                    }
                  });
                  nome = 'Buscando cliente...';
                }
                // Log detalhado no console
                console.log('[ASSOCIAÇÃO] Dados completos:', {
                  processoId: a.processoId,
                  nomeProcesso: a.nomeProcesso || '',
                  clienteId: a.clienteId,
                  clienteNome: nome || '',
                  advogadoId: a.advogadoId || user?.uid,
                  nomeAdvogado: a.nomeAdvogado || user?.displayName || user?.name || '',
                  paginaOrigemId: a.paginaOrigemId || '',
                  paginaOrigemNome: a.paginaOrigemNome || a.nomePagina || '',
                });
                return (
                  <li key={String(a.processoId) + '-' + String(a.clienteId) + '-' + idx}>
                    Processo: <b>{String(a.processoId)}</b> | Nome Processo: <b>{a.nomeProcesso || ''}</b> | Cliente ID: <b>{a.clienteId}</b> | Cliente Nome: <b>{nome ? String(nome) : 'N/A'}</b> | Advogado: <b>{a.nomeAdvogado || user?.displayName || user?.name || a.advogadoId || user?.uid}</b> | Página: <b>ID: {a.paginaOrigemId || 'N/A'} Nome: {a.paginaOrigemNome || a.nomePagina || 'N/A'}</b>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Processos</h1>
        <div className="flex gap-3">
          <button
            onClick={handleSearchDataJud}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar DataJud
          </button>
          <button
            onClick={loadProcesses}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Carregando...' : 'Recarregar'}
          </button>
          <button
            onClick={handleAddProcess}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Processo
          </button>
          <button
            onClick={() => syncProcessesWithCalendar()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
            disabled={loading || processes.length === 0}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v16a2 2 0 002 2z" />
            </svg>
            Sincronizar Calendário
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Número do processo, título ou cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluído">Concluído</option>
              <option value="Aguardando">Aguardando</option>
              <option value="Suspenso">Suspenso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Processos */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredProcesses.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">Nenhum processo encontrado</p>
            <p className="text-gray-400 mt-2">Adicione um novo processo ou ajuste os filtros</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProcesses.map((process) => (
              <div key={process.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {process.isFromDataJud ? (process.classe?.nome || process.title) : process.title}
                      </h3>
                      {/* Botão para debate jurídico */}
                      <button
                        className="ml-2 px-3 py-1 bg-yellow-400 text-yellow-900 rounded font-semibold hover:bg-yellow-500 transition-colors text-xs flex items-center gap-1"
                        onClick={() => {
                          setDebateProcess(process);
                          setShowDebateModal(true);
                        }}
                        title="Simular debate jurídico deste processo"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0 0l-2 2m2-2l2 2" />
                        </svg>
                        Debater este processo
                      </button>
                      {/* Botão consultar pasta do processo */}
                      <button
                        className="ml-2 px-3 py-1 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300 transition-colors text-xs flex items-center gap-1"
                        title="Consultar pasta do processo"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4V4z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8v8H8V8z" />
                        </svg>
                        Consultar pasta do processo
                      </button>

      {/* Modal de Debate Jurídico */}
      {showDebateModal && debateProcess && (
        <LegalDebateModal
          process={debateProcess}
          onClose={() => {
            setShowDebateModal(false);
            setDebateProcess(null);
          }}
          onSaveDebate={handleSaveDebate}
        />
      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Número:</span>
                        <p className="text-gray-600">{process.number}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cliente:</span>
                        <p className="text-gray-600">
                          {/* Exibe nome do cliente associado se houver associação */}
                          {
                            (() => {
                              const assoc = associations.find(a => String(a.processoId) === String(process.id));
                              if (assoc) {
                                if (assoc.clienteNome && assoc.clienteNome.trim() !== '') return assoc.clienteNome;
                                // Se não houver nome, mostrar o ID do cliente
                                if (assoc.clienteId) return `ID: ${assoc.clienteId}`;
                                // Buscar nome do cliente pelo id se não houver nome
                                if (assoc.clienteId && window.clientService?.getClientById && user?.uid) {
                                  window.clientService.getClientById(user.uid, assoc.clienteId).then(result => {
                                    if (result.success && result.data) {
                                      assoc.clienteNome = result.data.nome || result.data.name || '';
                                      setAssociations(prev => [...prev]);
                                    }
                                  });
                                  return `ID: ${assoc.clienteId}`;
                                }
                                return 'Buscando cliente...';
                              }
                              return process.isFromDataJud ? 'Dados sigilosos (DataJud)' : process.client;
                            })()
                          }
                          <button
                            className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                            onClick={() => {
                              setSelectedProcessForAssociation(process);
                              // Se houver apenas um cliente, já sugere e seleciona
                              if (clientesBanco.length === 1) {
                                setClientSearch(clientesBanco[0].nome || clientesBanco[0].name || '');
                                setSelectedClient(clientesBanco[0]);
                                setHighlightedSuggestion(0);
                              } else if (clientesBanco.length > 1) {
                                setClientSearch(clientesBanco[0].nome || clientesBanco[0].name || '');
                                setSelectedClient(clientesBanco[0]);
                                setHighlightedSuggestion(0);
                              } else {
                                setClientSearch('');
                                setSelectedClient(null);
                                setHighlightedSuggestion(-1);
                              }
                              setShowAssociateModal(true);
                            }}
                          >
                            Associar Cliente
                          </button>
                        </p>
                      </div>
      
                    </div>
                      
                    
                  </div>
      {/* Modal de associação de cliente */}
      {showAssociateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Associar Cliente ao Processo</h2>
            <input
              type="text"
              placeholder="Buscar cliente por nome ou email"
              value={clientSearch}
              autoFocus
              onChange={e => {
                setClientSearch(e.target.value);
                setHighlightedSuggestion(-1);
              }}
              onKeyDown={e => {
                if (clientSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedSuggestion(prev => Math.min(prev + 1, clientSuggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedSuggestion(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                  if (highlightedSuggestion >= 0 && highlightedSuggestion < clientSuggestions.length) {
                    setSelectedClient(clientSuggestions[highlightedSuggestion]);
                  }
                }
              }}
              className="w-full px-3 py-2 border rounded mb-3"
            />
            {/* Campo travado da página de origem do cliente selecionado */}
            {selectedClient && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">ID da Página de Origem</label>
                <input
                  type="text"
                  value={selectedClient.paginaOrigemId || selectedClient.paginaId || ''}
                  readOnly
                  className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>
            )}
            {clientSearch.length > 1 && (
              clientSuggestions.length > 0 ? (
                <ul className="border rounded mb-3 max-h-64 overflow-y-auto bg-white shadow divide-y divide-gray-100">
                  {clientSuggestions.map((client, idx) => (
                    <li
                      key={client.id}
                      className={`p-3 cursor-pointer flex flex-col gap-1 hover:bg-blue-50 ${
                        (selectedClient?.id === client.id ? 'bg-blue-100 ' : '') +
                        (highlightedSuggestion === idx ? 'bg-blue-200 ' : '')
                      }`}
                      onMouseEnter={() => setHighlightedSuggestion(idx)}
                      onMouseLeave={() => setHighlightedSuggestion(-1)}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedClient?.id === client.id}
                          onChange={async () => {
                            let paginaOrigemId = '';
                            let paginaOrigemNome = '';
                            if (window.clientService?.getClientById && user?.uid) {
                              const clientResult = await window.clientService.getClientById(user.uid, client.id);
                              if (clientResult.success && clientResult.data) {
                                paginaOrigemId = clientResult.data.paginaOrigemId || '';
                                paginaOrigemNome = clientResult.data.paginaOrigemNome || clientResult.data.nomePagina || '';
                              }
                            }
                            setSelectedClient({ ...client, paginaOrigemId, paginaOrigemNome });
                          }}
                          className="form-checkbox h-4 w-4 text-blue-600"
                        />
                        <span className="font-medium text-gray-900 text-base">{client.nome || client.name}</span>
                        {client.userCode && (
                          <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-blue-100 text-blue-800 rounded">{client.userCode}</span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${client.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{client.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{client.email}</span>
                        <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{client.phone || 'Não informado'}</span>
                        <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 002-2h4a2 2 0 012 2v4m0 4v10a1 1 0 01-1 1H9a1 1 0 01-1-1V11a1 1 0 011-1h6a1 1 0 011 1z" /></svg>{client.totalAppointments || 0} consultas</span>
                        <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>{client.totalSpent !== undefined ? (client.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })) : 'R$ 0,00'}</span>
                        {client.caseTypes && client.caseTypes.length > 0 && (
                          <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4V7a4 4 0 00-8 0v4a4 4 0 004 4z" /></svg>Áreas: {client.caseTypes.join(', ')}</span>
                        )}
                        {/* Página de origem do cliente */}
                        <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4V7a4 4 0 00-8 0v4a4 4 0 004 4z" /></svg>Página de origem: <b>ID:</b> {client.paginaOrigemId || client.paginaId || 'N/A'} <b>Nome:</b> {client.paginaOrigemNome || client.nomePagina || 'N/A'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500 text-sm mb-3 px-2">Nenhum cliente encontrado</div>
              )
            )}
            {!(window.clientProcessService && window.clientProcessService.associateClientToProcess) && (
              <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414M6.343 17.657l-1.414-1.414M5.636 5.636l1.414 1.414M17.657 17.657l1.414-1.414M12 8v4m0 4h.01" /></svg>
                Serviço de associação de cliente ao processo não está disponível no sistema. Contate o administrador ou verifique a configuração do ambiente.
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setShowAssociateModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={handleAssociateClient}
                disabled={!selectedClient || !(window.clientProcessService && window.clientProcessService.associateClientToProcess)}
              >
                Associar
              </button>
            </div>
          </div>
        </div>
      )}
                  
                  <div className="flex items-center gap-2 ml-4">
                    {/* Botão para visualizar detalhes completos */}
                    <button
                      onClick={() => {
                        setProcessForDetails(process);
                        setShowProcessDetails(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Ver detalhes completos"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    
                    {/* Botão de calendário - disponível para todos os processos */}
                    <button
                      onClick={() => {
                        setSelectedProcessForCalendar(process);
                        setShowCalendarModal(true);
                      }}
                      className={`p-2 transition-colors ${
                        temAudiencia(process) 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={
                        temAudiencia(process) 
                          ? "Adicionar audiência ao calendário" 
                          : "Adicionar lembrete ao calendário"
                      }
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    
                    {/* Botão de sincronização automática com calendário */}
                    <button
                      onClick={() => syncSingleProcess(process)}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Sincronizar automaticamente com calendário"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    
                    {process.dataJudOriginal && (
                      <button
                        onClick={() => setSelectedProcess(process)}
                        className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                        title="Ver detalhes do DataJud"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleEditProcess(process)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteProcess(process.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detalhes do DataJud */}
      {selectedProcess && selectedProcess.dataJudOriginal && (
        <div className="mt-6">
          <DataJudProcessDetails processData={selectedProcess} />
        </div>
      )}

      {/* Modal para Adicionar/Editar Processo */}
      {showAddModal && (
        <ProcessModal
          process={selectedProcess}
          onClose={() => setShowAddModal(false)}
          onSave={async (processData) => {
            // Implementar lógica de salvar com todas as informações do DataJud
            const processToSave = {
              ...processData,
              // Não incluir ID se for novo processo (Firebase gerará)
              ...(selectedProcess?.id && { id: selectedProcess.id }),
              lastUpdate: new Date().toISOString().split('T')[0],
              
              // Preservar TUDO do processo selecionado (processão original + modificações)
              // Se for DataJud, spread todo o objeto primeiro para pegar TUDO
              ...(selectedProcess?.isFromDataJud && selectedProcess),
              
              // Depois sobrescrever com dados editados do formulário
              ...processData,
              
              // Garantir que metadados estão corretos
              ...(selectedProcess?.isFromDataJud && {
                isFromDataJud: true,
                dataImportacao: selectedProcess.dataImportacao || new Date().toISOString(),
              })
            };
            
            console.log('💾 Salvando processo com TODOS os dados do DataJud:', processToSave);
            
            try {
              if (user?.uid) {
                // Sempre incluir userId no objeto a salvar
                const processWithUserId = {
                  ...processToSave,
                  userId: user.uid
                };
                
                // Verificar se é um processo do DataJud
                if (selectedProcess?.isFromDataJud) {
                  // Se tem ID, é para atualizar; caso contrário, criar novo
                  if (selectedProcess?.id) {
                    // Processo do DataJud já existe no Firebase, atualizar
                    console.log('📝 Atualizando processo do DataJud no Firebase:', selectedProcess.id);
                    const result = await caseService.updateCase(selectedProcess.id, processWithUserId);
                    if (result.success) {
                      console.log('✅ Processo do DataJud atualizado no Firebase:', selectedProcess.id);
                      
                      // Recarregar processos do Firebase para garantir sincronização
                      await loadProcesses();
                      
                      setShowAddModal(false);
                      setSelectedProcess(null);
                    } else {
                      console.error('❌ Erro ao atualizar processo do DataJud:', result.error);
                      alert('Erro ao atualizar processo. Tente novamente.');
                      return;
                    }
                  } else {
                    // Processo do DataJud não existe no Firebase, criar novo
                    console.log('➕ Criando novo processo do DataJud');
                    const result = await caseService.createCase(user.uid, processWithUserId);
                    if (result.success) {
                      console.log('✅ Processo do DataJud criado:', result.id);
                      
                      // Recarregar processos do Firebase para garantir sincronização
                      await loadProcesses();
                      
                      setShowAddModal(false);
                      setSelectedProcess(null);
                      
                      // Adicionar ao calendário se tiver audiência
                      const newProcess = { ...processToSave, id: result.id };
                      setTimeout(() => {
                        handleAutoAddToCalendar(newProcess);
                        // Sincronizar automaticamente com calendário
                        syncSingleProcess(newProcess);
                      }, 500);
                    } else {
                      console.error('❌ Erro ao criar processo do DataJud:', result.error);
                      alert('Erro ao criar processo. Tente novamente.');
                      return;
                    }
                  }
                } else {
                  // Processo regular (não DataJud)
                  if (selectedProcess?.id) {
                    // Editando processo regular existente
                    console.log('📝 Atualizando processo regular no Firebase:', selectedProcess.id);
                    const result = await caseService.updateCase(selectedProcess.id, processWithUserId);
                    if (result.success) {
                      console.log('✅ Processo regular atualizado:', selectedProcess.id);
                      
                      // Recarregar processos do Firebase para garantir sincronização
                      await loadProcesses();
                      
                      setShowAddModal(false);
                      setSelectedProcess(null);
                      
                      // Sincronizar automaticamente com calendário
                      setTimeout(() => {
                        syncSingleProcess({ ...processToSave, id: selectedProcess.id });
                      }, 500);
                    } else {
                      console.error('❌ Erro ao atualizar processo regular:', result.error);
                      alert('Erro ao atualizar processo. Tente novamente.');
                      return;
                    }
                  } else {
                    // Criando novo processo regular
                    console.log('➕ Criando novo processo regular');
                    const result = await caseService.createCase(user.uid, processWithUserId);
                    if (result.success) {
                      console.log('✅ Processo regular criado:', result.id);
                      
                      // Recarregar processos do Firebase para garantir sincronização
                      await loadProcesses();
                      
                      setShowAddModal(false);
                      setSelectedProcess(null);
                      
                      // Adicionar ao calendário se tiver audiência
                      const newProcess = { ...processToSave, id: result.id };
                      setTimeout(() => {
                        handleAutoAddToCalendar(newProcess);
                        // Sincronizar automaticamente com calendário
                        syncSingleProcess(newProcess);
                      }, 500);
                    } else {
                      console.error('❌ Erro ao criar processo regular:', result.error);
                      alert('Erro ao criar processo. Tente novamente.');
                      return;
                    }
                  }
                }
              } else {
                // Sem usuário, salvar apenas na lista local
                console.log('⚠️ Usuário não logado, salvando apenas localmente');
                if (selectedProcess?.id) {
                  setProcesses(processes.map(p => 
                    p.id === selectedProcess.id ? { ...processToSave, id: selectedProcess.id } : p
                  ));
                } else {
                  const newProcess = { ...processToSave, id: Date.now().toString() };
                  setProcesses([...processes, newProcess]);
                  
                  setTimeout(() => {
                    handleAutoAddToCalendar(newProcess);
                  }, 500);
                }
              }
              
              // Log das informações específicas do DataJud
              if (processToSave.dataJudOriginal) {
                console.log('📋 Informações do DataJud salvas no Firebase:');
                console.log('- Classe:', processToSave.classe);
                console.log('- Assuntos:', processToSave.assuntos);
                console.log('- Movimentos:', processToSave.movimentos?.length || 0, 'movimentos');
                console.log('- Órgão Julgador:', processToSave.orgaoJulgador);
                console.log('- Sistema:', processToSave.sistema);
                console.log('- Formato:', processToSave.formato);
                console.log('- Nível de Sigilo:', processToSave.nivelSigilo);
                console.log('- Data de Ajuizamento:', processToSave.dataAjuizamento);
                console.log('- Última Atualização:', processToSave.dataHoraUltimaAtualizacao);
              }
              
              setShowAddModal(false);
              
            } catch (error) {
              console.error('❌ Erro ao salvar processo:', error);
              alert('Erro ao salvar processo. Tente novamente.');
            }
          }}
        />
      )}

      {/* Modal de busca DataJud */}
      {showDataJudModal && (
        <DataJudSearchModal
          isOpen={showDataJudModal}
          onClose={() => setShowDataJudModal(false)}
          onSelectProcess={handleSelectFromDataJud}
        />
      )}

      {/* Modal de Calendário */}
      {showCalendarModal && (
        <CalendarModal
          isOpen={showCalendarModal}
          onClose={() => {
            setShowCalendarModal(false);
            setSelectedProcessForCalendar(null);
          }}
          processo={selectedProcessForCalendar}
          tipo="audiencia"
        />
      )}

      {/* Modal de Detalhes do Processo */}
      {showProcessDetails && processForDetails && (
        <ProcessModal
          process={processForDetails}
          onClose={() => {
            setShowProcessDetails(false);
            setProcessForDetails(null);
          }}
          onSave={async (processData) => {
            // Se quiser salvar também a partir daqui
            if (user?.uid) {
              const processWithUserId = {
                ...processData,
                userId: user.uid
              };
              
              if (processForDetails?.id) {
                const result = await caseService.updateCase(processForDetails.id, processWithUserId);
                if (result.success) {
                  await loadProcesses();
                  setShowProcessDetails(false);
                  setProcessForDetails(null);
                }
              }
            }
          }}
        />
      )}

      {/* Dashboard de Audiências Próximas */}
      {proximasAudiencias.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Próximas Audiências
            </h2>
            <span className="text-sm text-gray-600">
              {proximasAudiencias.length} audiência{proximasAudiencias.length !== 1 ? 's' : ''} próxima{proximasAudiencias.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proximasAudiencias.map((processo) => (
              <div key={processo.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{processo.title}</h4>
                  <button
                    onClick={() => {
                      setSelectedProcessForCalendar(processo);
                      setShowCalendarModal(true);
                    }}
                    className="text-green-600 hover:text-green-700 p-1"
                    title="Adicionar ao calendário"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-1">{processo.client}</p>
                <p className="text-sm font-medium text-blue-600">
                  {new Date(processo.nextHearing).toLocaleDateString('pt-BR', { 
                    weekday: 'short', 
                    day: '2-digit', 
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Modal para Adicionar/Editar Processo
const ProcessModal = ({ process, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    number: process?.number || process?.numeroProcessoFormatado || process?.numeroProcesso || '',
    title: process?.title || process?.classeNome || process?.classeCompleta?.nome || '',
    client: process?.client || '',
    court: process?.court || process?.orgaoJulgadorNome || process?.orgaoJulgadorCompleto?.nome || '',
    status: process?.status || 'Em andamento',
    priority: process?.priority || 'media',
    startDate: process?.startDate || process?.dataAjuizamento || '',
    nextHearing: process?.nextHearing || '',
    description: process?.description || ''
  });

  const [activeTab, setActiveTab] = useState('info');

  const isFromDataJud = process?.isFromDataJud || process?.dataJudOriginal;

  console.log('🔍 Modal ProcessModal - processo recebido:', process);
  console.log('🔍 Modal ProcessModal - isFromDataJud:', isFromDataJud);
  console.log('🔍 Modal ProcessModal - movimentos:', process?.movimentos);
  console.log('🔍 Modal ProcessModal - ultimosMovimentos:', process?.ultimosMovimentos);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Se for DataJud, preservar todos os dados originais e apenas sobrescrever os editáveis
    if (isFromDataJud && process) {
      const dataToSave = {
        ...process, // Manter todos os dados originais do DataJud
        ...formData, // Sobrescrever apenas os campos editáveis
        lastUpdate: new Date().toISOString().split('T')[0],
        updatedAt: new Date()
      };
      console.log('💾 Salvando processo com dados DataJud preservados:', dataToSave);
      onSave(dataToSave);
    } else {
      onSave(formData);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Atualizar formData quando o processo mudar
  useEffect(() => {
    if (process) {
      setFormData({
        number: process?.number || process?.numeroProcessoFormatado || process?.numeroProcesso || '',
        title: process?.title || process?.classeNome || process?.classeCompleta?.nome || '',
        client: process?.client || '',
        court: process?.court || process?.orgaoJulgadorNome || process?.orgaoJulgadorCompleto?.nome || '',
        status: process?.status || 'Em andamento',
        priority: process?.priority || 'media',
        startDate: process?.startDate || process?.dataAjuizamento || '',
        nextHearing: process?.nextHearing || '',
        description: process?.description || ''
      });
    }
  }, [process]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {process ? 'Detalhes do Processo' : 'Novo Processo'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{process?.number || process?.numeroProcessoFormatado}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Abas */}
        {(isFromDataJud || process?.movimentos?.length > 0) && (
          <div className="flex border-b bg-gray-50 sticky top-16 z-10">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ℹ️ Informações
            </button>
            {process?.movimentos?.length > 0 && (
              <button
                onClick={() => setActiveTab('movimentos')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'movimentos'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Movimentações ({process?.movimentos?.length || 0})
              </button>
            )}
            {process?.assuntos?.length > 0 && (
              <button
                onClick={() => setActiveTab('assuntos')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'assuntos'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏷️ Assuntos ({process?.assuntos?.length || 0})
              </button>
            )}
            <button
              onClick={() => setActiveTab('editar')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'editar'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✏️ Editar
            </button>
          </div>
        )}

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* ABA: INFORMAÇÕES */}
          {(!isFromDataJud || activeTab === 'info') && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Processo</label>
                  <p className="text-gray-900 font-semibold">{process?.number || process?.numeroProcessoFormatado}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <p className="text-gray-900">{process?.client}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tribunal</label>
                  <p className="text-gray-900">{process?.court || process?.orgaoJulgadorNome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-gray-900">{process?.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Ajuizamento</label>
                  <p className="text-gray-900">{process?.startDate || process?.dataAjuizamento}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Audiência</label>
                  <p className="text-gray-900">{process?.nextHearing}</p>
                </div>
              </div>

              {(isFromDataJud || process?.movimentos?.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">📊 Informações Processual</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Grau:</span>
                      <p className="text-blue-600">{process?.grau}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Tribunal:</span>
                      <p className="text-blue-600">{process?.tribunal || process?.tribunalNome}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Classe:</span>
                      <p className="text-blue-600">{process?.classeNome || process?.classe?.nome}</p>
                    </div>
                    {process?.sistema?.nome && (
                      <div>
                        <span className="text-blue-700 font-medium">Sistema:</span>
                        <p className="text-blue-600">{process.sistema.nome}</p>
                      </div>
                    )}
                    {process?.orgaoJulgador?.nome && (
                      <div className="md:col-span-2">
                        <span className="text-blue-700 font-medium">Órgão Julgador:</span>
                        <p className="text-blue-600">{process.orgaoJulgador.nome}</p>
                      </div>
                    )}
                    {process?.formato?.nome && (
                      <div>
                        <span className="text-blue-700 font-medium">Formato:</span>
                        <p className="text-blue-600">{process.formato.nome}</p>
                      </div>
                    )}
                    {process?.nivelSigilo !== undefined && (
                      <div>
                        <span className="text-blue-700 font-medium">Nível Sigilo:</span>
                        <p className="text-blue-600">{process.nivelSigilo === 0 ? 'Público' : 'Sigiloso'}</p>
                      </div>
                    )}
                    {process?.valorCausa && (
                      <div>
                        <span className="text-blue-700 font-medium">Valor Causa:</span>
                        <p className="text-blue-600">R$ {process.valorCausa}</p>
                      </div>
                    )}
                    {process?.dataHoraUltimaAtualizacao && (
                      <div className="md:col-span-2">
                        <span className="text-blue-700 font-medium">Última Atualização:</span>
                        <p className="text-blue-600">{new Date(process.dataHoraUltimaAtualizacao).toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {process?.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{process.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: MOVIMENTAÇÕES */}
          {(isFromDataJud || process?.movimentos?.length > 0) && activeTab === 'movimentos' && (
            <div className="p-6">
              {process?.movimentos && process.movimentos.length > 0 ? (
                <div className="space-y-3">
                  {process.movimentos.map((movimento, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {movimento?.nome}
                          </p>
                          {movimento?.complementosTabelados && movimento.complementosTabelados.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {movimento.complementosTabelados.map((comp, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                  {comp.nome || comp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-gray-500 text-sm ml-4 whitespace-nowrap">
                          {movimento?.dataHora
                            ? new Date(movimento.dataHora).toLocaleDateString('pt-BR')
                            : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma movimentação disponível
                </div>
              )}
            </div>
          )}

          {/* ABA: ASSUNTOS */}
          {process?.assuntos?.length > 0 && activeTab === 'assuntos' && (
            <div className="p-6">
              {process?.assuntos && process.assuntos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {process.assuntos.map((assunto, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">{assunto.nome}</p>
                      {assunto.codigo && (
                        <p className="text-xs text-gray-500 mt-1">Código: {assunto.codigo}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum assunto disponível
                </div>
              )}
            </div>
          )}

          {/* ABA: EDITAR (formulário) */}
          {(!isFromDataJud || activeTab === 'editar') && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Processo *
                  </label>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tribunal *
                  </label>
                  <input
                    type="text"
                    name="court"
                    value={formData.court}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Aguardando">Aguardando</option>
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Próxima Audiência
                  </label>
                  <input
                    type="date"
                    name="nextHearing"
                    value={formData.nextHearing}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {process ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessesScreen;
