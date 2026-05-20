# Contexto Técnico – Sistema de Notas AEMS

> Documento de referência para desenvolvimento futuro. Atualizar sempre que houver mudanças arquiteturais.

---

## Visão Geral

Sistema web para gerenciamento de notas de disciplinas da **AEMS** (Associação Educacional de Três Lagoas – MS). Desenvolvido para uso individual pelo professor, sem necessidade de servidor ou banco de dados.

### Objetivo
Permitir que o professor configure, por disciplina, as avaliações que compõem P1 e P2, cadastre alunos por turma, lance as notas e visualize os resultados calculados automaticamente, prontos para inserção no sistema da faculdade.

---

## Regras de Negócio

### Estrutura de Média

O sistema da AEMS divide o bimestre em dois momentos: **P1** e **P2**.

#### P1
- Composição **totalmente livre**: qualquer quantidade de avaliações (provas, trabalhos, etc.)
- Cada avaliação tem um **peso** definido pelo professor
- Os pesos devem somar **100%**
- Fórmula:
  ```
  P1 = Σ (nota_i × peso_i / 100)
  ```

#### P2
- Sempre inclui o **Provão**, cuja participação na P2 é configurável por disciplina
  - Ano letivo anterior: Provão = **40%** da P2
  - Ano letivo atual (2026): Provão = **20%** da P2
- As demais avaliações da P2 preenchem os **100% − pesoProvão** restantes
- Os pesos das demais avaliações somam **100% entre si** (o sistema aplica o fator do restante)
- Fórmula:
  ```
  média_outras_P2 = Σ (nota_i × peso_i / 100)    [pesos das outras somam 100%]
  P2 = (notaProvão × pesoProvão / 100) + (média_outras_P2 × (1 − pesoProvão / 100))
  ```

#### Nota Final (referência)
A faculdade soma P1 + P2 internamente e monta a média final. O sistema exibe P1 e P2 calculados para facilitar o lançamento no sistema da faculdade.

#### Arredondamento
As notas finais (P1 e P2) são arredondadas para o **múltiplo de 0,5 mais próximo**:
```javascript
function roundHalf(n) {
  return Math.round(n * 2) / 2;
}
// Exemplos: 7.3 → 7.5 | 7.2 → 7.0 | 8.75 → 9.0
```
As notas individuais lançadas **não** são arredondadas — apenas os resultados finais (P1 e P2).

### Escala de Notas
- Todas as notas são de **0 a 10**
- Resultados finais arredondados para: 0.0, 0.5, 1.0, 1.5, ..., 9.5, 10.0

---

## Arquitetura

### Stack Tecnológico
| Camada | Tecnologia |
|--------|-----------|
| Estrutura | HTML5 semântico |
| Estilo | CSS3 com variáveis customizadas (dark mode) |
| Lógica | JavaScript ES6+ puro (sem framework) |
| Fonte | Google Fonts – Inter |
| Persistência | `localStorage` (cache) + arquivo JSON (backup/Google Drive) |

### Estrutura de Arquivos
```
Notas/
├── context.md            ← Este arquivo
├── index.html            ← Aplicação principal (single-page)
├── css/
│   └── style.css         ← Design system completo (variáveis, componentes, layout)
└── js/
    ├── calc.js           ← Funções puras de cálculo (sem side-effects)
    ├── data.js           ← Estado global, CRUD, localStorage, import/export
    ├── ui.js             ← Funções de renderização do DOM
    └── app.js            ← Inicialização e gerenciamento de eventos
```

### Ordem de carregamento dos scripts no `index.html`
```html
<script src="js/calc.js"></script>   <!-- 1º: sem dependências -->
<script src="js/data.js"></script>   <!-- 2º: usa calc.js -->
<script src="js/ui.js"></script>     <!-- 3º: usa data.js e calc.js -->
<script src="js/app.js"></script>    <!-- 4º: usa tudo, ponto de entrada -->
```

---

## Modelo de Dados

### Formato do arquivo JSON exportado
```json
{
  "version": "1.0.0",
  "exportedAt": "2026-05-19T21:00:00.000Z",
  "disciplinas": [ /* array de Disciplina */ ]
}
```

### Disciplina
```json
{
  "id": "uuid-v4",
  "nome": "Cálculo I",
  "turma": "Eng. Civil – 2026/1",
  "createdAt": "ISO 8601",
  "p1Config": {
    "avaliacoes": [
      { "id": "uuid", "nome": "Prova 1", "peso": 60 },
      { "id": "uuid", "nome": "Trabalho", "peso": 40 }
    ]
  },
  "p2Config": {
    "pesoProvao": 20,
    "avaliacoes": [
      { "id": "uuid", "nome": "Prova 2", "peso": 100 }
    ]
  },
  "alunos": [ /* array de Aluno */ ]
}
```

### Aluno
```json
{
  "id": "uuid-v4",
  "nome": "João Silva",
  "ra": "2023001",
  "notasP1": {
    "<id-da-avaliacao>": 8.5,
    "<id-da-avaliacao>": 7.0
  },
  "notaProvao": 6.5,
  "notasP2": {
    "<id-da-avaliacao>": 8.0
  }
}
```

### Estado Global em memória (`data.js`)
```javascript
const state = {
  disciplinas: [],          // array de Disciplina
  selectedId: null,         // ID da disciplina ativa
  activeTab: 'config',      // 'config' | 'alunos' | 'notas' | 'resultados'
  activeSubtab: 'notas-p1'  // 'notas-p1' | 'notas-p2'
};
```

---

## Persistência

### localStorage
- Chave: `aems_notas_data`
- Salvo automaticamente após **qualquer** alteração no estado
- Carregado automaticamente ao abrir a página

### Exportar JSON
- Gera um arquivo `.json` com o estado completo + metadados de versão e data
- Nome do arquivo: `aems_notas_<YYYY-MM-DD>.json`

### Importar JSON
- Lê um arquivo `.json` via `<input type="file">`
- Valida o campo `version` antes de aceitar
- Substitui o estado atual (com confirmação do usuário)

---

## Componentes da Interface

### Layout
```text
[Desktop]
┌─────────────────────────────────────────┐
│  SIDEBAR (240px fixo)  │  MAIN (flex)   │
│  ─────────────────────  │  ─────────────│
│  Logo AEMS Notas        │  [Vazio] ou   │
│  + Nova Disciplina      │  ┌───────────┐│
│  ─────────────────────  │  │ Header    ││
│  Disciplina 1           │  │ [Tabs]    ││
│  Disciplina 2           │  │ [Conteúdo]││
│  ...                    │  └───────────┘│
│  ─────────────────────  │               │
│  [Exportar] [Importar]  │               │
└─────────────────────────────────────────┘

[Mobile]
- Topbar fixa com botão Hamburguer
- Sidebar atua como Gaveta (Drawer) com overlay
- Tabelas e abas utilizam scroll horizontal
```

### Abas da Disciplina
| ID | Tab | Descrição |
|----|-----|-----------|
| `config` | ⚙️ Configuração | Montar avaliações P1/P2, definir pesos |
| `alunos` | 👥 Alunos | Cadastrar, editar e remover alunos |
| `notas` | 📝 Notas | Lançar notas por avaliação (sub-abas P1 e P2) |
| `resultados` | 📊 Resultados | Tabela final com P1, P2 calculados e arredondados |

### Modais
- **Modal Disciplina**: criar/editar nome e turma
- **Modal Aluno**: criar/editar nome e RA

---

## Design System (CSS)

### Variáveis principais (`css/style.css`)
```css
:root {
  --bg-primary:    #0d1117;
  --bg-secondary:  #161b22;
  --bg-tertiary:   #21262d;
  --accent:        #7c3aed;
  --accent-light:  #a78bfa;
  --text-primary:  #f0f6fc;
  --text-secondary:#8b949e;
  --border:        #30363d;
  --success:       #3fb950;
  --warning:       #d29922;
  --danger:        #f85149;
  --radius:        8px;
}
```

### Padrão de cores para notas (aba Resultados)
| Faixa | Cor |
|-------|-----|
| 0.0 – 4.5 | `--danger` (vermelho) |
| 5.0 – 6.5 | `--warning` (amarelo) |
| 7.0 – 10.0 | `--success` (verde) |

---

## Funções Públicas por Módulo

### `calc.js`
```javascript
calcP1(aluno, disciplina)   → number  // P1 sem arredondar
calcP2(aluno, disciplina)   → number  // P2 sem arredondar
roundHalf(n)                → number  // arredonda para 0.5 mais próximo
gradeColor(n)               → string  // 'grade-low' | 'grade-mid' | 'grade-high'
```

### `data.js`
```javascript
// CRUD disciplinas
addDisciplina(nome, turma)
updateDisciplina(id, fields)
deleteDisciplina(id)
getDisciplina(id)

// CRUD avaliações
addAvaliacao(discId, parte, nome, peso)   // parte: 'p1' | 'p2'
updateAvaliacao(discId, parte, avId, fields)
deleteAvaliacao(discId, parte, avId)

// Provão
setProvaoWeight(discId, peso)

// CRUD alunos
addAluno(discId, nome, ra)
updateAluno(discId, alunoId, fields)
deleteAluno(discId, alunoId)

// Notas
setNotaP1(discId, alunoId, avId, valor)
setNotaProvao(discId, alunoId, valor)
setNotaP2(discId, alunoId, avId, valor)

// Persistência
saveToLocalStorage()
loadFromLocalStorage()
exportJSON()
importJSON(file)           → Promise<void>
```

### `ui.js`
```javascript
renderSidebar()
renderDisciplinaView(id)
renderConfigTab(disc)
renderAlunosTab(disc)
renderNotasTab(disc, subtab)
renderResultadosTab(disc)
renderModal(type, data)    // type: 'disciplina' | 'aluno'
showToast(msg, type)       // type: 'success' | 'error' | 'info'
```

### `app.js`
```javascript
init()                     // ponto de entrada, DOMContentLoaded
// Registra todos os event listeners
// Delega para data.js e ui.js
```

---

## Decisões de Design

| Decisão | Motivo |
|---------|--------|
| Sem framework JS | Simplicidade, sem build step, funciona como arquivo local |
| localStorage + JSON | Cache imediato + backup portável para Google Drive |
| Pesos somam 100% entre si | Mais intuitivo para o professor do que pesos absolutos |
| Arredondamento só no resultado | Preservar precisão durante o cálculo intermediário |
| Separação calc.js | Permite testar as funções de cálculo isoladamente |
| Ordem scripts no HTML | Garante que dependências estejam disponíveis (sem module system) |
| Responsividade Nativa | Sidebar em drawer e touch-targets maiores para uso diário em celulares |

---

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.1.0 | 2026-05-20 | Suporte completo a dispositivos móveis (responsividade, sidebar drawer, tabelas touch) |
| 1.0.0 | 2026-05-19 | Versão inicial – CRUD disciplinas/alunos, P1/P2, export/import JSON |

---

## Possíveis Evoluções Futuras

- Sincronização automática com Google Drive via API
- Impressão / exportação para PDF
- Suporte a múltiplos bimestres na mesma disciplina
- Importação de lista de alunos via CSV
- Histórico de alterações de notas
- Autenticação para uso por múltiplos professores
