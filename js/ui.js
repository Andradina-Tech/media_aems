/**
 * ui.js – Funções de renderização do DOM
 * Depende de: calc.js, data.js
 */

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function renderSidebar() {
  const list = document.getElementById('disciplinas-list');
  list.innerHTML = '';

  if (state.disciplinas.length === 0) {
    list.innerHTML = '<p class="sidebar-empty">Nenhuma disciplina cadastrada.</p>';
    return;
  }

  state.disciplinas.forEach(disc => {
    const item = document.createElement('div');
    item.className = 'disc-item' + (disc.id === state.selectedId ? ' active' : '');
    item.dataset.id = disc.id;
    item.innerHTML = `
      <div class="disc-item-name">${escHtml(disc.nome)}</div>
      <div class="disc-item-turma">${escHtml(disc.turma)}</div>
    `;
    item.addEventListener('click', () => {
      state.selectedId = disc.id;
      state.activeTab = 'config';
      renderSidebar();
      renderMainView();
    });
    list.appendChild(item);
  });
}

// ─── Main View ───────────────────────────────────────────────────────────────

function renderMainView() {
  const emptyState = document.getElementById('empty-state');
  const discView = document.getElementById('disciplina-view');

  if (!state.selectedId) {
    emptyState.classList.remove('hidden');
    discView.classList.add('hidden');
    return;
  }

  const disc = getDisciplina(state.selectedId);
  if (!disc) {
    emptyState.classList.remove('hidden');
    discView.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  discView.classList.remove('hidden');

  document.getElementById('disc-nome').textContent = disc.nome;
  document.getElementById('disc-turma').textContent = disc.turma;

  // Sync tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${state.activeTab}`);
  });

  // Render active tab
  if (state.activeTab === 'config') renderConfigTab(disc);
  else if (state.activeTab === 'alunos') renderAlunosTab(disc);
  else if (state.activeTab === 'notas') renderNotasTab(disc, state.activeSubtab);
  else if (state.activeTab === 'resultados') renderResultadosTab(disc);
}

// ─── Tab: Configuração ───────────────────────────────────────────────────────

function renderConfigTab(disc) {
  renderAvaliacoesList('p1', disc);
  renderAvaliacoesList('p2', disc);

  const provaoInput = document.getElementById('provao-peso');
  provaoInput.value = disc.p2Config.pesoProvao;

  const restEl = document.getElementById('p2-restante');
  if (restEl) restEl.textContent = 100 - disc.p2Config.pesoProvao;
}

function renderAvaliacoesList(parte, disc) {
  const config = parte === 'p1' ? disc.p1Config : disc.p2Config;
  const listEl = document.getElementById(`${parte}-avaliacoes-list`);
  const indicatorEl = document.getElementById(`${parte}-weight-indicator`);

  listEl.innerHTML = '';

  if (config.avaliacoes.length === 0) {
    listEl.innerHTML = '<p class="list-empty">Nenhuma avaliação cadastrada.</p>';
    indicatorEl.innerHTML = '';
    return;
  }

  config.avaliacoes.forEach(av => {
    const row = document.createElement('div');
    row.className = 'av-row';
    row.dataset.id = av.id;
    row.innerHTML = `
      <input class="av-nome input-inline" type="text" value="${escHtml(av.nome)}" placeholder="Nome da avaliação" data-parte="${parte}" data-avid="${av.id}" data-field="nome">
      <div class="av-peso-group">
        <input class="av-peso input-inline" type="number" min="0" max="100" step="5" value="${av.peso}" data-parte="${parte}" data-avid="${av.id}" data-field="peso">
        <span class="av-peso-label">%</span>
      </div>
      <button class="btn-icon btn-delete-av" data-parte="${parte}" data-avid="${av.id}" title="Remover">✕</button>
    `;
    listEl.appendChild(row);
  });

  // Weight indicator
  const total = sumPesos(config.avaliacoes);
  const ok = total === 100;
  indicatorEl.innerHTML = `
    <span class="weight-badge ${ok ? 'weight-ok' : 'weight-err'}">
      ${ok ? '✓' : '⚠'} Soma dos pesos: <strong>${total}%</strong> ${ok ? '(correto)' : `(faltam ${100 - total}%)`}
    </span>
  `;
}

// ─── Tab: Alunos ─────────────────────────────────────────────────────────────

function renderAlunosTab(disc) {
  const list = document.getElementById('alunos-list');
  list.innerHTML = '';

  if (disc.alunos.length === 0) {
    list.innerHTML = '<p class="list-empty">Nenhum aluno cadastrado nesta turma.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>RA</th>
        <th>Nome</th>
        <th class="col-actions">Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  disc.alunos.forEach(al => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-ra">${escHtml(al.ra)}</td>
      <td>${escHtml(al.nome)}</td>
      <td class="col-actions">
        <button class="btn-icon" data-action="edit-aluno" data-alunoid="${al.id}" title="Editar">✏️</button>
        <button class="btn-icon btn-delete" data-action="delete-aluno" data-alunoid="${al.id}" title="Excluir">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  list.appendChild(table);
}

// ─── Tab: Notas ──────────────────────────────────────────────────────────────

function renderNotasTab(disc, subtab) {
  // Sync subtab buttons
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === subtab);
  });
  document.querySelectorAll('.subtab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === subtab);
  });

  if (subtab === 'notas-p1') renderNotasP1(disc);
  else renderNotasP2(disc);
}

function renderNotasP1(disc) {
  const container = document.getElementById('table-notas-p1');
  container.innerHTML = '';

  if (disc.alunos.length === 0) {
    container.innerHTML = '<p class="list-empty">Cadastre alunos antes de lançar notas.</p>';
    return;
  }
  if (disc.p1Config.avaliacoes.length === 0) {
    container.innerHTML = '<p class="list-empty">Configure as avaliações de P1 antes de lançar notas.</p>';
    return;
  }

  const avaliacoes = disc.p1Config.avaliacoes;
  const table = document.createElement('table');
  table.className = 'data-table notas-table';

  // Header
  const ths = avaliacoes.map(av =>
    `<th title="Peso: ${av.peso}%">${escHtml(av.nome)}<span class="th-peso">${av.peso}%</span></th>`
  ).join('');
  table.innerHTML = `
    <thead>
      <tr>
        <th class="th-sticky">Aluno</th>
        <th class="th-sticky th-ra">RA</th>
        ${ths}
        <th class="th-result">P1</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  disc.alunos.forEach(al => {
    const tr = document.createElement('tr');
    const cells = avaliacoes.map(av => {
      const v = al.notasP1 && al.notasP1[av.id] != null ? al.notasP1[av.id] : '';
      return `<td><input class="nota-input" type="number" min="0" max="10" step="0.1"
        value="${v}" placeholder="–"
        data-discid="${disc.id}" data-alunoid="${al.id}" data-avid="${av.id}" data-tipo="p1"></td>`;
    }).join('');

    const p1 = calcP1(al, disc);
    const colorClass = gradeColorClass(p1);
    tr.innerHTML = `
      <td class="td-nome">${escHtml(al.nome)}</td>
      <td class="td-ra">${escHtml(al.ra)}</td>
      ${cells}
      <td class="td-result ${colorClass}">${fmtNota(p1)}</td>
    `;
    tbody.appendChild(tr);
  });

  container.appendChild(table);
}

function renderNotasP2(disc) {
  const container = document.getElementById('table-notas-p2');
  container.innerHTML = '';

  if (disc.alunos.length === 0) {
    container.innerHTML = '<p class="list-empty">Cadastre alunos antes de lançar notas.</p>';
    return;
  }

  const cfg = disc.p2Config;
  const table = document.createElement('table');
  table.className = 'data-table notas-table';

  const outrasThs = cfg.avaliacoes.map(av =>
    `<th title="Peso: ${av.peso}%">${escHtml(av.nome)}<span class="th-peso">${av.peso}%</span></th>`
  ).join('');

  table.innerHTML = `
    <thead>
      <tr>
        <th class="th-sticky">Aluno</th>
        <th class="th-sticky th-ra">RA</th>
        <th class="th-provao">Provão<span class="th-peso">${cfg.pesoProvao}%</span></th>
        ${outrasThs}
        <th class="th-result">P2</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  disc.alunos.forEach(al => {
    const tr = document.createElement('tr');
    const provaoVal = al.notaProvao != null ? al.notaProvao : '';
    const outrasCells = cfg.avaliacoes.map(av => {
      const v = al.notasP2 && al.notasP2[av.id] != null ? al.notasP2[av.id] : '';
      return `<td><input class="nota-input" type="number" min="0" max="10" step="0.1"
        value="${v}" placeholder="–"
        data-discid="${disc.id}" data-alunoid="${al.id}" data-avid="${av.id}" data-tipo="p2"></td>`;
    }).join('');

    const p2 = calcP2(al, disc);
    const colorClass = gradeColorClass(p2);
    tr.innerHTML = `
      <td class="td-nome">${escHtml(al.nome)}</td>
      <td class="td-ra">${escHtml(al.ra)}</td>
      <td><input class="nota-input nota-provao" type="number" min="0" max="10" step="0.1"
        value="${provaoVal}" placeholder="–"
        data-discid="${disc.id}" data-alunoid="${al.id}" data-tipo="provao"></td>
      ${outrasCells}
      <td class="td-result ${colorClass}">${fmtNota(p2)}</td>
    `;
    tbody.appendChild(tr);
  });

  container.appendChild(table);
}

// ─── Tab: Resultados ─────────────────────────────────────────────────────────

function renderResultadosTab(disc) {
  const container = document.getElementById('resultados-table');
  container.innerHTML = '';

  if (disc.alunos.length === 0) {
    container.innerHTML = '<p class="list-empty">Nenhum aluno cadastrado nesta turma.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'data-table resultados-tabela';
  table.innerHTML = `
    <thead>
      <tr>
        <th>RA</th>
        <th>Aluno</th>
        <th class="th-result">P1</th>
        <th class="th-result">P2</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  // Sorted by name
  const sorted = [...disc.alunos].sort((a, b) => a.nome.localeCompare(b.nome));

  sorted.forEach(al => {
    const p1 = calcP1(al, disc);
    const p2 = calcP2(al, disc);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-ra">${escHtml(al.ra)}</td>
      <td>${escHtml(al.nome)}</td>
      <td class="td-result ${gradeColorClass(p1)}">${fmtNota(p1)}</td>
      <td class="td-result ${gradeColorClass(p2)}">${fmtNota(p2)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Summary
  const alunosComP1 = sorted.filter(al => calcP1(al, disc) != null);
  const alunosComP2 = sorted.filter(al => calcP2(al, disc) != null);
  const avgP1 = alunosComP1.length
    ? roundHalf(alunosComP1.reduce((s, al) => s + calcP1Raw(al, disc), 0) / alunosComP1.length)
    : null;
  const avgP2 = alunosComP2.length
    ? roundHalf(alunosComP2.reduce((s, al) => s + calcP2Raw(al, disc), 0) / alunosComP2.length)
    : null;

  const summary = document.createElement('div');
  summary.className = 'resultados-summary';
  summary.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Total de alunos</span>
      <span class="summary-value">${disc.alunos.length}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Média P1 da turma</span>
      <span class="summary-value ${gradeColorClass(avgP1)}">${fmtNota(avgP1)}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Média P2 da turma</span>
      <span class="summary-value ${gradeColorClass(avgP2)}">${fmtNota(avgP2)}</span>
    </div>
  `;

  container.appendChild(summary);
  container.appendChild(table);
}

// ─── Modais ──────────────────────────────────────────────────────────────────

function openModalDisciplina(disc = null) {
  document.getElementById('modal-disc-nome').value = disc ? disc.nome : '';
  document.getElementById('modal-disc-turma').value = disc ? disc.turma : '';
  document.getElementById('modal-disciplina-title').textContent = disc ? 'Editar Disciplina' : 'Nova Disciplina';
  document.getElementById('modal-disciplina').dataset.editId = disc ? disc.id : '';
  document.getElementById('modal-disciplina').classList.remove('hidden');
  document.getElementById('modal-disc-nome').focus();
}

function closeModalDisciplina() {
  document.getElementById('modal-disciplina').classList.add('hidden');
}

function openModalAluno(disc, aluno = null) {
  document.getElementById('modal-aluno-nome').value = aluno ? aluno.nome : '';
  document.getElementById('modal-aluno-ra').value = aluno ? aluno.ra : '';
  document.getElementById('modal-aluno-title').textContent = aluno ? 'Editar Aluno' : 'Novo Aluno';
  document.getElementById('modal-aluno').dataset.discId = disc.id;
  document.getElementById('modal-aluno').dataset.editId = aluno ? aluno.id : '';
  document.getElementById('modal-aluno').classList.remove('hidden');
  document.getElementById('modal-aluno-nome').focus();
}

function closeModalAluno() {
  document.getElementById('modal-aluno').classList.add('hidden');
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function openConfirm(msg, onConfirm) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('modal-confirm').classList.remove('hidden');
  const btnOk = document.getElementById('confirm-ok');
  const btnCancel = document.getElementById('confirm-cancel');
  const cleanup = () => {
    document.getElementById('modal-confirm').classList.add('hidden');
    btnOk.replaceWith(btnOk.cloneNode(true));
    btnCancel.replaceWith(btnCancel.cloneNode(true));
  };
  document.getElementById('confirm-ok').addEventListener('click', () => { cleanup(); onConfirm(); });
  document.getElementById('confirm-cancel').addEventListener('click', cleanup);
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
