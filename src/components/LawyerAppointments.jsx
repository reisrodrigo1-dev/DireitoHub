import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService, clientService, lawyerPageService } from '../firebase/firestore';
import ClientCodeDisplay from './ClientCodeDisplay';
import AppointmentChat from './AppointmentChat';
import { 
  criarEventoConsulta, 
  generateGoogleCalendarLink, 
  generateOutlookLink, 
  generateICSFile, 
  downloadICSFile,
  calendarStorageService
} from '../services/calendarService';

const LawyerAppointments = () => {
  const { user, userData } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos'); // todos, pendente, confirmado, cancelado
  const [dateFilter, setDateFilter] = useState('todos'); // todos, hoje, semana, mes, range
  const [pageFilter, setPageFilter] = useState('todas'); // todas, ou ID da página específica
  const [lawyerPages, setLawyerPages] = useState([]); // páginas do advogado
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [finalPrice, setFinalPrice] = useState('');
  const [videoCallLink, setVideoCallLink] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedAppointmentForCalendar, setSelectedAppointmentForCalendar] = useState(null);

  // Função auxiliar para tratar datas de forma robusta
  const parseAppointmentDate = (appointmentDate) => {
    try {
      if (!appointmentDate) {
        return null;
      }
      
      // Se for um Firestore Timestamp
      if (appointmentDate && typeof appointmentDate.toDate === 'function') {
        return appointmentDate.toDate();
      }
      
      // Se for uma string ou Date object
      const date = new Date(appointmentDate);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.error('Data inválida encontrada:', appointmentDate);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Erro ao processar data do agendamento:', error);
      return null;
    }
  };

  // Carregar agendamentos e páginas
  useEffect(() => {
    console.log('LawyerAppointments useEffect:', { user: !!user, userData, userType: userData?.userType });
    
    if (user) {
      // Verificar se é advogado através do userData ou tentar carregar mesmo assim para debug
      if (userData?.userType === 'advogado' || userData?.userType === 'lawyer' || !userData?.userType) {
        loadAppointments();
        loadLawyerPages();
      } else {
        console.log('Usuário não é advogado:', userData?.userType);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user, userData]);

  // Carregar páginas do advogado
  const loadLawyerPages = async () => {
    try {
      const result = await lawyerPageService.getPagesByUser(user.uid);
      if (result.success) {
        setLawyerPages(result.data);
        console.log('Páginas do advogado carregadas:', result.data.length);
      } else {
        console.error('Erro ao carregar páginas:', result.error);
      }
    } catch (error) {
      console.error('Erro ao carregar páginas:', error);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    console.log('Carregando agendamentos para usuário:', user.uid);
    
    try {
      const result = await appointmentService.getAppointmentsByLawyer(user.uid);
      console.log('Resultado dos agendamentos:', result);
      
      if (result.success) {
        setAppointments(result.data);
        console.log('Agendamentos carregados:', result.data.length);
        
        // Debug: Verificar agendamentos pagos
        const paidAppointments = result.data.filter(apt => 
          apt.status === 'pago' || apt.status === 'confirmado' || apt.status === 'finalizado'
        );
        console.log('🔍 [LawyerAppointments] Agendamentos pagos encontrados:', paidAppointments.length);
        paidAppointments.forEach(apt => {
          console.log(`💰 Agendamento pago: ${apt.id} - ${apt.clientName} - R$ ${apt.finalPrice} - Status: ${apt.status}`);
        });
        
        if (paidAppointments.length > 0) {
          console.log('⚠️ [LawyerAppointments] Encontrados agendamentos pagos que podem precisar ser migrados para o sistema financeiro');
        }
      } else {
        console.error('Erro ao carregar agendamentos:', result.error);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para aplicar filtro de data
  const applyDateFilter = (appointment, dateFilterType) => {
    if (dateFilterType === 'todos') return true;
    
    const appointmentDate = parseAppointmentDate(appointment.appointmentDate);
    if (!appointmentDate) return false; // Se a data for inválida, não incluir no filtro
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilterType) {
      case 'hoje':
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return appointmentDate >= today && appointmentDate <= todayEnd;
      case 'semana':
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
      case 'mes':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return appointmentDate >= startOfMonth && appointmentDate <= endOfMonth;
      case 'range':
        if (customDateRange.startDate && customDateRange.endDate) {
          const startDate = new Date(customDateRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          return appointmentDate >= startDate && appointmentDate <= endDate;
        }
        return true;
      default:
        return true;
    }
  };

  // Função para contar agendamentos por filtro de data (considerando os filtros atuais)
  const getDateFilteredCount = (dateFilterType) => {
    return appointments.filter(appointment => {
      // Aplicar filtro de status atual se não for "todos"
      if (filter !== 'todos' && appointment.status !== filter) {
        return false;
      }
      
      // Aplicar filtro de página atual se não for "todas"
      if (pageFilter !== 'todas') {
        if (!appointment.paginaOrigem || appointment.paginaOrigem.id !== pageFilter) {
          return false;
        }
      }
      
      // Aplicar filtro de data
      return applyDateFilter(appointment, dateFilterType);
    }).length;
  };

  // Filtrar agendamentos por status, data e página
  const filteredAppointments = appointments.filter(appointment => {
    // Garante que o advogado logado é dono OU foi atribuído ao agendamento
    if (
      appointment.lawyerUserId !== user.uid &&
      appointment.assignedLawyerId !== user.uid
    ) {
      return false;
    }
    // Filtro por status
    if (filter !== 'todos' && appointment.status !== filter) {
      return false;
    }
    
    // Filtro por página de origem
    if (pageFilter !== 'todas') {
      if (!appointment.paginaOrigem || appointment.paginaOrigem.id !== pageFilter) {
        return false;
      }
    }
    
    // Filtro por data
    if (dateFilter !== 'todos') {
      const appointmentDate = parseAppointmentDate(appointment.appointmentDate);
      if (!appointmentDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      switch (dateFilter) {
        case 'hoje': {
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          return appointmentDate >= today && appointmentDate <= todayEnd;
        }
        case 'semana': {
          const startOfWeek = new Date(today);
          const dayOfWeek = today.getDay();
          startOfWeek.setDate(today.getDate() - dayOfWeek);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
        }
        case 'mes': {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          return appointmentDate >= startOfMonth && appointmentDate <= endOfMonth;
        }
        case 'range': {
          if (customDateRange.startDate && customDateRange.endDate) {
            const startDate = new Date(customDateRange.startDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(customDateRange.endDate);
            endDate.setHours(23, 59, 59, 999);
            return appointmentDate >= startDate && appointmentDate <= endDate;
          }
          return false;
        }
        default:
          return true;
      }
    }
    return true;
  });

  // Contar agendamentos por status (considerando filtro de data)
  const appointmentCounts = {
    todos: getDateFilteredCount('todos'),
    pendente: appointments.filter(a => {
      if (a.status !== 'pendente') return false;
      return applyDateFilter(a, dateFilter);
    }).length,
    aguardando_pagamento: appointments.filter(a => {
      if (a.status !== 'aguardando_pagamento') return false;
      return applyDateFilter(a, dateFilter);
    }).length,
    pago: appointments.filter(a => {
      if (a.status !== 'pago') return false;
      return applyDateFilter(a, dateFilter);
    }).length,
    confirmado: appointments.filter(a => {
      if (a.status !== 'confirmado') return false;
      return applyDateFilter(a, dateFilter);
    }).length,
    cancelado: appointments.filter(a => {
      if (a.status !== 'cancelado') return false;
      return applyDateFilter(a, dateFilter);
    }).length,
    finalizado: appointments.filter(a => {
      if (a.status !== 'finalizado') return false;
      return applyDateFilter(a, dateFilter);
    }).length,
    concluido: appointments.filter(a => {
      if (a.status !== 'concluido') return false;
      return applyDateFilter(a, dateFilter);
    }).length
  };

  // Funções de ação
  const handleConfirmAppointment = async (appointmentId) => {
    if (!finalPrice || parseFloat(finalPrice) <= 0) {
      alert('Por favor, informe o valor final da consulta.');
      return;
    }

    if (!videoCallLink || !videoCallLink.trim()) {
      alert('Por favor, informe o link da chamada de vídeo.');
      return;
    }

    // Validar se é um URL válido
    try {
      new URL(videoCallLink);
    } catch {
      alert('Por favor, informe um link válido para a chamada de vídeo.');
      return;
    }

    setActionLoading(true);
    try {
      const result = await appointmentService.confirmAppointment(appointmentId, parseFloat(finalPrice), videoCallLink);
      if (result.success) {
        await loadAppointments();
        setShowDetailsModal(false);
        setSelectedAppointment(null);
        setFinalPrice('');
        setVideoCallLink('');
        alert('Agendamento confirmado! O cliente receberá o link de pagamento.');
      } else {
        alert('Erro ao confirmar agendamento: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      alert('Erro ao confirmar agendamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAppointment = async (appointmentId, reason = '') => {
    setActionLoading(true);
    try {
      const result = await appointmentService.cancelAppointment(appointmentId, reason);
      if (result.success) {
        await loadAppointments();
        setShowDetailsModal(false);
        setSelectedAppointment(null);
        alert('Agendamento rejeitado.');
      } else {
        alert('Erro ao rejeitar agendamento: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao rejeitar agendamento:', error);
      alert('Erro ao rejeitar agendamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeAppointment = async (appointmentId) => {
    const confirmed = window.confirm(
      'Tem certeza que deseja marcar esta consulta como realizada?\n\n' +
      'Esta ação não pode ser desfeita e encerrará definitivamente o agendamento.'
    );
    
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const result = await appointmentService.finalizeAppointment(appointmentId, 'advogado');
      if (result.success) {
        await loadAppointments();
        alert('Consulta marcada como realizada com sucesso!');
      } else {
        alert('Erro ao finalizar consulta: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao finalizar consulta:', error);
      alert('Erro ao finalizar consulta.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailsModal = (appointment) => {
    setSelectedAppointment(appointment);
    setFinalPrice(appointment.finalPrice || '');
    setVideoCallLink(appointment.videoCallLink || '');
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedAppointment(null);
    setFinalPrice('');
    setVideoCallLink('');
  };

  // Função para adicionar agendamento à agenda
  const handleAddToCalendar = (appointment) => {
    setSelectedAppointmentForCalendar(appointment);
    setShowCalendarModal(true);
  };

  const closeCalendarModal = () => {
    setShowCalendarModal(false);
    setSelectedAppointmentForCalendar(null);
  };

  // Formatação
  const formatPrice = (price) => {
    if (!price) return '';
    if (price.minimo && price.maximo) {
      return `R$ ${parseFloat(price.minimo).toFixed(2).replace('.', ',')} - R$ ${parseFloat(price.maximo).toFixed(2).replace('.', ',')}`;
    }
    if (price.minimo) {
      return `A partir de R$ ${parseFloat(price.minimo).toFixed(2).replace('.', ',')}`;
    }
    if (price.maximo) {
      return `Até R$ ${parseFloat(price.maximo).toFixed(2).replace('.', ',')}`;
    }
    return 'Valor a combinar';
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'aguardando_pagamento':
        return 'bg-orange-100 text-orange-800';
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'finalizado':
        return 'bg-purple-100 text-purple-800';
      case 'concluido':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'aguardando_pagamento':
        return 'Aguardando Pagamento';
      case 'pago':
        return 'Pago';
      case 'confirmado':
        return 'Confirmado';
      case 'cancelado':
        return 'Cancelado';
      case 'finalizado':
        return 'Finalizado';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  // Função para cadastrar cliente
  const handleRegisterClient = async (appointment) => {
    const confirmed = window.confirm(
      `Deseja cadastrar ${appointment.clientName} como seu cliente?\n\n` +
      'Isso adicionará o cliente à sua base de clientes para futuras consultas.'
    );
    
    if (!confirmed) return;

    setActionLoading(true);
    try {
      // Verificar se cliente já existe
      const existingClient = await clientService.getClientByEmail(user.uid, appointment.clientEmail);
      
      if (existingClient.success && existingClient.data) {
        alert('Este cliente já está cadastrado em sua base de clientes.');
        return;
      }

      // Criar dados do cliente a partir do agendamento
      const clientData = {
        name: appointment.clientName,
        email: appointment.clientEmail,
        whatsapp: appointment.clientWhatsapp || '',
        source: 'agendamento',
        firstContactDate: appointment.createdAt || new Date(),
        history: [{
          type: 'agendamento',
          date: new Date(),
          description: `Cliente cadastrado através do agendamento de consulta em ${formatDateTime(appointment.appointmentDate)}`,
          appointmentId: appointment.id
        }],
        lgpdConsent: {
          accepted: true,
          date: new Date(),
          ipAddress: 'N/A (cadastro via agendamento)',
          version: '1.0'
        }
      };

      const result = await clientService.createClient(user.uid, clientData);
      
      if (result.success) {
        alert('Cliente cadastrado com sucesso!');
      } else {
        alert('Erro ao cadastrar cliente: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      alert('Erro ao cadastrar cliente.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meus Agendamentos</h1>
          <p className="text-gray-600 mt-2">Gerencie suas consultas e solicitações de agendamento</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          {[
            { key: 'todos', label: 'Total', icon: '📊' },
            { key: 'pendente', label: 'Pendentes', icon: '⏳' },
            { key: 'aguardando_pagamento', label: 'Aguard. Pagto', icon: '💳' },
            { key: 'pago', label: 'Pagos', icon: '💰' },
            { key: 'confirmado', label: 'Confirmados', icon: '✅' },
            { key: 'finalizado', label: 'Finalizados', icon: '🎯' },
            { key: 'cancelado', label: 'Cancelados', icon: '❌' }
          ].map(({ key, label, icon }) => (
            <div
              key={key}
              onClick={() => setFilter(key)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                filter === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-2xl font-bold text-gray-900">{appointmentCounts[key]}</div>
                <div className="text-sm text-gray-600">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros por Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Filtrar por Data</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { key: 'todos', label: 'Todas as Datas', icon: '📅', count: getDateFilteredCount('todos') },
                { key: 'hoje', label: 'Hoje', icon: '📌', count: getDateFilteredCount('hoje') },
                { key: 'semana', label: 'Esta Semana', icon: '📊', count: getDateFilteredCount('semana') },
                { key: 'mes', label: 'Este Mês', icon: '🗓️', count: getDateFilteredCount('mes') },
                { key: 'range', label: 'Período', icon: '🔍', count: dateFilter === 'range' ? getDateFilteredCount('range') : 0 }
              ].map(({ key, label, icon, count }) => (
                <div
                  key={key}
                  onClick={() => setDateFilter(key)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    dateFilter === key
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-lg font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Seletor de período personalizado */}
            {dateFilter === 'range' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <button
                      onClick={() => {
                        setCustomDateRange({ startDate: '', endDate: '' });
                        setDateFilter('todos');
                      }}
                      className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Limpar Período
                    </button>
                  </div>
                </div>
                
                {customDateRange.startDate && customDateRange.endDate && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Período selecionado:</strong> {' '}
                      {new Date(customDateRange.startDate).toLocaleDateString('pt-BR')} até {' '}
                      {new Date(customDateRange.endDate).toLocaleDateString('pt-BR')}
                      {' '}({getDateFilteredCount('range')} agendamento{getDateFilteredCount('range') !== 1 ? 's' : ''})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filtros por Página de Origem */}
        {lawyerPages.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Filtrar por Página de Origem</h3>
              <p className="text-sm text-gray-600 mt-1">Veja agendamentos que vieram de páginas específicas</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Opção "Todas as páginas" */}
                <div
                  onClick={() => setPageFilter('todas')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    pageFilter === 'todas'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🏠</div>
                    <div className="text-lg font-bold text-gray-900">
                      {appointments.length}
                    </div>
                    <div className="text-sm text-gray-600">Todas as páginas</div>
                  </div>
                </div>

                {/* Páginas específicas */}
                {lawyerPages.map((page) => {
                  const pageAppointments = appointments.filter(apt => 
                    apt.paginaOrigem && apt.paginaOrigem.id === page.id
                  );
                  
                  return (
                    <div
                      key={page.id}
                      onClick={() => setPageFilter(page.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        pageFilter === page.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">
                          {page.tipoPagina === 'escritorio' ? '🏢' : '👨‍💼'}
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {pageAppointments.length}
                        </div>
                        <div className="text-sm text-gray-600 truncate" title={page.nomePagina}>
                          {page.nomePagina}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {page.tipoPagina === 'escritorio' ? 'Escritório' : 'Advogado'}
                        </div>
                        {page.slug && (
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            /{page.slug}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Agendamentos sem página de origem */}
              {(() => {
                const appointmentsWithoutPage = appointments.filter(apt => !apt.paginaOrigem);
                if (appointmentsWithoutPage.length > 0) {
                  return (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Agendamentos sem página de origem
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {appointmentsWithoutPage.length} agendamento{appointmentsWithoutPage.length !== 1 ? 's' : ''} antigo{appointmentsWithoutPage.length !== 1 ? 's' : ''} criado{appointmentsWithoutPage.length !== 1 ? 's' : ''} antes desta funcionalidade
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-gray-600">
                          {appointmentsWithoutPage.length}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {/* Botão de Migração do Sistema Financeiro */}
        {(() => {
          const paidAppointments = appointments.filter(apt => 
            apt.status === 'pago' || apt.status === 'confirmado' || apt.status === 'finalizado'
          );
          
          if (paidAppointments.length > 0) {
            return (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-orange-800">
                        Sistema Financeiro - Migração Necessária
                      </h3>
                      <div className="mt-1 text-sm text-orange-700">
                        <p>Encontrados {paidAppointments.length} agendamento{paidAppointments.length !== 1 ? 's' : ''} pago{paidAppointments.length !== 1 ? 's' : ''} que precisa{paidAppointments.length === 1 ? '' : 'm'} ser migrado{paidAppointments.length !== 1 ? 's' : ''} para o sistema financeiro.</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const confirm = window.confirm(
                        `🚀 MIGRAÇÃO PARA SISTEMA FINANCEIRO\n\n` +
                        `Encontrados ${paidAppointments.length} agendamento${paidAppointments.length !== 1 ? 's' : ''} pago${paidAppointments.length !== 1 ? 's' : ''}.\n\n` +
                        `Esta operação irá:\n` +
                        `• Migrar pagamentos para o sistema financeiro\n` +
                        `• Calcular valores disponíveis (D+30)\n` +
                        `• Atualizar resumo financeiro\n` +
                        `• Evitar duplicatas automaticamente\n\n` +
                        `Deseja continuar?`
                      );
                      
                      if (!confirm) return;
                      
                      setActionLoading(true);
                      try {
                        console.log('🚀 Iniciando migração de agendamentos pagos...');
                        
                        // Importar utilitários de migração
                        const { 
                          migrateAppointmentsToFinancial,
                          generateMigrationReport 
                        } = await import('../utils/appointmentMigration');
                        
                        // Executar migração
                        const result = await migrateAppointmentsToFinancial(paidAppointments, user.uid);
                        
                        // Gerar relatório
                        const report = generateMigrationReport(result);
                        
                        // Mostrar resultado
                        alert(report);
                        
                        // Log detalhado no console
                        console.log('📊 Resultado completo da migração:', result);
                        
                        // Recarregar agendamentos para atualizar interface
                        await loadAppointments();
                        
                        // Sugerir verificar tela financeiro
                        if (result.migrated > 0) {
                          const checkFinancial = confirm(
                            `Migração concluída com sucesso!\n\n` +
                            `${result.migrated} pagamento${result.migrated !== 1 ? 's' : ''} migrado${result.migrated !== 1 ? 's' : ''}.\n\n` +
                            `Deseja ir para a tela financeiro para verificar os valores?`
                          );
                          
                          if (checkFinancial) {
                            // Se houver função de navegação para aba financeiro
                            // setActiveTab('financial'); // Descomentar se disponível
                            console.log('💡 Usuário pode verificar a tela financeiro agora');
                          }
                        }
                        
                      } catch (error) {
                        console.error('💥 Erro na migração:', error);
                        alert(`❌ Erro na migração: ${error.message}\n\nVerifique o console para mais detalhes.`);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrando...
                      </>
                    ) : (
                      <>🚀 Migrar para Sistema Financeiro</>
                    )}
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Lista de Agendamentos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {filter === 'todos' ? 'Todos os Agendamentos' : `Agendamentos ${getStatusText(filter)}`}
                {dateFilter !== 'todos' && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    • {dateFilter === 'hoje' ? 'Hoje' : 
                       dateFilter === 'semana' ? 'Esta Semana' : 
                       dateFilter === 'mes' ? 'Este Mês' : 
                       dateFilter === 'range' && customDateRange.startDate && customDateRange.endDate ? 
                         `${new Date(customDateRange.startDate).toLocaleDateString('pt-BR')} - ${new Date(customDateRange.endDate).toLocaleDateString('pt-BR')}` : 
                         'Período personalizado'}
                  </span>
                )}
              </h2>
              <div className="text-sm text-gray-500">
                {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-gray-600">
                {filter === 'todos' 
                  ? 'Você ainda não recebeu nenhuma solicitação de agendamento.'
                  : `Não há agendamentos com status "${getStatusText(filter)}".`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {appointment.clientName}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 4v10a1 1 0 01-1 1H9a1 1 0 01-1-1V11a1 1 0 011-1h6a1 1 0 011 1z" />
                          </svg>
                          <div>
                            <div className="font-medium">Data da Consulta</div>
                            <div>{formatDateTime(appointment.appointmentDate)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <div className="font-medium">Criado em</div>
                            <div>{formatDateTime(appointment.createdAt)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <div className="font-medium">Email</div>
                            <div className="truncate">{appointment.clientEmail}</div>
                          </div>
                        </div>
                        
                        {appointment.clientWhatsapp && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
                            </svg>
                            <a 
                              href={`https://wa.me/55${appointment.clientWhatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700"
                            >
                              {appointment.clientWhatsapp}
                            </a>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {formatPrice(appointment.proposedPrice)}
                        </div>
                      </div>
                      
                      {appointment.caseDescription && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <strong>Descrição do caso:</strong> {appointment.caseDescription}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-6 flex flex-col space-y-2">
                      <button
                        onClick={() => openDetailsModal(appointment)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Ver Detalhes
                      </button>
                      
                      {/* Botão para cadastrar cliente - disponível para agendamentos pagos/confirmados/finalizados */}
                      {(appointment.status === 'pago' || appointment.status === 'confirmado' || appointment.status === 'finalizado') && (
                        <button
                          onClick={() => handleRegisterClient(appointment)}
                          disabled={actionLoading}
                          className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors inline-flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Cadastrar Cliente
                        </button>
                      )}
                      
                      {appointment.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => openDetailsModal(appointment)}
                            className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleRejectAppointment(appointment.id, 'Rejeitado pelo advogado')}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      
                      {(appointment.status === 'pago' || appointment.status === 'confirmado') && (
                        <>
                          {appointment.videoCallLink && (
                            <a
                              href={appointment.videoCallLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-center inline-flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Entrar na Chamada
                            </a>
                          )}
                          <button
                            onClick={() => handleAddToCalendar(appointment)}
                            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Adicionar à Agenda
                          </button>
                          <button
                            onClick={() => handleFinalizeAppointment(appointment.id)}
                            className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            Consulta Realizada
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes do Agendamento
              </h2>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Chat de Mensagens */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Comunicação</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-hidden">
                  <AppointmentChat 
                    appointmentId={selectedAppointment.id}
                    lawyerName={userData?.name || 'Advogado'}
                    clientName={selectedAppointment.clientName}
                  />
                </div>
              </div>

              {/* Informações do Cliente */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {/* Código do Cliente */}
                  {selectedAppointment.clientCode && (
                    <div>
                      <ClientCodeDisplay 
                        clientCode={selectedAppointment.clientCode}
                        clientName={selectedAppointment.clientName}
                        size="small"
                      />
                    </div>
                  )}
                  
                  <p><strong>Nome:</strong> {selectedAppointment.clientName}</p>
                  <p><strong>Email:</strong> {selectedAppointment.clientEmail}</p>
                  {selectedAppointment.clientWhatsapp && (
                    <p><strong>WhatsApp:</strong> 
                      <a 
                        href={`https://wa.me/55${selectedAppointment.clientWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-green-600 hover:text-green-700"
                      >
                        {selectedAppointment.clientWhatsapp}
                      </a>
                    </p>
                  )}
                  <p><strong>Data da Solicitação:</strong> {formatDateTime(selectedAppointment.createdAt)}</p>
                </div>
              </div>
              
              {/* Página de Origem */}
              {selectedAppointment.paginaOrigem && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Página de Origem</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">
                          {selectedAppointment.paginaOrigem.nomePagina}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedAppointment.paginaOrigem.tipoPagina === 'escritorio' ? 'Escritório de Advocacia' : 'Página de Advogado'}
                        </p>
                        {selectedAppointment.paginaOrigem.slug && (
                          <p className="text-xs text-blue-600 mt-1">
                            /{selectedAppointment.paginaOrigem.slug}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Informações da Consulta */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações da Consulta</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Data e Horário:</strong> {formatDateTime(selectedAppointment.appointmentDate)}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusText(selectedAppointment.status)}
                    </span>
                  </p>
                  <p><strong>Valor Proposto:</strong> {formatPrice(selectedAppointment.proposedPrice)}</p>
                </div>
              </div>
              
              {/* Descrição do Caso */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição do Caso</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedAppointment.caseDescription}</p>
                </div>
              </div>
              
              {/* Informações para Agendamentos Confirmados/Pagos */}
              {(selectedAppointment.status === 'pago' || selectedAppointment.status === 'confirmado') && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações da Consulta</h3>
                  <div className="space-y-4">
                    {selectedAppointment.finalPrice && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-green-800">Pagamento Confirmado</h4>
                            <p className="text-sm text-green-700">
                              Valor: R$ {parseFloat(selectedAppointment.finalPrice).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAppointment.videoCallLink && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-800 mb-2">Link da Videochamada</h4>
                            <p className="text-sm text-blue-700 mb-3">
                              Acesse o link abaixo no horário agendado para iniciar a consulta:
                            </p>
                            <div className="flex items-center space-x-3">
                              <a
                                href={selectedAppointment.videoCallLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Iniciar Videochamada
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedAppointment.videoCallLink);
                                  alert('Link copiado para a área de transferência!');
                                }}
                                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h-8a2 2 0 01-2-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar Link
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          <h4 className="font-semibold mb-1">Lembrete:</h4>
                          <ul className="space-y-1">
                            <li>• Teste o link da chamada antes do horário agendado</li>
                            <li>• Tenha os documentos relacionados ao caso em mãos</li>
                            <li>• Após a consulta, clique em "Consulta Realizada"</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Ações para Agendamentos Pendentes */}
              {selectedAppointment.status === 'pendente' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Confirmar Agendamento</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor Final da Consulta (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={finalPrice}
                        onChange={(e) => setFinalPrice(e.target.value)}
                        placeholder="Ex: 150.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Valor dentro do range: {formatPrice(selectedAppointment.proposedPrice)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link da Chamada de Vídeo *
                      </label>
                      <input
                        type="url"
                        value={videoCallLink}
                        onChange={(e) => setVideoCallLink(e.target.value)}
                        placeholder="Ex: https://meet.google.com/abc-defg-hij ou https://zoom.us/j/123456789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Google Meet, Zoom, Teams ou qualquer plataforma de vídeo
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-800">
                          <h4 className="font-semibold mb-1">Próximos passos:</h4>
                          <ul className="space-y-1">
                            <li>• O cliente receberá o valor final para aprovação</li>
                            <li>• Será gerado um link de pagamento (PIX, Boleto ou Cartão)</li>
                            <li>• Após o pagamento, o cliente terá acesso ao link da chamada</li>
                            <li>• O agendamento poderá ser adicionado à agenda do cliente</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleConfirmAppointment(selectedAppointment.id)}
                        disabled={actionLoading || !finalPrice || !videoCallLink}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'Confirmando...' : 'Confirmar Agendamento'}
                      </button>
                      <button
                        onClick={() => handleRejectAppointment(selectedAppointment.id, 'Rejeitado pelo advogado')}
                        disabled={actionLoading}
                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'Rejeitando...' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição à Agenda */}
      {showCalendarModal && selectedAppointmentForCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Adicionar à Minha Agenda
              </h2>
              <button
                onClick={closeCalendarModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={`Consulta com ${selectedAppointmentForCalendar.clientName}`}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Horário da Consulta *
                </label>
                <input
                  type="text"
                  value={formatDateTime(selectedAppointmentForCalendar.appointmentDate)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duração (em minutos) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={60}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link da Chamada de Vídeo
                </label>
                <input
                  type="url"
                  value={selectedAppointmentForCalendar.videoCallLink}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={async () => {
                    try {
                      const evento = criarEventoConsulta(selectedAppointmentForCalendar);
                      
                      // Criar evento na agenda interna
                      const eventData = {
                        title: evento.titulo,
                        description: evento.descricao,
                        date: evento.dataInicio.toISOString().split('T')[0], // YYYY-MM-DD
                        time: evento.dataInicio.toTimeString().substring(0, 5), // HH:MM
                        duration: 60, // minutos
                        type: 'consulta',
                        location: evento.local,
                        clientName: selectedAppointmentForCalendar.clientName,
                        clientEmail: selectedAppointmentForCalendar.clientEmail,
                        appointmentId: selectedAppointmentForCalendar.id,
                        videoCallLink: selectedAppointmentForCalendar.videoCallLink,
                        status: 'confirmado'
                      };

                      const result = await calendarStorageService.createEvent(user.uid, eventData);
                      
                      if (result.success) {
                        alert('Consulta adicionada à agenda interna com sucesso!');
                      } else {
                        alert('Erro ao adicionar à agenda interna: ' + result.error);
                      }
                    } catch (error) {
                      console.error('Erro ao adicionar à agenda interna:', error);
                      alert('Erro ao adicionar à agenda interna.');
                    }
                    closeCalendarModal();
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Adicionar à Agenda DireitoHub
                </button>
                
                <hr className="my-2" />
                
                <button
                  onClick={() => {
                    const evento = criarEventoConsulta(selectedAppointmentForCalendar);
                    const googleLink = generateGoogleCalendarLink(evento);
                    window.open(googleLink, '_blank');
                    closeCalendarModal();
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-5 2v2H8V5h6m3 4H6v8h12V9z"/>
                  </svg>
                  Google Calendar
                </button>
                
                <button
                  onClick={() => {
                    const evento = criarEventoConsulta(selectedAppointmentForCalendar);
                    const outlookLink = generateOutlookLink(evento);
                    window.open(outlookLink, '_blank');
                    closeCalendarModal();
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 6v12l10-6z"/>
                  </svg>
                  Outlook
                </button>
                
                <button
                  onClick={() => {
                    const evento = criarEventoConsulta(selectedAppointmentForCalendar);
                    const icsContent = generateICSFile(evento);
                    downloadICSFile(icsContent, `consulta-${selectedAppointmentForCalendar.clientName}.ics`);
                    closeCalendarModal();
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Baixar Arquivo (.ics)
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p><strong>💡 Agenda DireitoHub:</strong> Adiciona o evento à agenda interna do sistema, visível na aba "Agenda".</p>
                    <p><strong>📅 Calendários Externos:</strong> Criam eventos em suas agendas pessoais (Google, Outlook, etc.).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LawyerAppointments;