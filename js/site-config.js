import { supabase } from './supabase-config.js';

// Busca todas as configurações e aplica nos elementos da página.
// Se o Supabase falhar por qualquer motivo, os textos padrão (já escritos
// no HTML) continuam aparecendo normalmente — nada quebra.
async function carregarConfiguracoes() {
  try {
    const { data, error } = await supabase.from('site_config').select('key, value');
    if (error || !data) return;

    const config = {};
    data.forEach((row) => { config[row.key] = row.value; });

    setText('cfgHeroTitle', config.hero_title);
    setText('cfgHeroSubtitle', config.hero_subtitle);
    setText('cfgBannerText', config.banner_text);
    setText('cfgStat1Num', config.stat1_num);
    setText('cfgStat1Label', config.stat1_label);
    setText('cfgStat2Num', config.stat2_num);
    setText('cfgStat2Label', config.stat2_label);
    setText('cfgStat3Num', config.stat3_num);
    setText('cfgStat3Label', config.stat3_label);
    setText('cfgAboutTitle', config.about_title);
    setText('cfgAboutText', config.about_text);
    setText('cfgCtaTitle', config.cta_title);
    setText('cfgCtaSubtitle', config.cta_subtitle);

    setPhoneLink('cfgPhone1', config.contact_phone1);
    setPhoneLink('cfgPhone2', config.contact_phone2);
    setEmailLink('cfgEmail', config.contact_email);
    setAddress('cfgAddress', config.address);
  } catch {
    // Silencioso: mantém os textos padrão do HTML
  }
}

function setText(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setPhoneLink(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.href = `tel:${value.replace(/\D/g, '')}`;
}

function setEmailLink(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.href = `mailto:${value}`;
}

function setAddress(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = value.split('\n').map((l) => l.trim()).filter(Boolean).join('<br>');
}

carregarConfiguracoes();
