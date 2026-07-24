import { supabase, STORAGE_BUCKET, formatDateBR, STATUS_LABELS, STATUS_COLORS } from './supabase-config.js';

const DOCUMENTOS = [
  { key: 'foto_aluno', label: 'Foto do aluno' },
  { key: 'doc_rg_participante', label: 'RG do participante' },
  { key: 'doc_cpf_participante', label: 'CPF do participante' },
  { key: 'doc_rg_responsavel', label: 'RG do responsável' },
  { key: 'doc_cpf_responsavel', label: 'CPF do responsável' },
  { key: 'doc_comprovante_residencia', label: 'Comprovante de residência' },
  { key: 'doc_boletim_escolar', label: 'Boletim escolar' },
  { key: 'doc_exame_cardiologico', label: 'Exame cardiológico' },
  { key: 'doc_atestado_cardiologista', label: 'Atestado do cardiologista' },
  { key: 'doc_atestado_aptidao', label: 'Atestado médico de aptidão física' },
  { key: 'doc_exame_sangue', label: 'Exame de sangue' },
  { key: 'doc_carta_assinada', label: 'Carta assinada' },
  { key: 'doc_foto_3x4', label: 'Foto 3x4' },
];

let allInscricoes = [];

// Apenas este email pode ver e editar as Configurações do Site.
// (A restrição de verdade está garantida pelas políticas RLS no Supabase —
// isso aqui é só para não mostrar o menu para quem não tem permissão.)
const EMAIL_AUTORIZADO_CONFIG = 'valdemirdcalves86@gmail.com';

const loginPage = document.getElementById('loginPage');
const adminShell = document.getElementById('adminShell');

// ----------------------------------------------------------------------------
// SEGURANÇA: verifica sessão ativa ao carregar a página
// ----------------------------------------------------------------------------
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showDashboard(session);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginPage.style.display = 'flex';
  adminShell.classList.remove('active');
}

function showDashboard(session) {
  loginPage.style.display = 'none';
  adminShell.classList.add('active');
  document.getElementById('adminEmailLabel').textContent = session.user.email;

  if (session.user.email === EMAIL_AUTORIZADO_CONFIG) {
    document.getElementById('navSiteConfig').hidden = false;
  }

  carregarDados();
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showDashboard(session); else showLogin();
});

checkSession();

// ----------------------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------------------
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loader"></span>';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = 'Entrar';

  if (error) {
    loginError.textContent = 'Email ou senha inválidos.';
    loginError.classList.add('show');
    return;
  }
  showDashboard(data.session);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

// ----------------------------------------------------------------------------
// CARREGAR DADOS DO DASHBOARD
// ----------------------------------------------------------------------------
async function carregarDados() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Carregando inscrições...</div></td></tr>`;

  const { data, error } = await supabase
    .from('inscricoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Erro ao carregar: ${error.message}</div></td></tr>`;
    return;
  }

  allInscricoes = data || [];
  atualizarEstatisticas();
  renderTabela(allInscricoes);
}

function atualizarEstatisticas() {
  document.getElementById('statTotal').textContent = allInscricoes.length;
  document.getElementById('statPendentes').textContent = allInscricoes.filter((i) => i.status === 'recebida').length;
  document.getElementById('statAprovadas').textContent = allInscricoes.filter((i) => i.status === 'aprovada').length;
  document.getElementById('statReserva').textContent = allInscricoes.filter((i) => i.status === 'reserva').length;
  document.getElementById('statReprovadas').textContent = allInscricoes.filter((i) => i.status === 'reprovada').length;
}

function renderTabela(lista) {
  const tbody = document.getElementById('tableBody');
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Nenhuma inscrição encontrada.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map((i) => `
    <tr data-id="${i.id}">
      <td><strong>${i.protocolo}</strong></td>
      <td>${i.nome_completo}</td>
      <td>${i.cpf}</td>
      <td>${formatDateBR(i.created_at?.slice(0, 10))}</td>
      <td><span class="status-badge ${STATUS_COLORS[i.status]}">${STATUS_LABELS[i.status]}</span></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => abrirModal(row.dataset.id));
  });
}

// ----------------------------------------------------------------------------
// BUSCA E FILTRO
// ----------------------------------------------------------------------------
function aplicarFiltros() {
  const termo = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;

  let filtrado = allInscricoes;
  if (status) filtrado = filtrado.filter((i) => i.status === status);
  if (termo) {
    filtrado = filtrado.filter((i) =>
      i.nome_completo.toLowerCase().includes(termo) ||
      i.cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
      i.protocolo.toLowerCase().includes(termo)
    );
  }
  renderTabela(filtrado);
}

document.getElementById('searchInput').addEventListener('input', aplicarFiltros);
document.getElementById('statusFilter').addEventListener('change', aplicarFiltros);
document.getElementById('refreshBtn').addEventListener('click', carregarDados);

// ----------------------------------------------------------------------------
// MODAL DE DETALHES
// ----------------------------------------------------------------------------
const modalOverlay = document.getElementById('modalOverlay');
const modalCard = document.getElementById('modalCard');

async function abrirModal(id) {
  const inscricao = allInscricoes.find((i) => i.id === id);
  if (!inscricao) return;

  modalCard.innerHTML = renderModalConteudo(inscricao);
  modalOverlay.classList.add('show');

  // Gera links de download assinados (bucket privado)
  const docLinksWrap = modalCard.querySelector('#docLinksWrap');
  for (const doc of DOCUMENTOS) {
    const path = inscricao[`${doc.key}_path`];
    if (!path) continue;
    const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
    const el = docLinksWrap.querySelector(`[data-doc="${doc.key}"] a`);
    if (el && data?.signedUrl) el.href = data.signedUrl;
  }

  // Botões de status
  modalCard.querySelectorAll('.status-btn').forEach((btn) => {
    btn.addEventListener('click', () => atualizarStatus(inscricao.id, btn.dataset.status));
  });

  // Salvar observações
  modalCard.querySelector('#salvarObsBtn').addEventListener('click', () => salvarObservacoes(inscricao.id));

  modalCard.querySelector('.modal-close').addEventListener('click', fecharModal);
}

function fecharModal() {
  modalOverlay.classList.remove('show');
}
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) fecharModal(); });

function renderModalConteudo(i) {
  const docsHtml = DOCUMENTOS.map((doc) => `
    <div class="doc-list-item" data-doc="${doc.key}">
      <span>${doc.label}</span>
      ${i[`${doc.key}_path`] ? `<a href="#" target="_blank" rel="noopener">Baixar ↓</a>` : '<span style="color:var(--gray-400);">Não enviado</span>'}
    </div>
  `).join('');

  return `
    <div class="modal-header">
      <div>
        <div class="protocolo-tag">${i.protocolo}</div>
        <span class="status-badge ${STATUS_COLORS[i.status]}">${STATUS_LABELS[i.status]}</span>
      </div>
      <button class="modal-close">✕</button>
    </div>

    <div class="detail-section">
      <h4>Dados do participante</h4>
      <div class="detail-grid">
        <div class="detail-item"><div class="label">Nome completo</div><div class="value">${i.nome_completo}</div></div>
        <div class="detail-item"><div class="label">Data de nascimento</div><div class="value">${formatDateBR(i.data_nascimento)}</div></div>
        <div class="detail-item"><div class="label">Sexo</div><div class="value">${i.sexo}</div></div>
        <div class="detail-item"><div class="label">CPF</div><div class="value">${i.cpf}</div></div>
        <div class="detail-item"><div class="label">RG</div><div class="value">${i.rg}</div></div>
        <div class="detail-item"><div class="label">Certidão de nascimento</div><div class="value">${i.certidao_nascimento_numero || '-'}</div></div>
        <div class="detail-item"><div class="label">Escola</div><div class="value">${i.escola}</div></div>
        <div class="detail-item"><div class="label">Série</div><div class="value">${i.serie}</div></div>
      </div>
    </div>

    <div class="detail-section">
      <h4>Filiação e responsável</h4>
      <div class="detail-grid">
        <div class="detail-item"><div class="label">Nome da mãe</div><div class="value">${i.nome_mae || '-'}</div></div>
        <div class="detail-item"><div class="label">Nome do pai</div><div class="value">${i.nome_pai || '-'}</div></div>
        <div class="detail-item"><div class="label">Responsável legal</div><div class="value">${i.responsavel_legal}</div></div>
        <div class="detail-item"><div class="label">CPF do responsável</div><div class="value">${i.cpf_responsavel}</div></div>
        <div class="detail-item"><div class="label">Telefone</div><div class="value">${i.telefone}</div></div>
        <div class="detail-item"><div class="label">WhatsApp</div><div class="value">${i.whatsapp}</div></div>
        <div class="detail-item"><div class="label">Email</div><div class="value">${i.email}</div></div>
      </div>
    </div>

    <div class="detail-section">
      <h4>Endereço</h4>
      <div class="detail-grid">
        <div class="detail-item"><div class="label">Endereço</div><div class="value">${i.endereco}</div></div>
        <div class="detail-item"><div class="label">CEP</div><div class="value">${i.cep}</div></div>
        <div class="detail-item"><div class="label">Cidade / Estado</div><div class="value">${i.cidade} / ${i.estado}</div></div>
      </div>
    </div>

    <div class="detail-section">
      <h4>Saúde</h4>
      <div class="detail-grid">
        <div class="detail-item"><div class="label">Necessidade especial</div><div class="value">${i.necessidade_especial || 'Nenhuma'}</div></div>
        <div class="detail-item"><div class="label">Alergias</div><div class="value">${i.alergias || 'Nenhuma'}</div></div>
        <div class="detail-item"><div class="label">Medicamentos</div><div class="value">${i.medicamentos || 'Nenhum'}</div></div>
      </div>
      ${i.observacoes ? `<div class="detail-item" style="margin-top:12px;"><div class="label">Observações</div><div class="value">${i.observacoes}</div></div>` : ''}
    </div>

    <div class="detail-section">
      <h4>Uniformes</h4>
      <div class="detail-grid">
        <div class="detail-item"><div class="label">Camisa</div><div class="value">${i.uniforme_camisa || '-'}</div></div>
        <div class="detail-item"><div class="label">Calção</div><div class="value">${i.uniforme_calcao || '-'}</div></div>
        <div class="detail-item"><div class="label">Calçado</div><div class="value">${i.uniforme_calcado || '-'}</div></div>
      </div>
    </div>

    <div class="detail-section">
      <h4>Documentos enviados</h4>
      <div class="doc-list" id="docLinksWrap">${docsHtml}</div>
    </div>

    <div class="detail-section">
      <h4>Alterar status</h4>
      <div class="status-actions">
        <button class="status-btn ${i.status === 'recebida' ? 'active-recebida' : ''}" data-status="recebida">Recebida</button>
        <button class="status-btn ${i.status === 'em_analise' ? 'active-em_analise' : ''}" data-status="em_analise">Em análise</button>
        <button class="status-btn ${i.status === 'aprovada' ? 'active-aprovada' : ''}" data-status="aprovada">Aprovada</button>
        <button class="status-btn ${i.status === 'reserva' ? 'active-reserva' : ''}" data-status="reserva">Reserva</button>
        <button class="status-btn ${i.status === 'reprovada' ? 'active-reprovada' : ''}" data-status="reprovada">Reprovada</button>
      </div>
    </div>

    <div class="detail-section">
      <h4>Observações administrativas</h4>
      <textarea class="admin-textarea" id="obsTextarea" placeholder="Adicione observações internas sobre esta inscrição...">${i.observacoes_admin || ''}</textarea>
      <button class="btn btn-secondary" id="salvarObsBtn" style="margin-top:10px;">Salvar observações</button>
    </div>
  `;
}

async function atualizarStatus(id, novoStatus) {
  const { error } = await supabase.from('inscricoes').update({ status: novoStatus }).eq('id', id);
  if (error) { showToast('Erro ao atualizar status: ' + error.message, 'error'); return; }
  showToast('Status atualizado com sucesso!', 'success');
  await carregarDados();
  abrirModal(id);
}

async function salvarObservacoes(id) {
  const texto = modalCard.querySelector('#obsTextarea').value;
  const { error } = await supabase.from('inscricoes').update({ observacoes_admin: texto }).eq('id', id);
  if (error) { showToast('Erro ao salvar observações: ' + error.message, 'error'); return; }
  showToast('Observações salvas!', 'success');
  await carregarDados();
}

// ----------------------------------------------------------------------------
// Navegação entre "Dashboard" e "Configurações do Site"
// ----------------------------------------------------------------------------
const navDashboard = document.getElementById('navDashboard');
const navSiteConfig = document.getElementById('navSiteConfig');
const viewDashboard = document.getElementById('viewDashboard');
const viewSiteConfig = document.getElementById('viewSiteConfig');
const pageTitle = document.getElementById('pageTitle');

navDashboard.addEventListener('click', () => {
  navDashboard.classList.add('active');
  navSiteConfig.classList.remove('active');
  viewDashboard.hidden = false;
  viewSiteConfig.hidden = true;
  pageTitle.textContent = 'Dashboard de Inscrições';
});

navSiteConfig.addEventListener('click', () => {
  navSiteConfig.classList.add('active');
  navDashboard.classList.remove('active');
  viewDashboard.hidden = true;
  viewSiteConfig.hidden = false;
  pageTitle.textContent = 'Configurações do Site';
  carregarConfigForm();
});

// ----------------------------------------------------------------------------
// Configurações do Site — carregar e salvar
// ----------------------------------------------------------------------------
const siteConfigForm = document.getElementById('siteConfigForm');
let configCarregada = false;

async function carregarConfigForm() {
  if (configCarregada) return; // evita recarregar toda vez que troca de aba
  const { data, error } = await supabase.from('site_config').select('key, value');
  if (error) {
    showToast('Erro ao carregar configurações: ' + error.message, 'error');
    return;
  }
  data.forEach((row) => {
    const field = siteConfigForm.querySelector(`[name="${row.key}"]`);
    if (field) field.value = row.value;
  });
  configCarregada = true;
}

siteConfigForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('saveConfigBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="loader"></span>';

  const formData = new FormData(siteConfigForm);
  const updates = Array.from(formData.entries()).map(([key, value]) => ({ key, value }));

  const { error } = await supabase.from('site_config').upsert(updates, { onConflict: 'key' });

  saveBtn.disabled = false;
  saveBtn.textContent = 'Salvar alterações';

  if (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
    return;
  }
  showToast('Site atualizado com sucesso! As mudanças já estão no ar.', 'success');
});

// ----------------------------------------------------------------------------
// Toast simples
// ----------------------------------------------------------------------------
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById('toastRoot').appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
