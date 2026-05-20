/**
 * calc.js – Funções puras de cálculo de notas
 * Sem side-effects, sem acesso ao DOM ou estado global.
 * Consulte context.md para detalhes das fórmulas.
 */

/**
 * Arredonda para o múltiplo de 0.5 mais próximo.
 * Exemplos: 7.3 → 7.5 | 7.2 → 7.0 | 8.75 → 9.0
 * @param {number} n
 * @returns {number}
 */
function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

/**
 * Calcula a nota P1 de um aluno (sem arredondar).
 * P1 = Σ(nota_i × peso_i / 100)
 * @param {object} aluno
 * @param {object} disciplina
 * @returns {number|null} null se não houver avaliações configuradas
 */
function calcP1Raw(aluno, disciplina) {
  const avaliacoes = disciplina.p1Config.avaliacoes;
  if (!avaliacoes || avaliacoes.length === 0) return null;
  return avaliacoes.reduce((sum, av) => {
    const nota = (aluno.notasP1 && aluno.notasP1[av.id] != null)
      ? aluno.notasP1[av.id]
      : 0;
    return sum + (nota * av.peso / 100);
  }, 0);
}

/**
 * Calcula a nota P1 de um aluno (arredondada para 0.5).
 * @param {object} aluno
 * @param {object} disciplina
 * @returns {number|null}
 */
function calcP1(aluno, disciplina) {
  const raw = calcP1Raw(aluno, disciplina);
  return raw != null ? roundHalf(raw) : null;
}

/**
 * Calcula a nota P2 de um aluno (sem arredondar).
 * P2 = (notaProvão × pesoProvão/100) + (médiaOutras × (1 - pesoProvão/100))
 * médiaOutras = Σ(nota_i × peso_i / 100)  [pesos das outras somam 100%]
 * @param {object} aluno
 * @param {object} disciplina
 * @returns {number|null} null se não houver configuração
 */
function calcP2Raw(aluno, disciplina) {
  const cfg = disciplina.p2Config;
  if (!cfg) return null;

  const pesoProvao = cfg.pesoProvao / 100;
  const notaProvao = aluno.notaProvao != null ? aluno.notaProvao : 0;
  const partProvao = notaProvao * pesoProvao;

  const avaliacoes = cfg.avaliacoes || [];
  const mediaOutras = avaliacoes.reduce((sum, av) => {
    const nota = (aluno.notasP2 && aluno.notasP2[av.id] != null)
      ? aluno.notasP2[av.id]
      : 0;
    return sum + (nota * av.peso / 100);
  }, 0);

  const partOutras = mediaOutras * (1 - pesoProvao);
  return partProvao + partOutras;
}

/**
 * Calcula a nota P2 de um aluno (arredondada para 0.5).
 * @param {object} aluno
 * @param {object} disciplina
 * @returns {number|null}
 */
function calcP2(aluno, disciplina) {
  const raw = calcP2Raw(aluno, disciplina);
  return raw != null ? roundHalf(raw) : null;
}

/**
 * Retorna a soma dos pesos de uma lista de avaliações.
 * @param {Array} avaliacoes
 * @returns {number}
 */
function sumPesos(avaliacoes) {
  return (avaliacoes || []).reduce((s, av) => s + (av.peso || 0), 0);
}

/**
 * Retorna a classe CSS de cor baseada na nota.
 * @param {number} nota
 * @returns {string}
 */
function gradeColorClass(nota) {
  if (nota == null) return 'grade-empty';
  if (nota < 5.0) return 'grade-low';
  if (nota < 7.0) return 'grade-mid';
  return 'grade-high';
}

/**
 * Formata uma nota para exibição (1 casa decimal).
 * @param {number|null} n
 * @returns {string}
 */
function fmtNota(n) {
  if (n == null || n === '') return '–';
  return Number(n).toFixed(1);
}

/**
 * Gera um UUID v4 simples.
 * @returns {string}
 */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
