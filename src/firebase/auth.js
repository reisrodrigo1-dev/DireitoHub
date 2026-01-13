import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './config';
import { userService } from './firestore';
import { userCodeService } from '../services/userCodeService';

// Provedores de autenticação
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Configurar provedores
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const authService = {
  // Registrar novo usuário
  async register(email, password, name, userType) {
    if (!userType || !['cliente', 'advogado'].includes(userType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Atualizar perfil com nome
      await updateProfile(user, { displayName: name });
      
      // Gerar código único do usuário
      const codeResult = await userCodeService.generateUniqueUserCode();
      const userCode = codeResult.success ? codeResult.code : null;
      
      // Tentar salvar dados do usuário no Firestore (opcional)
      try {
        await userService.createUser(user.uid, {
          name,
          email,
          userType,
          userCode,
          codeGeneratedAt: new Date(),
          createdAt: new Date(),
          profilePicture: user.photoURL || null
        });
        
        console.log(`✅ Usuário registrado com código: ${userCode}`);
      } catch (firestoreError) {
        console.warn('Erro ao salvar no Firestore, mas usuário criado:', firestoreError);
      }
      
      return { success: true, user, userCode };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login com email e senha
  async login(email, password, expectedUserType = null) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Se um tipo específico é esperado, validar no Firestore
      if (expectedUserType) {
        try {
          const userData = await userService.getUser(user.uid);
          if (userData.success) {
            const actualUserType = userData.data.userType;
            if (actualUserType !== expectedUserType) {
              // Fazer logout automático
              await signOut(auth);
              return {
                success: false,
                error: `Esta conta é de ${actualUserType === 'cliente' ? 'cliente' : 'advogado'}. Use a página de login apropriada.`
              };
            }
          }
        } catch (firestoreError) {
          console.warn('Erro ao verificar tipo de usuário no Firestore:', firestoreError);
          // Se não conseguir verificar, permitir login mas logar o erro
        }
      }

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login com Google
  async loginWithGoogle(expectedUserType) {
    if (!expectedUserType || !['cliente', 'advogado'].includes(expectedUserType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Tentar verificar/salvar no Firestore (opcional)
      try {
        const userData = await userService.getUser(user.uid);
        if (!userData.success) {
          // Usuário novo - gerar código único
          const codeResult = await userCodeService.generateUniqueUserCode();
          const userCode = codeResult.success ? codeResult.code : null;
          
          await userService.createUser(user.uid, {
            name: user.displayName,
            email: user.email,
            userType: expectedUserType,
            userCode,
            codeGeneratedAt: new Date(),
            createdAt: new Date(),
            profilePicture: user.photoURL
          });
          
          console.log(`✅ Usuário Google registrado com código: ${userCode}`);
        } else {
          // Usuário existente - verificar se o tipo corresponde
          const actualUserType = userData.data.userType;
          if (actualUserType !== expectedUserType) {
            // Fazer logout automático
            await signOut(auth);
            return {
              success: false,
              error: `Esta conta Google é de ${actualUserType === 'cliente' ? 'cliente' : 'advogado'}. Use a página de login apropriada.`
            };
          }

          // Verificar se tem código, se não tiver, gerar
          if (!userData.data.userCode) {
            const assignResult = await userCodeService.assignCodeToUser(user.uid, userData.data.userType);
            if (assignResult.success) {
              console.log(`✅ Código ${assignResult.code} atribuído ao usuário existente`);
            }
          }
        }
      } catch (firestoreError) {
        console.warn('Erro no Firestore, mas login funcionou:', firestoreError);
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login com Facebook
  async loginWithFacebook(expectedUserType) {
    if (!expectedUserType || !['cliente', 'advogado'].includes(expectedUserType)) {
      return { success: false, error: 'Tipo de usuário inválido' };
    }
    
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      
      // Verificar se é novo usuário e salvar no Firestore
      const userData = await userService.getUser(user.uid);
      if (!userData.success) {
        // Usuário novo
        await userService.createUser(user.uid, {
          name: user.displayName,
          email: user.email,
          userType: expectedUserType,
          createdAt: new Date(),
          profilePicture: user.photoURL
        });
      } else {
        // Usuário existente - verificar se o tipo corresponde
        const actualUserType = userData.data.userType;
        if (actualUserType !== expectedUserType) {
          // Fazer logout automático
          await signOut(auth);
          return {
            success: false,
            error: `Esta conta Facebook é de ${actualUserType === 'cliente' ? 'cliente' : 'advogado'}. Use a página de login apropriada.`
          };
        }
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Recuperar senha
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Observar mudanças no estado de autenticação
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // Obter usuário atual
  getCurrentUser() {
    return auth.currentUser;
  }
};
