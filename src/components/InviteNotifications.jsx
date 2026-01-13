  const handleDeleteInvite = async (inviteId) => {
    if (!window.confirm('Tem certeza que deseja excluir este convite?')) return;
    try {
      await collaborationService.deleteInvite(inviteId);
      setSentInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Erro ao excluir convite:', error);
      alert('Erro ao excluir convite. Tente novamente.');
    }
  };
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collaborationService } from '../firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const InviteNotifications = () => {
  const { user } = useAuth();
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 InviteNotifications - useEffect executado');
    console.log('👤 Usuário atual:', user);
    
    if (!user?.email) {
      console.log('❌ Usuário não logado ou sem email');
      setLoading(false);
      return;
    }

    console.log('✅ Usuário logado:', user.email, 'UID:', user.uid);

    let isMounted = true;
    let pollInterval = null;

    const loadInvites = async () => {
      try {
        console.log('📥 Carregando convites recebidos...');
        
        // Query 1: por UID
        const receivedQuery1 = query(
          collection(db, 'collaboration_invites'),
          where('targetUserId', '==', user.uid),
          where('status', '==', 'pending')
        );

        // Query 2: por email
        const receivedQuery2 = query(
          collection(db, 'collaboration_invites'),
          where('recipientEmail', '==', user.email),
          where('status', '==', 'pending')
        );

        // Query 3: convites enviados
        const sentQuery = query(
          collection(db, 'collaboration_invites'),
          where('senderUserId', '==', user.uid)
        );

        try {
          const [snapshot1, snapshot2, sentSnapshot] = await Promise.all([
            getDocs(receivedQuery1).catch(err => {
              console.warn('Aviso ao buscar convites por UID:', err.message);
              return { docs: [] };
            }),
            getDocs(receivedQuery2).catch(err => {
              console.warn('Aviso ao buscar convites por email:', err.message);
              return { docs: [] };
            }),
            getDocs(sentQuery).catch(err => {
              console.warn('Aviso ao buscar convites enviados:', err.message);
              return { docs: [] };
            })
          ]);

          if (!isMounted) return;

          // Processar convites recebidos
          const receivedInvitesData = [];
          const uniqueIds = new Set();

          for (const doc of [...snapshot1.docs, ...snapshot2.docs]) {
            if (uniqueIds.has(doc.id)) continue;
            uniqueIds.add(doc.id);

            const inviteData = doc.data();
            console.log('📄 Convite recebido:', doc.id, inviteData.status);
            
            try {
              const senderData = await collaborationService.getUserById(inviteData.senderUserId);
              const pageData = await collaborationService.getPageById(inviteData.pageId);
              receivedInvitesData.push({
                id: doc.id,
                ...inviteData,
                senderName: senderData?.data?.displayName || senderData?.data?.name || 'Usuário',
                pageName: pageData?.data?.name || 'Página'
              });
            } catch (error) {
              console.warn('Erro ao buscar dados do convite:', error.message);
              receivedInvitesData.push({
                id: doc.id,
                ...inviteData,
                senderName: 'Usuário',
                pageName: 'Página'
              });
            }
          }

          // Processar convites enviados
          const sentInvitesData = [];
          for (const doc of sentSnapshot.docs) {
            const inviteData = doc.data();
            console.log('📤 Convite enviado:', doc.id);
            
            try {
              const pageData = await collaborationService.getPageById(inviteData.pageId);
              sentInvitesData.push({
                id: doc.id,
                ...inviteData,
                pageName: pageData?.data?.name || 'Página'
              });
            } catch (error) {
              console.warn('Erro ao buscar dados do convite enviado:', error.message);
              sentInvitesData.push({
                id: doc.id,
                ...inviteData,
                pageName: 'Página'
              });
            }
          }

          if (isMounted) {
            setReceivedInvites(receivedInvitesData);
            setSentInvites(sentInvitesData);
            setLoading(false);
          }
        } catch (error) {
          console.error('Erro ao carregar convites:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Erro inesperado ao carregar convites:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Carregar inicial
    loadInvites();

    // Polling a cada 10 segundos em vez de listeners em tempo real
    // Isto evita os erros internos do Firebase SDK com watch_change
    pollInterval = setInterval(loadInvites, 10000);

    return () => {
      console.log('🧹 Limpando polling de convites...');
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user]);

  const handleDeleteInvite = async (inviteId) => {
    if (!window.confirm('Tem certeza que deseja excluir este convite?')) return;
    try {
      await collaborationService.deleteInvite(inviteId);
      setSentInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Erro ao excluir convite:', error);
      alert('Erro ao excluir convite. Tente novamente.');
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      await collaborationService.acceptInvite(inviteId);
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      alert('Erro ao aceitar convite. Tente novamente.');
    }
  };

  const handleDeclineInvite = async (inviteId) => {
    try {
      await collaborationService.declineInvite(inviteId);
    } catch (error) {
      console.error('Erro ao recusar convite:', error);
      alert('Erro ao recusar convite. Tente novamente.');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
      accepted: { label: 'Aceito', class: 'bg-green-100 text-green-800' },
      declined: { label: 'Recusado', class: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      owner: 'Proprietário',
      lawyer: 'Advogado',
      intern: 'Estagiário',
      financial: 'Financeiro'
    };
    return roleLabels[role] || role;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-300 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">🔄 Carregando convites...</p>
      </div>
    );
  }

  // Sempre mostrar algo para debug
  console.log('🎯 Renderizando InviteNotifications:', {
    receivedInvites: receivedInvites.length,
    sentInvites: sentInvites.length,
    user: user?.email
  });

  return (
    <div className="space-y-4 mb-6">
      {/* Debug Info - Sempre mostrar */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          🔍 Status do Sistema de Convites
        </h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>👤 Usuário: {user?.email || 'Não logado'}</p>
          <p>📥 Convites recebidos: {receivedInvites.length}</p>
          <p>📤 Convites enviados: {sentInvites.length}</p>
          <p>⏳ Carregando: {loading ? 'Sim' : 'Não'}</p>
        </div>
      </div>

      {/* Convites Recebidos */}
      {receivedInvites.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            📬 Convites Recebidos 
            <span className="ml-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
              {receivedInvites.length}
            </span>
          </h3>
          <div className="space-y-3">
            {receivedInvites.map((invite) => (
              <div key={invite.id} className="bg-white border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      <strong>{invite.senderName}</strong> te convidou para colaborar em{' '}
                      <strong>"{invite.pageName}"</strong>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Nível: <span className="font-medium">{getRoleLabel(invite.role)}</span>
                    </p>
                    {invite.message && (
                      <p className="text-xs text-gray-600 mt-1 italic bg-gray-50 p-2 rounded">
                        "{invite.message}"
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Enviado em: {new Date(invite.createdAt?.toDate()).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleAcceptInvite(invite.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      ✓ Aceitar
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      ✕ Recusar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convites Enviados - Status dos seus convites */}
      {sentInvites.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
            📤 Meus Convites Enviados
            <span className="ml-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">
              {sentInvites.length}
            </span>
          </h3>
          <div className="space-y-3">
            {sentInvites.map((invite) => (
              <div key={invite.id} className="bg-white border border-yellow-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      Convite para <strong>{invite.recipientEmail}</strong> em{' '}
                      <strong>"{invite.pageName}"</strong>
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <p className="text-xs text-gray-600">
                        Nível: <span className="font-medium">{getRoleLabel(invite.role)}</span>
                      </p>
                      {getStatusBadge(invite.status)}
                    </div>
                    {invite.message && (
                      <p className="text-xs text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">
                        Mensagem: "{invite.message}"
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Enviado em: {new Date(invite.createdAt?.toDate()).toLocaleDateString('pt-BR')}
                      {invite.respondedAt && (
                        <span className="ml-2">
                          • Respondido em: {new Date(invite.respondedAt?.toDate()).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    {/* Botão de excluir convite */}
                    <button
                      className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                      onClick={() => handleDeleteInvite(invite.id)}
                      title="Excluir convite"
                    >
                      Excluir
                    </button>
                    {invite.status === 'pending' && (
                      <div className="text-xs text-gray-500 italic">
                        ⏳ Aguardando resposta
                      </div>
                    )}
                    {invite.status === 'accepted' && (
                      <div className="text-xs text-green-600 font-medium">
                        ✅ Colaboração ativa
                      </div>
                    )}
                    {invite.status === 'declined' && (
                      <div className="text-xs text-red-600 font-medium">
                        ❌ Convite recusado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteNotifications;
