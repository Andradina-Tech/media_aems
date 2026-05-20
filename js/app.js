/**
 * app.js – Inicialização e gerenciamento de eventos
 * Ponto de entrada da aplicação.
 * Depende de: calc.js, data.js, ui.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Carregar dados salvos
  loadFromLocalStorage();

  // 2. Render inicial
  renderSidebar();
  renderMainView();

  // ─── Sidebar ───────────────────────────────────────────────────────────────

  document.getElementById('btn-nova-disciplina').addEventListener('click', () => openModalDisciplina());
  document.getElementById('btn-nova-disciplina-2').addEventListener('click', () => openModalDisciplina());

  document.getElementById('btn-export').addEventListener('click', () => {
    exportJSON();
    showToast('Dados exportados com sucesso!', 'success');
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // reset para permitir re-importar mesmo arquivo
    openConfirm('Isso substituirá todos os dados atuais. Deseja continuar?', async () => {
      try {
        await importJSON(file);
        renderSidebar();
        renderMainView();
        showToast('Dados importados com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // ─── Disciplina Header ─────────────────────────────────────────────────────

  document.getElementById('btn-edit-disciplina').addEventListener('click', () => {
    const disc = getDisciplina(state.selectedId);
    if (disc) openModalDisciplina(disc);
  });

  document.getElementById('btn-delete-disciplina').addEventListener('click', () => {
    const disc = getDisciplina(state.selectedId);
    if (!disc) return;
    openConfirm(`Excluir "${disc.nome}"? Todos os dados da turma serão perdidos.`, () => {
      deleteDisciplina(disc.id);
      renderSidebar();
      renderMainView();
      showToast('Disciplina excluída.', 'info');
    });
  });

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  document.getElementById('tabs-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    state.activeTab = btn.dataset.tab;
    renderMainView();
  });

  // ─── Subtabs (Notas) ───────────────────────────────────────────────────────

  document.getElementById('notas-subtabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.subtab-btn');
    if (!btn) return;
    state.activeSubtab = btn.dataset.subtab;
    const disc = getDisciplina(state.selectedId);
    if (disc) renderNotasTab(disc, state.activeSubtab);
  });

  // ─── Modal: Disciplina ─────────────────────────────────────────────────────

  document.getElementById('modal-disc-cancel').addEventListener('click', closeModalDisciplina);
  document.getElementById('modal-disciplina').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModalDisciplina();
  });

  document.getElementById('modal-disc-save').addEventListener('click', () => {
    const nome = document.getElementById('modal-disc-nome').value.trim();
    const turma = document.getElementById('modal-disc-turma').value.trim();
    if (!nome) { showToast('Informe o nome da disciplina.', 'error'); return; }
    if (!turma) { showToast('Informe a turma.', 'error'); return; }

    const editId = document.getElementById('modal-disciplina').dataset.editId;
    if (editId) {
      updateDisciplina(editId, { nome, turma });
      showToast('Disciplina atualizada.', 'success');
    } else {
      const disc = addDisciplina(nome, turma);
      state.selectedId = disc.id;
      state.activeTab = 'config';
      showToast('Disciplina criada!', 'success');
    }
    closeModalDisciplina();
    renderSidebar();
    renderMainView();
  });

  // Enter key no modal disciplina
  ['modal-disc-nome', 'modal-disc-turma'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('modal-disc-save').click();
    });
  });

  // ─── Modal: Aluno ──────────────────────────────────────────────────────────

  document.getElementById('modal-aluno-cancel').addEventListener('click', closeModalAluno);
  document.getElementById('modal-aluno').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModalAluno();
  });

  document.getElementById('modal-aluno-save').addEventListener('click', () => {
    const nome = document.getElementById('modal-aluno-nome').value.trim();
    const ra = document.getElementById('modal-aluno-ra').value.trim();
    if (!nome) { showToast('Informe o nome do aluno.', 'error'); return; }

    const modal = document.getElementById('modal-aluno');
    const discId = modal.dataset.discId;
    const editId = modal.dataset.editId;

    if (editId) {
      updateAluno(discId, editId, { nome, ra });
      showToast('Aluno atualizado.', 'success');
    } else {
      addAluno(discId, nome, ra);
      showToast('Aluno adicionado!', 'success');
    }
    closeModalAluno();
    const disc = getDisciplina(discId);
    if (disc) {
      renderAlunosTab(disc);
    }
  });

  ['modal-aluno-nome', 'modal-aluno-ra'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('modal-aluno-save').click();
    });
  });

  // ─── Delegação de eventos: Config Tab ─────────────────────────────────────

  // Botões "+ Adicionar avaliação"
  document.getElementById('btn-add-p1-av').addEventListener('click', () => {
    const disc = getDisciplina(state.selectedId);
    if (!disc) return;
    addAvaliacao(disc.id, 'p1', 'Nova Avaliação', 0);
    renderAvaliacoesList('p1', disc);
  });

  document.getElementById('btn-add-p2-av').addEventListener('click', () => {
    const disc = getDisciplina(state.selectedId);
    if (!disc) return;
    addAvaliacao(disc.id, 'p2', 'Nova Avaliação', 0);
    renderAvaliacoesList('p2', disc);
  });

  // Peso do Provão
  document.getElementById('provao-peso').addEventListener('change', (e) => {
    const disc = getDisciplina(state.selectedId);
    if (!disc) return;
    const v = Math.min(100, Math.max(0, Number(e.target.value)));
    setProvaoWeight(disc.id, v);
    e.target.value = v;
    const restEl = document.getElementById('p2-restante');
    if (restEl) restEl.textContent = 100 - v;
    renderAvaliacoesList('p2', disc);
  });

  // Edição inline nome/peso das avaliações (delegação)
  ['p1-avaliacoes-list', 'p2-avaliacoes-list'].forEach(containerId => {
    const container = document.getElementById(containerId);

    container.addEventListener('change', (e) => {
      const input = e.target;
      const { parte, avid, field } = input.dataset;
      if (!parte || !avid || !field) return;
      const disc = getDisciplina(state.selectedId);
      if (!disc) return;
      const val = field === 'peso' ? Number(input.value) : input.value;
      updateAvaliacao(disc.id, parte, avid, { [field]: val });
      renderAvaliacoesList(parte, disc);
    });

    // Delete avaliação
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete-av');
      if (!btn) return;
      const { parte, avid } = btn.dataset;
      const disc = getDisciplina(state.selectedId);
      if (!disc) return;
      deleteAvaliacao(disc.id, parte, avid);
      renderAvaliacoesList(parte, disc);
    });
  });

  // ─── Delegação de eventos: Alunos Tab ─────────────────────────────────────

  document.getElementById('btn-add-aluno').addEventListener('click', () => {
    const disc = getDisciplina(state.selectedId);
    if (disc) openModalAluno(disc);
  });

  document.getElementById('alunos-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const disc = getDisciplina(state.selectedId);
    if (!disc) return;
    const alunoId = btn.dataset.alunoid;
    const aluno = disc.alunos.find(a => a.id === alunoId);

    if (btn.dataset.action === 'edit-aluno') {
      openModalAluno(disc, aluno);
    } else if (btn.dataset.action === 'delete-aluno') {
      openConfirm(`Excluir o aluno "${aluno?.nome}"?`, () => {
        deleteAluno(disc.id, alunoId);
        renderAlunosTab(disc);
        showToast('Aluno removido.', 'info');
      });
    }
  });

  // ─── Delegação de eventos: Notas ──────────────────────────────────────────

  // Helper: atualiza célula resultado na linha sem re-render completo
  function updateResultCell(tr, discid, alunoid, isPart1) {
    const disc = getDisciplina(discid);
    if (!disc) return;
    const aluno = disc.alunos.find(a => a.id === alunoid);
    if (!aluno) return;
    const resultCell = tr.querySelector('.td-result');
    if (!resultCell) return;
    if (isPart1) {
      const p1 = calcP1(aluno, disc);
      resultCell.textContent = fmtNota(p1);
      resultCell.className = `td-result ${gradeColorClass(p1)}`;
    } else {
      const p2 = calcP2(aluno, disc);
      resultCell.textContent = fmtNota(p2);
      resultCell.className = `td-result ${gradeColorClass(p2)}`;
    }
  }

  ['table-notas-p1', 'table-notas-p2'].forEach(containerId => {
    const container = document.getElementById(containerId);
    const isPart1 = containerId === 'table-notas-p1';

    // 'input': salva imediatamente e atualiza preview em tempo real enquanto digita
    container.addEventListener('input', (e) => {
      const input = e.target;
      if (!input.classList.contains('nota-input')) return;
      const { discid, alunoid, avid, tipo } = input.dataset;
      const valor = input.value;

      // Salva imediatamente (permite preview em tempo real)
      if (tipo === 'p1') setNotaP1(discid, alunoid, avid, valor);
      else if (tipo === 'provao') setNotaProvao(discid, alunoid, valor);
      else if (tipo === 'p2') setNotaP2(discid, alunoid, avid, valor);

      updateResultCell(input.closest('tr'), discid, alunoid, isPart1);
    });
  });

  // ─── Confirm Modal ─────────────────────────────────────────────────────────

  document.getElementById('modal-confirm').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('modal-confirm').classList.add('hidden');
  });
});
