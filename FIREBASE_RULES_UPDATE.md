# 🔐 Atualizar Firestore Security Rules - Acesso Público para Páginas de Advogado

## 📋 Problema Resolvido

**Erro anterior**: `Missing or insufficient permissions`

**Causa**: As regras de segurança do Firestore estavam bloqueando leitura não-autenticada das páginas de advogado.

**Solução**: Permitir leitura pública da coleção `lawyerPages` enquanto mantém segurança para outras coleções.

---

## 🚀 Como Atualizar as Regras

### Passo 1: Acessar Firebase Console
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto **DireitoHub**
3. No menu à esquerda, clique em **Firestore Database**

### Passo 2: Ir para as Regras
1. Clique em **Regras** (aba superior)
2. Você verá o editor de regras

### Passo 3: Copiar e Colar as Novas Regras
1. Copie o conteúdo do arquivo `firestore.rules` (localizado no raiz do projeto)
2. Cole no editor do Firebase Console, **substituindo completamente** o conteúdo anterior
3. Clique em **Publicar**

### Passo 4: Confirmar Publicação
- Você receberá uma mensagem: ✅ **Rules deployed**
- As novas regras entrarão em efeito imediatamente

---

## 🔍 O Que Mudou?

### Página de Advogado (lawyerPages)
```javascript
// ANTES - Bloqueava tudo não-autenticado
match /lawyerPages/{pageId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
}

// DEPOIS - Permite leitura pública
match /lawyerPages/{pageId} {
  allow read: if true;  // ✅ Qualquer pessoa pode ler
  allow create: if request.auth != null;  // ✅ Autenticado pode criar
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;  // ✅ Apenas dono pode editar/deletar
}
```

### Agendamentos (appointments)
```javascript
// Novo: Permite que clientes não-autenticados criem agendamentos
match /appointments/{appointmentId} {
  allow create: if true;  // ✅ Qualquer pessoa pode agendar
}
```

---

## 🛡️ Segurança Mantida

✅ **Ainda Protegido**:
- Usuários só veem seus próprios dados pessoais
- Dados financeiros ainda são privados
- Clientes não podem editar páginas de advogado
- Apenas o dono pode deletar/modificar sua página

✅ **Agora Acessível**:
- Clientes podem ver páginas públicas de advogado (sem login)
- Clientes não-autenticados podem criar agendamentos
- Públicos podem ver horários disponíveis

---

## ✅ Testar a Mudança

Após publicar as regras, teste acessando:

```
http://localhost:5173/advogado/rodrigo-munhoz-reis-4
```

Você deverá ver a página carregando sem erros de permissão.

---

## 📝 Arquivo de Referência

O arquivo `firestore.rules` está salvo na raiz do projeto para consulta e controle de versão.

Mantenha este arquivo sempre atualizado quando adicionar novas coleções ao Firestore!

---

## ⚠️ Importante

As Security Rules do Firebase são **case-sensitive** (diferenciam maiúsculas de minúsculas).
Certifique-se de que os nomes das coleções no arquivo `.rules` correspondem **exatamente** aos nomes no Firestore.

Nomes das coleções do projeto:
- `lawyerPages` ✅
- `appointments` ✅
- `users` ✅
- `clients` ✅
- `processes` ✅
- `cases` ✅
- `chats` ✅
- `documents` ✅
- `payments` ✅
- `events` ✅
- `collaborations` ✅
- `invites` ✅
