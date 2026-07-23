// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// 1. Crie um projeto gratuito em https://supabase.com
// 2. Vá em Project Settings > API
// 3. Copie a "Project URL" e a "anon public key" e cole abaixo.
// A "anon key" é pública por natureza (é usada no navegador),
// a segurança real fica por conta das políticas RLS definidas
// em supabase/schema.sql — por isso é seguro publicar este
// arquivo no Netlify.
// ============================================================

export const SUPABASE_URL = 'https://uikisxdpbfmvyjlkojij.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_HpLfy1QH5OPC7DTQKLc9iA_4mHbtXml';

export const STORAGE_BUCKET = 'documentos';

// Carrega o SDK do Supabase via CDN (não precisa de build/npm)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// Helpers usados nas páginas
// ------------------------------------------------------------

/** Formata CPF enquanto o usuário digita: 000.000.000-00 */
export function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Formata telefone: (00) 00000-0000 */
export function maskPhone(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Formata CEP: 00000-000 */
export function maskCEP(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/** Valida CPF (dígitos verificadores) */
export function isValidCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(cpf[10]);
}

/** Busca endereço pelo CEP usando a API pública ViaCEP */
export async function buscarCEP(cep) {
  const clean = (cep || '').replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

/** Formata data ISO (yyyy-mm-dd) para dd/mm/yyyy */
export function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** Rótulos amigáveis para o status da inscrição */
export const STATUS_LABELS = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  reserva: 'Reserva',
  reprovada: 'Reprovada',
};

export const STATUS_COLORS = {
  recebida: 'status-recebida',
  em_analise: 'status-analise',
  aprovada: 'status-aprovada',
  reserva: 'status-reserva',
  reprovada: 'status-reprovada',
};
