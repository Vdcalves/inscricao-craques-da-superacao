import { supabase, STORAGE_BUCKET, maskCPF, maskPhone, maskCEP, isValidCPF, buscarCEP } from './supabase-config.js';

// ----------------------------------------------------------------------------
// Lista de documentos obrigatórios (chave = coluna no banco / pasta no storage)
// ----------------------------------------------------------------------------
const DOCUMENTOS = [
  { key: 'doc_rg_participante', label: 'RG do participante', icon: '🪪' },
  { key: 'doc_cpf_participante', label: 'CPF do participante', icon: '🪪' },
  { key: 'doc_rg_responsavel', label: 'RG do responsável', icon: '🪪' },
  { key: 'doc_cpf_responsavel', label: 'CPF do responsável', icon: '🪪' },
  { key: 'doc_comprovante_residencia', label: 'Comprovante de residência', icon: '🏠' },
  { key: 'doc_boletim_escolar', label: 'Boletim escolar', icon: '📚' },
  { key: 'doc_exame_cardiologico', label: 'Exame cardiológico', icon: '🫀' },
  { key: 'doc_atestado_cardiologista', label: 'Atestado do cardiologista', icon: '🩺' },
  { key: 'doc_atestado_aptidao', label: 'Atestado médico de aptidão física', icon: '📋' },
  { key: 'doc_exame_sangue', label: 'Exame de sangue', icon: '🩸' },
  { key: 'doc_carta_assinada', label: 'Carta assinada', icon: '✍️' },
  { key: 'doc_foto_3x4', label: 'Foto 3x4', icon: '📷' },
];

const state = {
  currentStep: 1,
  totalSteps: 7,
  fotoAlunoFile: null,
  documentos: {}, // key -> File
};

const form = document.getElementById('inscricaoForm');
const docGrid = document.getElementById('docGrid');

// ----------------------------------------------------------------------------
// Monta dinamicamente os cards de upload de documentos
// ----------------------------------------------------------------------------
DOCUMENTOS.forEach((doc) => {
  const wrap = document.createElement('div');
  wrap.className = 'doc-upload';
  wrap.dataset.key = doc.key;
  wrap.innerHTML = `
    <div class="doc-title"><span class="doc-icon">${doc.icon}</span> ${doc.label} <span class="required">*</span></div>
    <div class="doc-status">Toque para selecionar arquivo (PDF, JPG ou PNG)</div>
    <input type="file" accept="application/pdf,image/jpeg,image/png,image/jpg" data-doc-key="${doc.key}">
  `;
  docGrid.appendChild(wrap);
});

docGrid.addEventListener('change', (e) => {
  const input = e.target.closest('input[type="file"]');
  if (!input) return;
  const key = input.dataset.docKey;
  const file = input.files[0];
  const card = input.closest('.doc-upload');
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('Arquivo maior que 10MB. Escolha outro arquivo.', 'error');
    input.value = '';
    return;
  }

  state.documentos[key] = file;
  card.classList.add('filled');
  card.classList.remove('invalid');
  card.querySelector('.doc-status').textContent = `✓ ${file.name}`;
});

// ----------------------------------------------------------------------------
// Foto do aluno
// ----------------------------------------------------------------------------
const fotoAlunoInput = document.getElementById('fotoAluno');
const fotoAlunoBtn = document.getElementById('fotoAlunoBtn');
const photoPreview = document.getElementById('photoPreview');

fotoAlunoBtn.addEventListener('click', () => fotoAlunoInput.click());
fotoAlunoInput.addEventListener('change', () => {
  const file = fotoAlunoInput.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showToast('Foto maior que 10MB. Escolha outra imagem.', 'error');
    return;
  }
  state.fotoAlunoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => { photoPreview.innerHTML = `<img src="${e.target.result}" alt="Foto do aluno">`; };
  reader.readAsDataURL(file);
});

// ----------------------------------------------------------------------------
// Máscaras de campos
// ----------------------------------------------------------------------------
form.querySelector('[name="cpf"]').addEventListener('input', (e) => { e.target.value = maskCPF(e.target.value); });
form.querySelector('[name="cpf_responsavel"]').addEventListener('input', (e) => { e.target.value = maskCPF(e.target.value); });
form.querySelector('[name="telefone"]').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
form.querySelector('[name="whatsapp"]').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });

const cepInput = form.querySelector('[name="cep"]');
cepInput.addEventListener('input', (e) => { e.target.value = maskCEP(e.target.value); });
cepInput.addEventListener('blur', async () => {
  const data = await buscarCEP(cepInput.value);
  if (data) {
    form.querySelector('[name="endereco"]').value = `${data.logradouro}${data.bairro ? ', ' + data.bairro : ''}`;
    form.querySelector('[name="cidade"]').value = data.localidade;
    form.querySelector('[name="estado"]').value = data.uf;
  }
});

// Pílulas de rádio (sexo)
document.querySelectorAll('.radio-group').forEach((group) => {
  group.querySelectorAll('.radio-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      group.querySelectorAll('.radio-pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      pill.querySelector('input').checked = true;
    });
  });
});

// ----------------------------------------------------------------------------
// Navegação entre etapas
// ----------------------------------------------------------------------------
function goToStep(step) {
  document.querySelectorAll('.step').forEach((el) => {
    el.hidden = Number(el.dataset.step) !== step;
  });
  document.querySelectorAll('.progress-dot').forEach((dot) => {
    const s = Number(dot.dataset.step);
    dot.classList.toggle('active', s === step);
    dot.classList.toggle('done', s < step);
  });
  const fillPct = ((step - 1) / (state.totalSteps - 1)) * 100;
  document.getElementById('progressFill').style.width = `${fillPct}%`;
  state.currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
  let valid = true;
  const stepEl = form.querySelector(`.step[data-step="${step}"]`);
  if (!stepEl) return true;

  // Campos padrão com "required"
  stepEl.querySelectorAll('input[required], select[required], textarea[required]').forEach((input) => {
    const field = input.closest('.field');
    let ok = true;
    if (input.type === 'radio') {
      const group = stepEl.querySelectorAll(`input[name="${input.name}"]`);
      ok = Array.from(group).some((r) => r.checked);
    } else {
      ok = input.value.trim() !== '';
    }
    if (field) field.classList.toggle('has-error', !ok);
    if (input.type !== 'radio') input.classList.toggle('invalid', !ok);
    if (!ok) valid = false;
  });

  // Validações específicas
  if (step === 1) {
    if (!state.fotoAlunoFile) {
      document.querySelector('.photo-upload').closest('.field').classList.add('has-error');
      valid = false;
    } else {
      document.querySelector('.photo-upload').closest('.field').classList.remove('has-error');
    }
    const cpfInput = form.querySelector('[name="cpf"]');
    if (cpfInput.value && !isValidCPF(cpfInput.value)) {
      cpfInput.classList.add('invalid');
      cpfInput.closest('.field').classList.add('has-error');
      valid = false;
    }
  }

  if (step === 2) {
    const cpfR = form.querySelector('[name="cpf_responsavel"]');
    if (cpfR.value && !isValidCPF(cpfR.value)) {
      cpfR.classList.add('invalid');
      cpfR.closest('.field').classList.add('has-error');
      valid = false;
    }
  }

  if (step === 6) {
    DOCUMENTOS.forEach((doc) => {
      const card = docGrid.querySelector(`.doc-upload[data-key="${doc.key}"]`);
      const ok = !!state.documentos[doc.key];
      card.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) showToast('Envie todos os documentos obrigatórios.', 'error');
  }

  if (step === 7) {
    const decl = document.getElementById('declaracao');
    document.getElementById('declaracaoError').style.display = decl.checked ? 'none' : 'block';
    if (!decl.checked) valid = false;
  }

  if (!valid && step !== 6) showToast('Preencha todos os campos obrigatórios.', 'error');
  return valid;
}

document.querySelectorAll('[data-next]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (validateStep(state.currentStep)) goToStep(state.currentStep + 1);
  });
});
document.querySelectorAll('[data-prev]').forEach((btn) => {
  btn.addEventListener('click', () => goToStep(state.currentStep - 1));
});

// ----------------------------------------------------------------------------
// Envio da inscrição
// ----------------------------------------------------------------------------
const overlay = document.getElementById('uploadOverlay');
const uploadBar = document.getElementById('uploadBarInner');
const uploadPct = document.getElementById('uploadPct');
const uploadStatusText = document.getElementById('uploadStatusText');

function setUploadProgress(pct, text) {
  uploadBar.style.width = `${pct}%`;
  uploadPct.textContent = `${Math.round(pct)}%`;
  if (text) uploadStatusText.textContent = text;
}

async function uploadArquivo(file, pastaId, nomeCampo) {
  const ext = file.name.split('.').pop();
  const path = `${pastaId}/${nomeCampo}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw new Error(`Falha ao enviar "${nomeCampo}": ${error.message}`);
  return path;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateStep(6)) return;

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  overlay.hidden = false;
  setUploadProgress(2, 'Preparando arquivos...');

  try {
    // ID temporário para agrupar os arquivos desta inscrição no Storage
    const pastaId = crypto.randomUUID();

    const totalUploads = DOCUMENTOS.length + 1; // + foto do aluno
    let uploadsFeitos = 0;

    setUploadProgress(5, 'Enviando foto do aluno...');
    const fotoAlunoPath = await uploadArquivo(state.fotoAlunoFile, pastaId, 'foto_aluno');
    uploadsFeitos++;
    setUploadProgress(5 + (uploadsFeitos / totalUploads) * 70, 'Enviando documentos...');

    const documentPaths = {};
    for (const doc of DOCUMENTOS) {
      const file = state.documentos[doc.key];
      documentPaths[`${doc.key}_path`] = await uploadArquivo(file, pastaId, doc.key);
      uploadsFeitos++;
      setUploadProgress(5 + (uploadsFeitos / totalUploads) * 70, `Enviando ${doc.label}...`);
    }

    setUploadProgress(80, 'Salvando dados da inscrição...');

    const formData = new FormData(form);
    const payload = {
      nome_completo: formData.get('nome_completo'),
      data_nascimento: formData.get('data_nascimento'),
      sexo: formData.get('sexo'),
      cpf: formData.get('cpf'),
      rg: formData.get('rg'),
      certidao_nascimento_numero: formData.get('certidao_nascimento_numero'),
      escola: formData.get('escola'),
      serie: formData.get('serie'),
      nome_mae: formData.get('nome_mae') || null,
      nome_pai: formData.get('nome_pai') || null,
      responsavel_legal: formData.get('responsavel_legal'),
      cpf_responsavel: formData.get('cpf_responsavel'),
      telefone: formData.get('telefone'),
      whatsapp: formData.get('whatsapp'),
      email: formData.get('email'),
      endereco: formData.get('endereco'),
      cep: formData.get('cep'),
      cidade: formData.get('cidade'),
      estado: formData.get('estado'),
      necessidade_especial: formData.get('necessidade_especial') || null,
      alergias: formData.get('alergias') || null,
      medicamentos: formData.get('medicamentos') || null,
      observacoes: formData.get('observacoes') || null,
      uniforme_camisa: formData.get('uniforme_camisa'),
      uniforme_calcao: formData.get('uniforme_calcao'),
      uniforme_calcado: formData.get('uniforme_calcado'),
      declaracao_aceita: document.getElementById('declaracao').checked,
      foto_aluno_path: fotoAlunoPath,
      ...documentPaths,
    };

    const { data, error } = await supabase
      .from('inscricoes')
      .insert(payload)
      .select('protocolo')
      .single();

    if (error) throw new Error(error.message);

    setUploadProgress(100, 'Concluído!');
    setTimeout(() => {
      overlay.hidden = true;
      form.hidden = true;
      document.getElementById('successScreen').hidden = false;
      document.getElementById('protocoloValue').textContent = data.protocolo;
    }, 500);

  } catch (err) {
    console.error(err);
    overlay.hidden = true;
    submitBtn.disabled = false;
    showToast(err.message || 'Erro ao enviar inscrição. Tente novamente.', 'error');
  }
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
