/**
 * data.js – Estado global, CRUD e persistência
 * Depende de: calc.js (uuid, roundHalf)
 * Consulte context.md para detalhes do modelo de dados.
 */

const DATA_VERSION = '1.0.0';
const LS_KEY = 'aems_notas_data';

/** Estado global em memória */
const state = {
  disciplinas: [],
  selectedId: null,
  activeTab: 'config',
  activeSubtab: 'notas-p1',
};

// ─── Persistência ────────────────────────────────────────────────────────────

function saveToLocalStorage() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state.disciplinas));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      state.disciplinas = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao carregar do localStorage:', e);
    state.disciplinas = [];
  }
}

/**
 * Exporta os dados como arquivo JSON para download.
 */
function exportJSON() {
  const payload = {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    disciplinas: state.disciplinas,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `aems_notas_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Importa dados de um arquivo JSON.
 * @param {File} file
 * @returns {Promise<void>}
 */
function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.version || !Array.isArray(parsed.disciplinas)) {
          reject(new Error('Arquivo inválido ou formato não reconhecido.'));
          return;
        }
        state.disciplinas = parsed.disciplinas;
        state.selectedId = null;
        state.activeTab = 'config';
        saveToLocalStorage();
        resolve();
      } catch (err) {
        reject(new Error('Erro ao ler o arquivo JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsText(file);
  });
}

// ─── CRUD Disciplinas ────────────────────────────────────────────────────────

function addDisciplina(nome, turma) {
  const disc = {
    id: uuid(),
    nome: nome.trim(),
    turma: turma.trim(),
    createdAt: new Date().toISOString(),
    p1Config: { avaliacoes: [] },
    p2Config: { pesoProvao: 20, avaliacoes: [] },
    alunos: [],
  };
  state.disciplinas.push(disc);
  saveToLocalStorage();
  return disc;
}

function updateDisciplina(id, fields) {
  const disc = getDisciplina(id);
  if (!disc) return;
  if (fields.nome !== undefined) disc.nome = fields.nome.trim();
  if (fields.turma !== undefined) disc.turma = fields.turma.trim();
  saveToLocalStorage();
}

function deleteDisciplina(id) {
  state.disciplinas = state.disciplinas.filter(d => d.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  saveToLocalStorage();
}

function getDisciplina(id) {
  return state.disciplinas.find(d => d.id === id) || null;
}

// ─── CRUD Avaliações ─────────────────────────────────────────────────────────

/**
 * @param {string} discId
 * @param {'p1'|'p2'} parte
 * @param {string} nome
 * @param {number} peso
 */
function addAvaliacao(discId, parte, nome, peso) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const config = parte === 'p1' ? disc.p1Config : disc.p2Config;
  const av = { id: uuid(), nome: nome.trim(), peso: Number(peso) };
  config.avaliacoes.push(av);
  saveToLocalStorage();
  return av;
}

function updateAvaliacao(discId, parte, avId, fields) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const config = parte === 'p1' ? disc.p1Config : disc.p2Config;
  const av = config.avaliacoes.find(a => a.id === avId);
  if (!av) return;
  if (fields.nome !== undefined) av.nome = fields.nome.trim();
  if (fields.peso !== undefined) av.peso = Number(fields.peso);
  saveToLocalStorage();
}

function deleteAvaliacao(discId, parte, avId) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const config = parte === 'p1' ? disc.p1Config : disc.p2Config;
  config.avaliacoes = config.avaliacoes.filter(a => a.id !== avId);
  // Remove notas órfãs dos alunos
  const notaKey = parte === 'p1' ? 'notasP1' : 'notasP2';
  disc.alunos.forEach(al => {
    if (al[notaKey]) delete al[notaKey][avId];
  });
  saveToLocalStorage();
}

function setProvaoWeight(discId, peso) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  disc.p2Config.pesoProvao = Number(peso);
  saveToLocalStorage();
}

// ─── CRUD Alunos ─────────────────────────────────────────────────────────────

function addAluno(discId, nome, ra) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const aluno = {
    id: uuid(),
    nome: nome.trim(),
    ra: ra.trim(),
    notasP1: {},
    notaProvao: null,
    notasP2: {},
  };
  disc.alunos.push(aluno);
  saveToLocalStorage();
  return aluno;
}

function updateAluno(discId, alunoId, fields) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const aluno = disc.alunos.find(a => a.id === alunoId);
  if (!aluno) return;
  if (fields.nome !== undefined) aluno.nome = fields.nome.trim();
  if (fields.ra !== undefined) aluno.ra = fields.ra.trim();
  saveToLocalStorage();
}

function deleteAluno(discId, alunoId) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  disc.alunos = disc.alunos.filter(a => a.id !== alunoId);
  saveToLocalStorage();
}

// ─── Notas ───────────────────────────────────────────────────────────────────

function setNotaP1(discId, alunoId, avId, valor) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const aluno = disc.alunos.find(a => a.id === alunoId);
  if (!aluno) return;
  if (!aluno.notasP1) aluno.notasP1 = {};
  const v = valor === '' || valor == null ? null : Math.min(10, Math.max(0, Number(valor)));
  aluno.notasP1[avId] = v;
  saveToLocalStorage();
}

function setNotaProvao(discId, alunoId, valor) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const aluno = disc.alunos.find(a => a.id === alunoId);
  if (!aluno) return;
  const v = valor === '' || valor == null ? null : Math.min(10, Math.max(0, Number(valor)));
  aluno.notaProvao = v;
  saveToLocalStorage();
}

function setNotaP2(discId, alunoId, avId, valor) {
  const disc = getDisciplina(discId);
  if (!disc) return;
  const aluno = disc.alunos.find(a => a.id === alunoId);
  if (!aluno) return;
  if (!aluno.notasP2) aluno.notasP2 = {};
  const v = valor === '' || valor == null ? null : Math.min(10, Math.max(0, Number(valor)));
  aluno.notasP2[avId] = v;
  saveToLocalStorage();
}
