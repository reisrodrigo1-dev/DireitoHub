import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ClientLogin = () => {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, loginWithFacebook } = useAuth();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegisterMode) {
        // Validações de registro
        if (!formData.name || !formData.email || !formData.password) {
          setError('Por favor, preencha todos os campos obrigatórios');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('As senhas não coincidem');
          setLoading(false);
          return;
        }

        const result = await register(formData.email, formData.password, formData.name, 'cliente');
        if (result.success) {
          setSuccess('Conta criada com sucesso! Redirecionando...');
          setTimeout(() => navigate('/dashboard-cliente'), 1500);
        } else {
          setError(result.error || 'Erro ao criar conta');
        }
      } else {
        // Login
        if (!formData.email || !formData.password) {
          setError('Por favor, preencha todos os campos');
          setLoading(false);
          return;
        }

        const result = await login(formData.email, formData.password, 'cliente');
        if (result.success) {
          setSuccess('Login realizado com sucesso! Redirecionando...');
          setTimeout(() => navigate('/dashboard-cliente'), 1500);
        } else {
          setError(result.error || 'Erro ao fazer login');
        }
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.');
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await loginWithGoogle('cliente');
      if (result.success) {
        setSuccess('Login com Google realizado com sucesso!');
        setTimeout(() => navigate('/dashboard-cliente'), 1500);
      } else {
        setError(result.error || 'Erro ao fazer login com Google');
      }
    } catch (error) {
      setError('Erro ao fazer login com Google');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/escolher-perfil" className="inline-block mb-6">
            <img 
              src="/logo_direitoHub.png" 
              alt="DireitoHub" 
              className="h-12 mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isRegisterMode ? 'Cadastro de Cliente' : 'Login - Cliente'}
          </h1>
          <p className="text-gray-600">
            {isRegisterMode 
              ? 'Crie sua conta para agendar consultas' 
              : 'Acesse sua área pessoal'
            }
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegisterMode && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone/WhatsApp
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    id="cpf"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="000.000.000-00"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email {isRegisterMode && '*'}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha {isRegisterMode && '*'}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {isRegisterMode && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Carregando...' : isRegisterMode ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Login Social */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  phone: '',
                  cpf: ''
                });
              }}
              className="text-yellow-600 hover:text-yellow-700 font-medium"
            >
              {isRegisterMode 
                ? 'Já tenho conta - Fazer Login' 
                : 'Não tenho conta - Criar Cadastro'
              }
            </button>
          </div>

          {/* Voltar */}
          <div className="text-center mt-4">
            <Link 
              to="/escolher-perfil"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Voltar para seleção de perfil
            </Link>
          </div>
        </div>

        {/* Info adicional */}
        <div className="text-center mt-6">
          <div className="bg-white/50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Encontre advogados especializados</strong>
            </p>
            <p className="text-xs text-gray-500">
              Agende consultas, acompanhe seus atendimentos e mantenha contato direto via WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
