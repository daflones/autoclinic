# Análise de Campos Novos - Evitando Duplicação

## 🔍 Campos já existentes no sistema

### Procedimentos (tabela `procedimentos`)
- ✅ `detalhes` (text) - Detalhes técnicos do procedimento
- ✅ `quebra_objecoes` (text) - Argumentos para quebrar objeções
- ✅ `cuidados_pre`, `cuidados_pos`, `cuidados_durante`, `cuidados_apos` (text)
- ✅ `contraindicacoes` (text)
- ✅ `ia_config` (JSONB) - Configurações complexas da IA (já usado para armazenar dados estruturados)
- ✅ `ia_informa_preco`, `ia_envia_imagens` (boolean)

### Clínica IA Config (tabela `clinica_ia_config` - configurações globais)
- ✅ `prova_social` (JSONB) - Prova social da clínica (global)
- ✅ `posicionamento`, `identidade`, `politicas`, `regras_internas` (JSONB)

---

## 📋 Campos solicitados no etapa01.md

### PROCEDIMENTOS - Novos campos
```sql
ia_agenda_direto BOOLEAN DEFAULT FALSE
ia_descricao_estrategica TEXT
ia_beneficios TEXT
ia_indicacoes TEXT
ia_prova_social TEXT
ia_upsell_ids UUID[]
```

### PACIENTES - Novos campos
```sql
fase_conversao TEXT DEFAULT 'fase_1_engajamento'
procedimento_interesse TEXT
regiao_interesse TEXT
ja_realizou_antes BOOLEAN DEFAULT FALSE
dor_principal TEXT
nivel_interesse TEXT DEFAULT 'desconhecido'
status_conversao TEXT DEFAULT 'em_atendimento'
ultima_interacao_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 💡 Recomendações (2 opções)

### **OPÇÃO 1: Usar colunas separadas (mais simples, mais performático)**
**Vantagens:**
- ✅ Queries SQL diretas e rápidas
- ✅ Validação de tipo no banco
- ✅ Fácil de filtrar/ordenar
- ✅ Compatível com o que já foi criado no banco

**Desvantagens:**
- ⚠️ Mais colunas na tabela
- ⚠️ Possível redundância com campos existentes

**Implementação:**
- Adicionar os 6 campos novos em `procedimentos` como colunas
- Adicionar os 8 campos novos em `pacientes` como colunas
- Atualizar TypeScript interfaces
- Atualizar UI para exibir/editar

---

### **OPÇÃO 2: Usar JSONB `ia_config` (mais flexível, menos colunas)**
**Vantagens:**
- ✅ Menos colunas na tabela
- ✅ Mais flexível para adicionar campos futuros
- ✅ Agrupa configs de IA em um só lugar

**Desvantagens:**
- ⚠️ Queries mais complexas (JSONB)
- ⚠️ Menos performático para filtros
- ⚠️ Precisa reescrever o que já foi criado no banco

**Implementação:**
- Armazenar `ia_beneficios`, `ia_indicacoes`, `ia_prova_social`, `ia_descricao_estrategica` dentro de `ia_config`
- Manter `ia_agenda_direto` e `ia_upsell_ids` como colunas (são usados para lógica de negócio)
- Para pacientes, manter todos como colunas (são dados de conversão, não configs)

---

## 🎯 Minha Recomendação Final

### Para **PROCEDIMENTOS**:
**Usar OPÇÃO 1 (colunas separadas)** porque:
1. Os comandos SQL já foram executados no banco
2. São campos específicos e estruturados
3. Performance melhor para filtros (ex: "procedimentos que a IA pode agendar direto")
4. Evita confusão entre `ia_config` (configs complexas) e dados simples

**Mapeamento:**
- `ia_agenda_direto` → nova coluna ✅
- `ia_descricao_estrategica` → nova coluna ✅ (diferente de `detalhes` que é técnico)
- `ia_beneficios` → nova coluna ✅ (lista de benefícios para IA usar)
- `ia_indicacoes` → nova coluna ✅ (quando indicar o procedimento)
- `ia_prova_social` → nova coluna ✅ (depoimentos específicos deste procedimento)
- `ia_upsell_ids` → nova coluna ✅ (array de UUIDs para upsell)

### Para **PACIENTES**:
**Usar OPÇÃO 1 (colunas separadas)** porque:
1. São dados de qualificação/conversão, não configs
2. Precisa filtrar/ordenar por fase, nível de interesse, status
3. Performance crítica para dashboards e relatórios
4. Os comandos SQL já foram executados

**Todos os 8 campos como colunas separadas** ✅

---

## 📝 Próximos passos

1. ✅ Confirmar que os comandos SQL já foram executados no Supabase
2. Atualizar TypeScript interfaces (`procedimentos.ts`, `pacientes.ts`)
3. Atualizar UI de Procedimentos (modal criar/editar)
4. Atualizar UI de Pacientes (detalhes, cards, filtros)
5. Adicionar badges visuais para `fase_conversao` e `nivel_interesse`
6. Testar fluxo completo

---

## ❓ Decisão necessária

**Você confirma que:**
1. Os comandos SQL do `etapa01.md` já foram executados no Supabase?
2. Prefere usar colunas separadas (OPÇÃO 1) conforme recomendado?
3. Quer que eu prossiga com a implementação completa?
