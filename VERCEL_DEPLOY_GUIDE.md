# Deploy na Vercel - Guia Completo

## ✅ Sistema Compatível com Vercel

Seu sistema **DireitoHub** foi adaptado para funcionar perfeitamente na Vercel gratuita! Aqui está o que foi implementado:

### 🔧 Mudanças Realizadas

1. **Serverless Functions**: Criadas funções serverless em `/api/datajud/` para:
   - `buscar-numero.js` - Busca processos por número
   - `buscar-advogado.js` - Busca processos por advogado
   - `buscar-nome.js` - Busca processos por nome/texto/assunto

2. **Segurança da API Key**: A chave do DataJud agora fica segura no backend (serverless functions)

3. **CORS Resolvido**: As serverless functions configuram headers CORS automaticamente

4. **Variáveis de Ambiente**: Sistema configurado para usar `DATAJUD_API_KEY` como variável de ambiente

## 🚀 Como Fazer o Deploy

### Passo 1: Configurar Repositório no GitHub
```bash
# Se ainda não fez, faça commit das mudanças:
git add .
git commit -m "feat: Adaptar para Vercel com serverless functions"
git push origin main
```

### Passo 2: Importar no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Import Project"
3. Conecte seu repositório GitHub
4. Configure o projeto:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (raiz do projeto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Passo 3: Configurar Variáveis de Ambiente
No painel da Vercel, vá em **Settings > Environment Variables** e adicione:

```
DATAJUD_API_KEY=cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==
```

### Passo 4: Deploy
1. Clique em "Deploy"
2. Aguarde o build (cerca de 2-3 minutos)
3. Seu site estará disponível em `https://seu-projeto.vercel.app`

## 🔍 Como Testar

Após o deploy, teste as funcionalidades:

1. **Busca por Número do Processo**: Digite um número de processo válido
2. **Busca por Advogado**: Digite o nome de um advogado
3. **Busca por Nome/Texto**: Digite termos como `cobrança`, `indenização`, `contrato`, etc.
4. **Verifique os logs**: No painel Vercel, vá em **Functions** para ver os logs das serverless functions

## 📊 Limitações da Vercel Gratuita

- **Serverless Functions**: 100 requests/gratuito por dia (suficiente para testes)
- **Bandwidth**: 100GB/mês
- **Build Minutes**: 100 horas/mês
- **Custom Domains**: Não incluído (usa subdomínio vercel.app)

## 🛠️ Monitoramento

### Logs das Functions
```bash
# No terminal da Vercel ou via dashboard
vercel logs --follow
```

### Analytics
- Acesse o painel Vercel para ver métricas de uso
- Monitore os logs das serverless functions

## 🔧 Troubleshooting

### Erro 404 nas APIs
- Verifique se as functions estão na pasta `api/datajud/`
- Certifique-se que são arquivos `.js` (não `.ts`)

### Erro de CORS
- As functions já incluem headers CORS configurados
- Se ainda houver problemas, verifique os logs

### API Key não funciona
- Confirme que `DATAJUD_API_KEY` está configurada nas Environment Variables
- Verifique se a chave não expirou

## 📈 Próximos Passos

1. **Monitorar Uso**: Acompanhe o consumo das serverless functions
2. **Otimizar**: Se necessário, implementar cache (Vercel KV)
3. **Upgrade**: Considere plano pago se precisar de mais requests

## 🎯 Benefícios da Migração

- ✅ **Segurança**: API key protegida no backend
- ✅ **Performance**: Serverless functions otimizadas
- ✅ **Escalabilidade**: Auto-scaling automático
- ✅ **CORS Resolvido**: Sem problemas de cross-origin
- ✅ **Deploy Automático**: Integração com Git

Seu sistema agora está pronto para produção na Vercel! 🚀