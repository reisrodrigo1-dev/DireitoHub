import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import UserCodeDisplay from './UserCodeDisplay';

const Header = ({ onLoginClick, showBackButton = false, onBackClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userData, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="shadow-sm" style={{backgroundColor: '#f1f1f1'}}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              {showBackButton && (
                <button
                  onClick={onBackClick}
                  className="mr-3 p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <img 
                src="/logo_direitoHub.png" 
                alt="DireitoHub" 
                className="h-16 w-auto mr-3"
              />
            </div>
            
            <div className="hidden lg:flex space-x-6">
              <a href="#sistemas" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                SISTEMAS
              </a>
              <a href="#como-se-faz" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                COMO SE FAZ
              </a>
              <a href="#sites" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                SITES PROFISSIONAIS
              </a>
              <a href="#mentorias" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                MENTORIAS
              </a>
              <a href="#ia" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                INTELIGÊNCIA ARTIFICIAL
              </a>
              <a href="/debate-history" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                HISTÓRICO DE DEBATES
              </a>
              <a href="/minha-pagina-de-vendas" className="font-inter-semibold text-sm" style={{color: '#000'}} onMouseEnter={(e) => e.target.style.color = '#001a7f'} onMouseLeave={(e) => e.target.style.color = '#000'}>
                MINHA PÁGINA DE VENDAS
              </a>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  {/* Usuário logado */}
                  <div className="hidden md:flex items-center space-x-4">
                    {/* Código do usuário */}
                    <UserCodeDisplay inline={true} showLabel={false} />
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#001a7f'}}>
                        <span className="text-white text-sm font-medium">
                          {userData?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm" style={{color: '#000'}}>
                        Olá, {userData?.name || user?.displayName || 'Usuário'}
                      </span>
                    </div>
                    {userData?.userType === 'advogado' && (
                      <button
                        onClick={() => navigate('/dashboard-advogado')}
                        className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          border: '1px solid #001a7f',
                          color: '#001a7f',
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#001a7f';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#001a7f';
                        }}
                      >
                        Dashboard
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        border: '1px solid #000',
                        color: '#000',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f1f1f1';
                        e.target.style.borderColor = '#001a7f';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.borderColor = '#000';
                      }}
                    >
                      Sair
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Usuário não logado */}
                  <button 
                    onClick={onLoginClick}
                    className="px-4 py-2 rounded-lg font-inter-bold transition-colors hidden md:block"
                    style={{
                      border: '1px solid #000',
                      color: '#000',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#001a7f';
                      e.target.style.color = 'white';
                      e.target.style.borderColor = '#001a7f';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#000';
                      e.target.style.borderColor = '#000';
                    }}
                  >
                    LOGIN
                  </button>
                </>
              )}
              
              <button 
                className="px-4 py-2 rounded-lg font-inter-bold transition-colors text-white"
                style={{backgroundColor: '#0048aa'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#001a7f'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0048aa'}
              >
                DireitoHub PRO
              </button>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2"
                style={{color: '#000'}}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Menu Mobile */}
          {isMobileMenuOpen && (
            <div className="lg:hidden pb-4" style={{borderTop: '1px solid #000'}}>
              <div className="pt-4 space-y-3">
                <a href="#sistemas" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  SISTEMAS
                </a>
                <a href="#como-se-faz" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  COMO SE FAZ
                </a>
                <a href="#sites" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  SITES PROFISSIONAIS
                </a>
                <a href="#mentorias" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  MENTORIAS
                </a>
                <a href="#ia" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  INTELIGÊNCIA ARTIFICIAL
                </a>
                <a href="/debate-history" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  HISTÓRICO DE DEBATES
                </a>
                <a href="/minha-pagina-de-vendas" className="block font-medium text-sm px-2 py-1" style={{color: '#000'}}>
                  MINHA PÁGINA DE VENDAS
                </a>
                
                <div className="pt-2 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <div className="px-2 py-1">
                        <UserCodeDisplay showLabel={true} className="mb-2" />
                      </div>
                      
                      <div className="flex items-center space-x-2 px-2 py-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#001a7f'}}>
                          <span className="text-white text-sm font-medium">
                            {userData?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-700 text-sm">
                          Olá, {userData?.name || user?.displayName || 'Usuário'}
                        </span>
                      </div>
                      {userData?.userType === 'advogado' && (
                        <button 
                          onClick={() => {
                            navigate('/dashboard-advogado');
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-700 transition-colors text-sm"
                        >
                          Dashboard
                        </button>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
                      >
                        Sair
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={onLoginClick}
                      className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
                    >
                      LOGIN
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>
      {/* Aviso de versão global */}
      <div className="w-full bg-yellow-200 text-yellow-900 text-center py-2 text-sm font-semibold shadow-sm z-40">
        ⚠️ Sistema em Versão V.1.6.0 BETA — Algumas funcionalidades estão em teste. Caso encontre instabilidades, reporte ao suporte.
      </div>
    </>
  );
};

export default Header;
