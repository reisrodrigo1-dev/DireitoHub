import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../firebase/auth';
import { userService } from '../firebase/firestore';

// Criar contexto
const AuthContext = createContext();

// Hook para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// Provider do contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Observar mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Buscar dados completos do usuário no Firestore (com tratamento de erro)
        try {
          const result = await userService.getUser(firebaseUser.uid);
          if (result.success) {
            let userData = result.data;
            
            // Verificar se o usuário tem código, se não tiver, gerar um
            if (!userData.userCode) {
              console.log('🔄 Usuário sem código, gerando automaticamente...');
              try {
                const { userCodeService } = await import('../services/userCodeService');
                const assignResult = await userCodeService.assignCodeToUser(
                  firebaseUser.uid, 
                  userData.userType || 'cliente'
                );
                
                if (assignResult.success) {
                  userData.userCode = assignResult.code;
                  console.log(`✅ Código ${assignResult.code} gerado para usuário existente`);
                } else {
                  console.warn('⚠️ Falha ao gerar código para usuário:', assignResult.error);
                }
              } catch (codeError) {
                console.warn('⚠️ Erro ao importar serviço de códigos:', codeError);
              }
            }
            
            setUserData(userData);
          } else {
            // Se não conseguir buscar dados do Firestore, criar entrada básica
            const basicUserData = {
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email,
              userType: 'cliente',
              profilePicture: firebaseUser.photoURL
            };
            
            // Tentar criar entrada no Firestore
            try {
              await userService.createUser(firebaseUser.uid, basicUserData);
              setUserData(basicUserData);
            } catch (createError) {
              console.warn('Erro ao criar usuário no Firestore:', createError);
              setUserData(basicUserData);
            }
          }
        } catch (error) {
          console.warn('Erro ao buscar dados do usuário no Firestore:', error);
          // Usar dados do Auth como fallback
          const fallbackData = {
            name: firebaseUser.displayName || 'Usuário',
            email: firebaseUser.email,
            userType: 'cliente',
            profilePicture: firebaseUser.photoURL
          };
          setUserData(fallbackData);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Função de login
  const login = async (email, password, expectedUserType) => {
    if (!expectedUserType || !['cliente', 'advogado'].includes(expectedUserType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    setLoading(true);
    const result = await authService.login(email, password);
    
    if (result.success) {
      // Aguardar os dados do usuário serem carregados
      await new Promise(resolve => {
        const checkUserData = () => {
          if (userData) {
            resolve();
          } else {
            setTimeout(checkUserData, 100);
          }
        };
        checkUserData();
      });

      // Verificar se o tipo de usuário corresponde ao esperado
      if (expectedUserType && userData?.userType !== expectedUserType) {
        // Logout automático se o tipo não corresponder
        await authService.logout();
        setLoading(false);
        return { 
          success: false, 
          error: `Esta conta é de ${userData.userType === 'cliente' ? 'cliente' : 'advogado'}. Use a página de login apropriada.` 
        };
      }

      return { success: true };
    }
    
    setLoading(false);
    return result;
  };

  // Função de registro
  const register = async (email, password, name, userType) => {
    if (!userType || !['cliente', 'advogado'].includes(userType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    setLoading(true);
    const result = await authService.register(email, password, name, userType);
    
    if (result.success) {
      // Os dados do usuário serão carregados automaticamente pelo observer
      return { success: true };
    }
    
    setLoading(false);
    return result;
  };

  // Função de login com Google
  const loginWithGoogle = async (expectedUserType) => {
    if (!expectedUserType || !['cliente', 'advogado'].includes(expectedUserType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    setLoading(true);
    const result = await authService.loginWithGoogle(expectedUserType);
    
    if (result.success) {
      // Aguardar os dados do usuário serem carregados
      await new Promise(resolve => {
        const checkUserData = () => {
          if (userData) {
            resolve();
          } else {
            setTimeout(checkUserData, 100);
          }
        };
        checkUserData();
      });

      // Verificar se o tipo de usuário corresponde ao esperado
      if (userData?.userType !== expectedUserType) {
        // Logout automático se o tipo não corresponder
        await authService.logout();
        setLoading(false);
        return { 
          success: false, 
          error: `Esta conta é de ${userData.userType === 'cliente' ? 'cliente' : 'advogado'}. Use a página de login apropriada.` 
        };
      }

      return { success: true };
    }
    
    setLoading(false);
    return result;
  };

  // Função de login com Facebook
  const loginWithFacebook = async (expectedUserType) => {
    if (!expectedUserType || !['cliente', 'advogado'].includes(expectedUserType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    setLoading(true);
    const result = await authService.loginWithFacebook(expectedUserType);
    
    if (result.success) {
      // Aguardar os dados do usuário serem carregados
      await new Promise(resolve => {
        const checkUserData = () => {
          if (userData) {
            resolve();
          } else {
            setTimeout(checkUserData, 100);
          }
        };
        checkUserData();
      });

      // Verificar se o tipo de usuário corresponde ao esperado
      if (userData?.userType !== expectedUserType) {
        // Logout automático se o tipo não corresponder
        await authService.logout();
        setLoading(false);
        return { 
          success: false, 
          error: `Esta conta é de ${userData.userType === 'cliente' ? 'cliente' : 'advogado'}. Use a página de login apropriada.` 
        };
      }

      return { success: true };
    }
    
    setLoading(false);
    return result;
  };

  // Função de logout
  const logout = async () => {
    setLoading(true);
    const result = await authService.logout();
    setLoading(false);
    return result;
  };

  // Função de recuperação de senha
  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  // Função para atualizar dados do usuário
  const updateUserData = async (newData) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    
    const result = await userService.updateUser(user.uid, newData);
    if (result.success) {
      setUserData(prev => ({ ...prev, ...newData }));
    }
    return result;
  };

  // Valor do contexto
  const value = {
    // Estado
    user,
    userData,
    loading,
    
    // Verificações
    isAuthenticated: !!user,
    
    // Funções
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    resetPassword,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
