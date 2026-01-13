import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService } from '../firebase/firestore';

const AppointmentChat = ({ appointmentId, lawyerName, clientName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const previousMessagesCountRef = useRef(0);

  useEffect(() => {
    loadMessages();
    // Recarregar mensagens a cada 3 segundos
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [appointmentId]);

  const scrollToBottom = () => {
    // Usar apenas scroll do próprio container, não propagar para elementos pais
    if (messagesEndRef.current?.parentElement) {
      messagesEndRef.current.parentElement.scrollTop = messagesEndRef.current.parentElement.scrollHeight;
    }
  };

  useEffect(() => {
    // Apenas fazer scroll se há novas mensagens (evita scroll automático contínuo)
    if (messages.length > previousMessagesCountRef.current) {
      scrollToBottom();
    }
    previousMessagesCountRef.current = messages.length;
  }, [messages]);

  const loadMessages = async () => {
    try {
      const result = await appointmentService.getAppointmentMessages(appointmentId);
      if (result.success) {
        setMessages(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const result = await appointmentService.addAppointmentMessage(appointmentId, {
        senderUserId: user.uid,
        senderName: user.displayName || 'Usuário',
        message: newMessage.trim(),
        timestamp: new Date(),
        senderType: user.email ? 'user' : 'anonymous'
      });

      if (result.success) {
        setNewMessage('');
        await loadMessages();
      } else {
        alert('Erro ao enviar mensagem: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
        <h3 className="font-semibold">💬 Chat da Consulta</h3>
        <p className="text-xs opacity-90">Converse com {user?.uid === lawyerName ? 'o cliente' : 'o advogado'}</p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Comece a conversa!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderUserId === user.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.senderUserId === user.uid
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-xs font-semibold opacity-75 mb-1">
                  {msg.senderName}
                </p>
                <p className="text-sm break-words">{msg.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {msg.timestamp?.toDate?.().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) || ''}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? '⏳' : '📤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppointmentChat;
