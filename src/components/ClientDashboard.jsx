import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService, userService } from '../firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ClientAppointments from './ClientAppointments';
import UserCodeDisplay from './UserCodeDisplay';

const ClientDashboard = () => {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('appointments'); // 'appointments', 'profile'
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    dateOfBirth: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  // Atualizar profileData quando userData estiver disponível
  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        cpf: userData.cpf || '',
        dateOfBirth: userData.dateOfBirth || '',
        address: userData.address || {
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        }
      });
    }
  }, [userData]);

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      if (user?.uid) {
        console.log('📥 ClientDashboard carregando agendamentos para:', user.uid);
        const result = await appointmentService.getAppointmentsByClient(user.uid);
        if (result.success) {
          console.log('✅ Agendamentos carregados:', result.data.length);
          result.data.forEach(apt => {
            console.log('📋 Agendamento:', {
              id: apt.id,
              lawyerName: apt.lawyerName,
              paginaOrigem: apt.paginaOrigem,
              selectedPageId: apt.selectedPageId
            });
          });
          setAppointments(result.data);
        } else {
          console.error('Erro ao carregar agendamentos:', result.error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        const result = await appointmentService.cancelAppointment(appointmentId, 'Cancelado pelo cliente');
        if (result.success) {
          await loadAppointments(); // Recarregar lista
          alert('Agendamento cancelado com sucesso!');
        } else {
          alert('Erro ao cancelar agendamento: ' + result.error);
        }
      } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        alert('Erro ao cancelar agendamento');
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const result = await userService.updateUser(user.uid, {
        ...profileData,
        userType: 'cliente'
      });
      
      if (result.success) {
        alert('Perfil atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar perfil: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      try {
        await logout();
        navigate('/');
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'pendente': 'bg-yellow-100 text-yellow-800',
      'confirmado': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800',
      'concluido': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      'pendente': 'Pendente',
      'confirmado': 'Confirmado',
      'cancelado': 'Cancelado',
      'concluido': 'Concluído'
    };
    return texts[status] || status;
  };

  const renderAppointments = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Meus Agendamentos</h2>
        <p className="text-gray-600 mt-1">Visualize e gerencie seus agendamentos</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Carregando agendamentos...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-gray-600">Você ainda não possui agendamentos registrados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{appointment.lawyerName}</h3>
                  <p className="text-gray-600">{appointment.subject || 'Consulta Jurídica'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                  </svg>
                  <span>{formatDate(appointment.appointmentDate)}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatTime(appointment.appointmentDate)}</span>
                </div>
              </div>

              {appointment.notes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <strong>Observações:</strong> {appointment.notes}
                  </p>
                </div>
              )}

              {appointment.paginaOrigem && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">📄 Página de Origem</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>{appointment.paginaOrigem.nomePagina}</strong>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {appointment.paginaOrigem.tipoPagina === 'escritorio' ? 'Escritório de Advocacia' : 'Página de Advogado'}
                      </p>
                      {appointment.paginaOrigem.slug && (
                        <p className="text-xs text-blue-500 mt-1">
                          /{appointment.paginaOrigem.slug}
                        </p>
                      )}
                    </div>
                    {(appointment.paginaOrigem?.slug || appointment.selectedPageId) && (
                      <a
                        href={appointment.paginaOrigem?.slug ? `/advogado/${appointment.paginaOrigem.slug}` : `/page/${appointment.selectedPageId}`}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors whitespace-nowrap ml-3"
                      >
                        Visitar
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-500">
                  Criado em {formatDate(appointment.createdAt)}
                </div>
                
                <div className="flex gap-2">
                  {appointment.status === 'pendente' && (
                    <button
                      onClick={() => handleCancelAppointment(appointment.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>
        <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
      </div>

      <form onSubmit={handleUpdateProfile} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF
            </label>
            <input
              type="text"
              value={profileData.cpf}
              onChange={(e) => setProfileData(prev => ({ ...prev, cpf: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Nascimento
            </label>
            <input
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rua
              </label>
              <input
                type="text"
                value={profileData.address.street}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número
              </label>
              <input
                type="text"
                value={profileData.address.number}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, number: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={profileData.address.neighborhood}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, neighborhood: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={profileData.address.city}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={profileData.address.state}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEP
              </label>
              <input
                type="text"
                value={profileData.address.zipCode}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, zipCode: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading state quando userData ainda não está disponível */}
      {!userData ? (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando dados do usuário...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard do Cliente</h1>
                    <p className="text-gray-600">Bem-vindo, {userData?.name || 'Cliente'}</p>
                  </div>
                  
                  {/* Código do Cliente */}
                  <div className="hidden md:block">
                    <UserCodeDisplay showLabel={true} />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{userData?.email}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso de versão global */}
          <div className="w-full bg-yellow-200 text-yellow-900 text-center py-2 text-sm font-semibold shadow-sm z-40">
            ⚠️ Sistema em Versão V.1.6.0 BETA — Algumas funcionalidades estão em teste. Caso encontre instabilidades, reporte ao suporte.
          </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setCurrentView('appointments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
              </svg>
              Agendamentos
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Meu Perfil
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'appointments' && <ClientAppointments />}
        {currentView === 'profile' && renderProfile()}
      </div>
        </>
      )}
    </div>
  );
};

export default ClientDashboard;
