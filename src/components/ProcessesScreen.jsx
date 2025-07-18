import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { caseService } from '../firebase/firestore';
import DataJudSearchModal from './DataJudSearchModal';
import DataJudProcessDetails from './DataJudProcessDetails';
import ProcessDetails from './ProcessDetails';
import CalendarModal from './CalendarModal';
import { temAudiencia } from '../services/calendarService';
import { processCalendarIntegration } from '../services/processCalendarIntegration';

const ProcessesScreen = () => {
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

  // Dados fictícios para demonstração - incluindo exemplo com DataJud
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
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
                      
                      {/* Indicador de processo do DataJud */}
                      {process.isFromDataJud && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          DataJud
                        </span>
                      )}
                      
                      {/* Indicador de audiência */}
                      {temAudiencia(process) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Audiência
                        </span>
                      )}
                      
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(process.status)}`}>
                        {process.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(process.priority)}`}>
                        {process.priority === 'alta' ? 'Alta' : process.priority === 'media' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {process.isFromDataJud 
                        ? `Processo importado do DataJud - ${process.tribunalNome || process.tribunal || 'Tribunal'} - ${process.grau || 'Grau não informado'}`
                        : process.description
                      }
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Número:</span>
                        <p className="text-gray-600">{process.number}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cliente:</span>
                        <p className="text-gray-600">
                          {process.isFromDataJud ? 'Dados sigilosos (DataJud)' : process.client}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Tribunal:</span>
                        <p className="text-gray-600">
                          {process.isFromDataJud ? (process.tribunalNome || process.tribunal || process.court) : process.court}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Próxima Audiência:</span>
                        <p className="text-gray-600">{formatDate(process.nextHearing)}</p>
                      </div>
                    </div>
                    
                    {/* Informações específicas do DataJud */}
                    {process.isFromDataJud && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          {process.classe && (
                            <div>
                              <span className="font-medium text-yellow-700">Classe:</span>
                              <p className="text-yellow-600">{process.classe.nome}</p>
                            </div>
                          )}
                          {process.grau && (
                            <div>
                              <span className="font-medium text-yellow-700">Grau:</span>
                              <p className="text-yellow-600">{process.grau}</p>
                            </div>
                          )}
                          {process.orgaoJulgador && (
                            <div>
                              <span className="font-medium text-yellow-700">Órgão Julgador:</span>
                              <p className="text-yellow-600">{process.orgaoJulgador.nome}</p>
                            </div>
                          )}
                          {process.sistema && (
                            <div>
                              <span className="font-medium text-yellow-700">Sistema:</span>
                              <p className="text-yellow-600">{process.sistema.nome}</p>
                            </div>
                          )}
                          {process.dataAjuizamento && (
                            <div>
                              <span className="font-medium text-yellow-700">Data Ajuizamento:</span>
                              <p className="text-yellow-600">{formatDate(process.dataAjuizamento)}</p>
                            </div>
                          )}
                          {process.movimentos && process.movimentos.length > 0 && (
                            <div>
                              <span className="font-medium text-yellow-700">Movimentos:</span>
                              <p className="text-yellow-600">{process.movimentos.length} movimentos</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Assuntos do processo */}
                        {process.assuntos && process.assuntos.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-yellow-700 block mb-2">Assuntos:</span>
                            <div className="flex flex-wrap gap-1">
                              {process.assuntos.map((assunto, index) => (
                                <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                                  {assunto.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>Iniciado em: {formatDate(process.startDate)}</span>
                      <span>Última atualização: {formatDate(process.lastUpdate)}</span>
                    </div>
                  </div>
                  
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
              
              // Preservar TODAS as informações do DataJud se existirem
              ...(selectedProcess?.dataJudOriginal && {
                // Dados originais completos
                dataJudOriginal: selectedProcess.dataJudOriginal,
                
                // Informações estruturadas
                tribunal: selectedProcess.tribunal,
                tribunalNome: selectedProcess.tribunalNome,
                grau: selectedProcess.grau,
                classe: selectedProcess.classe,
                assuntos: selectedProcess.assuntos,
                movimentos: selectedProcess.movimentos,
                orgaoJulgador: selectedProcess.orgaoJulgador,
                sistema: selectedProcess.sistema,
                formato: selectedProcess.formato,
                nivelSigilo: selectedProcess.nivelSigilo,
                
                // Datas específicas
                dataAjuizamento: selectedProcess.dataAjuizamento,
                dataHoraUltimaAtualizacao: selectedProcess.dataHoraUltimaAtualizacao,
                
                // Dados técnicos
                dataJudId: selectedProcess.dataJudId,
                dataJudScore: selectedProcess.dataJudScore,
                dataJudIndex: selectedProcess.dataJudIndex,
                dataJudSource: selectedProcess.dataJudSource,
                
                // Metadados
                isFromDataJud: true,
                dataJudImportDate: selectedProcess.dataJudImportDate || new Date().toISOString()
              })
            };
            
            console.log('💾 Salvando processo no Firebase:', processToSave);
            
            try {
              if (user?.uid) {
                // Verificar se é um processo existente no Firebase ou novo processo do DataJud
                const existingProcess = processes.find(p => p.id === selectedProcess?.id);
                const isExistingFirebaseProcess = existingProcess && existingProcess.createdAt; // Tem createdAt = já existe no Firebase
                
                // Para processos do DataJud, verificar se já foi salvo antes
                if (selectedProcess?.isFromDataJud && selectedProcess?.dataJudId) {
                  console.log('🔍 Verificando se processo do DataJud já foi salvo:', selectedProcess.dataJudId);
                  
                  // Verificar se já existe no Firebase
                  const checkResult = await caseService.checkDataJudProcessExists(user.uid, selectedProcess.dataJudId);
                  
                  if (checkResult.success && checkResult.exists) {
                    // Processo do DataJud já existe no Firebase, atualizar
                    console.log('📝 Atualizando processo do DataJud existente no Firebase:', checkResult.data.id);
                    const result = await caseService.updateCase(checkResult.data.id, processToSave);
                    if (result.success) {
                      const finalId = result.created ? result.id : checkResult.data.id;
                      console.log('✅ Processo do DataJud atualizado no Firebase:', finalId);
                      
                      // Recarregar processos do Firebase para garantir sincronização
                      await loadProcesses();
                      
                      setShowAddModal(false);
                      setSelectedProcess(null);
                    } else {
                      console.error('❌ Erro ao atualizar processo do DataJud:', result.error);
                      alert('Erro ao atualizar processo. Tente novamente.');
                      return;
                    }
                  } else if (selectedProcess?.id && existingProcess && existingProcess.createdAt) {
                    // Processo existe na lista local E no Firebase (tem createdAt), atualizar
                    console.log('📝 Atualizando processo do DataJud existente:', selectedProcess.id);
                    const result = await caseService.updateCase(selectedProcess.id, processToSave);
                    if (result.success) {
                      console.log('✅ Processo do DataJud atualizado:', selectedProcess.id);
                      setProcesses(processes.map(p => 
                        p.id === selectedProcess.id ? { ...processToSave, id: selectedProcess.id } : p
                      ));
                      
                      // Sincronizar automaticamente com calendário
                      setTimeout(() => {
                        syncSingleProcess({ ...processToSave, id: selectedProcess.id });
                      }, 500);
                    } else {
                      console.error('❌ Erro ao atualizar processo do DataJud:', result.error);
                      alert('Erro ao atualizar processo. Tente novamente.');
                      return;
                    }
                  } else {
                    // Processo do DataJud não existe no Firebase, criar novo
                    console.log('➕ Criando novo processo do DataJud');
                    const result = await caseService.createCase(user.uid, processToSave);
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
                } else if (selectedProcess?.id && isExistingFirebaseProcess) {
                  // Editando processo regular existente no Firebase
                  console.log('📝 Atualizando processo regular existente no Firebase:', selectedProcess.id);
                  const result = await caseService.updateCase(selectedProcess.id, processToSave);
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
                  // Adicionando novo processo regular
                  console.log('➕ Criando novo processo regular');
                  const result = await caseService.createCase(user.uid, processToSave);
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
      {showProcessDetails && (
        <ProcessDetails
          process={processForDetails}
          onClose={() => {
            setShowProcessDetails(false);
            setProcessForDetails(null);
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
    number: process?.number || '',
    title: process?.title || '',
    client: process?.client || '',
    court: process?.court || '',
    status: process?.status || 'Em andamento',
    priority: process?.priority || 'media',
    startDate: process?.startDate || '',
    nextHearing: process?.nextHearing || '',
    description: process?.description || ''
  });

  const isFromDataJud = process?.isFromDataJud || process?.dataJudOriginal;

  console.log('🔍 Modal ProcessModal - processo recebido:', process);
  console.log('🔍 Modal ProcessModal - isFromDataJud:', isFromDataJud);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {process ? 'Editar Processo' : 'Novo Processo'}
            {isFromDataJud && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                DataJud
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informações do DataJud */}
          {isFromDataJud && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Informações do DataJud
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-yellow-700">Tribunal:</span>
                  <p className="text-yellow-600">{process.tribunalNome || process.tribunal}</p>
                </div>
                <div>
                  <span className="font-medium text-yellow-700">Grau:</span>
                  <p className="text-yellow-600">{process.grau}</p>
                </div>
                <div>
                  <span className="font-medium text-yellow-700">Classe:</span>
                  <p className="text-yellow-600">{process.classe?.nome}</p>
                </div>
                <div>
                  <span className="font-medium text-yellow-700">Sistema:</span>
                  <p className="text-yellow-600">{process.sistema?.nome}</p>
                </div>
                {process.assuntos && process.assuntos.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-yellow-700">Assuntos:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {process.assuntos.map((assunto, index) => (
                        <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                          {assunto.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {process.movimentos && process.movimentos.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-yellow-700">Movimentos:</span>
                    <p className="text-yellow-600">{process.movimentos.length} movimentos processuais</p>
                  </div>
                )}
                {process.dataJudImportDate && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-yellow-700">Importado em:</span>
                    <p className="text-yellow-600">{new Date(process.dataJudImportDate).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
      </div>
    </div>
  );
};

export default ProcessesScreen;
