import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService, lawyerPageService } from '../firebase/firestore';

const EnhancedCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [lawyerPages, setLawyerPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day', 'list'
  const [selectedDate, setSelectedDate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPage, setSelectedPage] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('confirmado-pago-aguardando'); // Mostrar confirmado, pago e aguardando_pagamento por padrão
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [quickFilter, setQuickFilter] = useState('all'); // hoje, semana, mes

  // Carregar dados
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentsResult, pagesResult] = await Promise.all([
        appointmentService.getLawyerAppointments(user.uid),
        lawyerPageService.getUserPages(user.uid)
      ]);

      if (appointmentsResult.success) {
        const appointmentsWithDates = appointmentsResult.data.map(apt => ({
          ...apt,
          dateObj: parseAppointmentDate(apt.appointmentDate)
        }));
        setAppointments(appointmentsWithDates);
      }

      if (pagesResult.success) {
        setLawyerPages(pagesResult.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseAppointmentDate = (appointmentDate) => {
    try {
      if (!appointmentDate) return null;
      if (appointmentDate && typeof appointmentDate.toDate === 'function') {
        return appointmentDate.toDate();
      }
      const date = new Date(appointmentDate);
      return isNaN(date) ? null : date;
    } catch (error) {
      console.error('Erro ao processar data:', error);
      return null;
    }
  };

  // Filtrar appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Filtro por texto (nome do cliente ou descrição)
      const searchMatch = searchTerm === '' || 
        (apt.clientName && apt.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (apt.serviceDescription && apt.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por página
      const pageMatch = selectedPage === 'all' || apt.selectedPageId === selectedPage;

      // Filtro por status
      const statusMatch = selectedStatus === 'all' || 
        (selectedStatus === 'confirmado-pago-aguardando' && (apt.status === 'confirmado' || apt.status === 'pago' || apt.status === 'aguardando_pagamento')) ||
        (selectedStatus === 'confirmado-pago' && (apt.status === 'confirmado' || apt.status === 'pago')) ||
        apt.status === selectedStatus;

      // Filtro rápido por período
      let quickFilterMatch = true;
      if (quickFilter !== 'all' && apt.dateObj) {
        const today = new Date();
        const aptDate = apt.dateObj;
        
        switch (quickFilter) {
          case 'hoje':
            quickFilterMatch = aptDate.toDateString() === today.toDateString();
            break;
          case 'semana':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            quickFilterMatch = aptDate >= weekStart && aptDate <= weekEnd;
            break;
          case 'mes':
            quickFilterMatch = aptDate.getMonth() === today.getMonth() && 
                              aptDate.getFullYear() === today.getFullYear();
            break;
          case 'futuro':
            quickFilterMatch = aptDate >= today;
            break;
          case 'passado':
            quickFilterMatch = aptDate < today;
            break;
        }
      }

      // Filtro por data customizada
      let dateMatch = true;
      if (dateRange.start && apt.dateObj) {
        dateMatch = apt.dateObj >= new Date(dateRange.start);
      }
      if (dateRange.end && apt.dateObj && dateMatch) {
        dateMatch = apt.dateObj <= new Date(dateRange.end + 'T23:59:59');
      }

      return searchMatch && pageMatch && statusMatch && quickFilterMatch && dateMatch;
    });
  }, [appointments, searchTerm, selectedPage, selectedStatus, quickFilter, dateRange]);

  // Obter appointments para um dia específico
  const getAppointmentsForDay = (date) => {
    if (!date) return [];
    const dateStr = date.toDateString();
    return filteredAppointments.filter(apt => 
      apt.dateObj && apt.dateObj.toDateString() === dateStr
    );
  };

  // Gerar calendário do mês
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    const colors = {
      'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'confirmado': 'bg-blue-100 text-blue-800 border-blue-200',
      'pago': 'bg-green-100 text-green-800 border-green-200',
      'finalizado': 'bg-gray-100 text-gray-800 border-gray-200',
      'cancelado': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Navegação de mês
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Hoje
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Resetar filtros
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPage('all');
    setSelectedStatus('confirmado-pago-aguardando');
    setQuickFilter('all');
    setDateRange({ start: '', end: '' });
  };

  // Calcular estatísticas
  const stats = useMemo(() => {
    const today = new Date();
    const thisMonth = appointments.filter(apt => 
      apt.dateObj && 
      apt.dateObj.getMonth() === today.getMonth() && 
      apt.dateObj.getFullYear() === today.getFullYear()
    );
    
    return {
      total: appointments.length,
      thisMonth: thisMonth.length,
      today: appointments.filter(apt => 
        apt.dateObj && apt.dateObj.toDateString() === today.toDateString()
      ).length,
      pending: appointments.filter(apt => apt.status === 'pendente').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmado').length,
      paid: appointments.filter(apt => apt.status === 'pago').length,
      totalRevenue: appointments
        .filter(apt => apt.status === 'pago' && apt.finalPrice)
        .reduce((sum, apt) => sum + parseFloat(apt.finalPrice || 0), 0)
    };
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header com controles */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">📅 Agenda</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-800 min-w-[200px] text-center">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Hoje
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modos de visualização */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'month', icon: '📅', label: 'Mês' },
                { key: 'list', icon: '📋', label: 'Lista' }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === mode.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={mode.label}
                >
                  {mode.icon}
                </button>
              ))}
            </div>

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title="Filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.121A1 1 0 013 6.414V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {/* Filtros rápidos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">⚡ Filtros Rápidos</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Todos', icon: '📅' },
                  { key: 'hoje', label: 'Hoje', icon: '🔥' },
                  { key: 'semana', label: 'Esta Semana', icon: '📅' },
                  { key: 'mes', label: 'Este Mês', icon: '🗓️' },
                  { key: 'futuro', label: 'Próximos', icon: '⏭️' },
                  { key: 'passado', label: 'Anteriores', icon: '⏮️' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => applyQuickFilter(filter.key)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      quickFilter === filter.key
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Busca por cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Buscar Cliente
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome do cliente..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtro por página */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 Página
                </label>
                <select
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todas as páginas</option>
                  {lawyerPages.map(page => (
                    <option key={page.id} value={page.id}>
                      {page.nomePagina}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="confirmado-pago-aguardando">✅ Confirmado, Pagos e Aguardando</option>
                  <option value="pendente">⏳ Pendente</option>
                  <option value="confirmado">✅ Confirmado</option>
                  <option value="pago">💳 Pago</option>
                  <option value="aguardando_pagamento">💰 Aguardando Pagamento</option>
                  <option value="finalizado">🏁 Finalizado</option>
                  <option value="cancelado">❌ Cancelado</option>
                </select>
              </div>

              {/* Período customizado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Período Customizado
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange(prev => ({ ...prev, start: e.target.value }));
                      if (e.target.value) setQuickFilter('all'); // Limpar filtro rápido
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Início"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange(prev => ({ ...prev, end: e.target.value }));
                      if (e.target.value) setQuickFilter('all'); // Limpar filtro rápido
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Fim"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                📊 {filteredAppointments.length} de {appointments.length} agendamentos encontrados
                {quickFilter !== 'all' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    Filtro: {quickFilter}
                  </span>
                )}
              </div>
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                🗑️ Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visualização do calendário */}
      <div className="p-6">
        {/* Painel de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            <div className="text-sm text-blue-600">📅 Total</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.today}</div>
            <div className="text-sm text-green-600">🔥 Hoje</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.thisMonth}</div>
            <div className="text-sm text-purple-600">🗓️ Este Mês</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
            <div className="text-sm text-yellow-600">⏳ Pendentes</div>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-cyan-700">{stats.confirmed}</div>
            <div className="text-sm text-cyan-600">✅ Confirmados</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-emerald-700">R$ {stats.totalRevenue.toFixed(2)}</div>
            <div className="text-sm text-emerald-600">💰 Receita</div>
          </div>
        </div>
        {viewMode === 'month' ? (
          <div className="space-y-4">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50 rounded-lg">
                  {day}
                </div>
              ))}
            </div>

            {/* Grade do calendário */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((date, index) => {
                const dayAppointments = getAppointmentsForDay(date);
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                      isCurrentMonth
                        ? isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : isToday
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentMonth
                        ? isToday
                          ? 'text-yellow-700'
                          : 'text-gray-900'
                        : 'text-gray-400'
                    }`}>
                      {date.getDate()}
                    </div>

                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map((apt, i) => (
                        <div
                          key={i}
                          className={`text-xs p-1 rounded border ${getStatusColor(apt.status)}`}
                          title={`${apt.clientName} - ${apt.serviceDescription}`}
                        >
                          <div className="truncate font-medium">
                            {apt.clientName}
                          </div>
                          <div className="truncate">
                            {apt.appointmentDate && new Date(apt.appointmentDate.seconds * 1000).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayAppointments.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Visualização em lista */
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedPage !== 'all' || selectedStatus !== 'all' || dateRange.start || dateRange.end
                    ? 'Tente ajustar os filtros para ver mais resultados.'
                    : 'Você não possui agendamentos no momento.'
                  }
                </p>
              </div>
            ) : (
              filteredAppointments.map(apt => {
                const pageName = lawyerPages.find(p => p.id === apt.selectedPageId)?.nomePagina || 'Página não encontrada';
                
                return (
                  <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {apt.clientName}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>📧 Email:</strong> {apt.clientEmail}</p>
                            <p><strong>📱 Telefone:</strong> {apt.clientPhone}</p>
                            <p><strong>📄 Página:</strong> {pageName}</p>
                          </div>
                          <div>
                            <p><strong>📅 Data:</strong> {
                              apt.dateObj ? apt.dateObj.toLocaleDateString('pt-BR') : 'Data não disponível'
                            }</p>
                            <p><strong>⏰ Horário:</strong> {
                              apt.appointmentDate && apt.appointmentDate.seconds 
                                ? new Date(apt.appointmentDate.seconds * 1000).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Horário não disponível'
                            }</p>
                            <p><strong>💰 Valor:</strong> R$ {apt.finalPrice || '0,00'}</p>
                          </div>
                        </div>
                        
                        {apt.serviceDescription && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-700">
                              <strong>📝 Descrição:</strong> {apt.serviceDescription}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {apt.meetingLink && apt.status !== 'cancelado' && (
                          <a
                            href={apt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            📹 Entrar
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal de detalhes do dia selecionado */}
      {selectedDate && viewMode === 'month' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                📅 {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {getAppointmentsForDay(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-gray-600">Nenhum agendamento para este dia.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getAppointmentsForDay(selectedDate).map(apt => {
                    const pageName = lawyerPages.find(p => p.id === apt.selectedPageId)?.nomePagina || 'Página não encontrada';
                    
                    return (
                      <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{apt.clientName}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          <p><strong>📧</strong> {apt.clientEmail}</p>
                          <p><strong>📱</strong> {apt.clientPhone}</p>
                          <p><strong>📄</strong> {pageName}</p>
                          <p><strong>⏰</strong> {
                            apt.appointmentDate && apt.appointmentDate.seconds 
                              ? new Date(apt.appointmentDate.seconds * 1000).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Horário não disponível'
                          }</p>
                          <p><strong>💰</strong> R$ {apt.finalPrice || '0,00'}</p>
                        </div>
                        
                        {apt.serviceDescription && (
                          <p className="text-sm text-gray-700 mb-3">
                            <strong>📝</strong> {apt.serviceDescription}
                          </p>
                        )}
                        
                        {apt.meetingLink && apt.status !== 'cancelado' && (
                          <a
                            href={apt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            📹 Entrar na Chamada
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCalendar;
