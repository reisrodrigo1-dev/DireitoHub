/**
 * Cliente para APIs públicas brasileiras gratuitas
 * Focado em validação de CPF e dados públicos
 */

export class BrasilAPIClient {
  constructor() {
    this.baseURL = 'https://brasilapi.com.br/api';
    this.rateLimitDelay = 1000; // 1 segundo entre requisições
    this.lastRequestTime = 0;
  }

  /**
   * Controla rate limiting entre requisições
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Faz requisição HTTP com tratamento de erros
   */
  async makeRequest(endpoint) {
    await this.enforceRateLimit();

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DireitoHub-JudicialSearch/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // CPF não encontrado ou inválido
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Valida CPF usando BrasilAPI
   * NOTA: Esta API apenas valida se o CPF é válido, não retorna dados pessoais
   * devido às leis de proteção de dados (LGPD)
   */
  async validateCPF(cpf) {
    try {
      // Remove formatação
      const cleanCPF = cpf.replace(/\D/g, '');

      // Validação básica
      if (cleanCPF.length !== 11) {
        return {
          valid: false,
          cpf: cleanCPF,
          reason: 'CPF deve ter 11 dígitos'
        };
      }

      // Verifica se todos os dígitos são iguais (CPFs inválidos)
      if (/^(\d)\1{10}$/.test(cleanCPF)) {
        return {
          valid: false,
          cpf: cleanCPF,
          reason: 'CPF com todos os dígitos iguais é inválido'
        };
      }

      // Faz requisição para BrasilAPI
      const result = await this.makeRequest(`/cpf/v1/${cleanCPF}`);

      if (result === null) {
        return {
          valid: false,
          cpf: cleanCPF,
          reason: 'CPF inválido ou não encontrado'
        };
      }

      return {
        valid: true,
        cpf: cleanCPF,
        formatted: `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9)}`,
        data: result
      };

    } catch (error) {
      console.error('Erro ao validar CPF:', error.message);
      return {
        valid: false,
        cpf: cpf.replace(/\D/g, ''),
        reason: `Erro na validação: ${error.message}`
      };
    }
  }

  /**
   * Busca informações de CNPJ (para empresas)
   * Útil para validação de partes jurídicas em processos
   */
  async getCNPJInfo(cnpj) {
    try {
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      const result = await this.makeRequest(`/cnpj/v1/${cleanCNPJ}`);

      if (result === null) {
        return {
          found: false,
          cnpj: cleanCNPJ,
          reason: 'CNPJ não encontrado'
        };
      }

      return {
        found: true,
        cnpj: cleanCNPJ,
        data: result
      };

    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error.message);
      return {
        found: false,
        cnpj: cnpj.replace(/\D/g, ''),
        reason: `Erro na busca: ${error.message}`
      };
    }
  }

  /**
   * Busca CEP usando BrasilAPI
   */
  async getCEPInfo(cep) {
    try {
      const cleanCEP = cep.replace(/\D/g, '');
      const result = await this.makeRequest(`/cep/v1/${cleanCEP}`);

      if (result === null) {
        return {
          found: false,
          cep: cleanCEP,
          reason: 'CEP não encontrado'
        };
      }

      return {
        found: true,
        cep: cleanCEP,
        data: result
      };

    } catch (error) {
      console.error('Erro ao buscar CEP:', error.message);
      return {
        found: false,
        cep: cep.replace(/\D/g, ''),
        reason: `Erro na busca: ${error.message}`
      };
    }
  }

  /**
   * Busca códigos DDD por estado
   */
  async getDDDByState(uf) {
    try {
      const result = await this.makeRequest(`/ddd/v1/${uf.toUpperCase()}`);

      if (result === null) {
        return {
          found: false,
          uf: uf.toUpperCase(),
          reason: 'Estado não encontrado'
        };
      }

      return {
        found: true,
        uf: uf.toUpperCase(),
        data: result
      };

    } catch (error) {
      console.error('Erro ao buscar DDD:', error.message);
      return {
        found: false,
        uf: uf.toUpperCase(),
        reason: `Erro na busca: ${error.message}`
      };
    }
  }
}

// Instância singleton
export const brasilAPIClient = new BrasilAPIClient();