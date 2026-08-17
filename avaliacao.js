/* ============================================================
   Avaliação do portal
   Instrumento Likert servido e armazenado pela API.
   ============================================================ */

// O endereço fica em config.js, um único lugar para os dois formulários.
const API = (window.PORTAL_API || '').replace(/\/+$/, '');

const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let inst = null;
let inicio = 0;

/* ---------------- carga ---------------- */

fetch(API + '/saude', { cache:'no-store' })
  .then(() => fetch(API + '/avaliacao'))
  .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
  .then(montar)
  .catch(() => {
    el('av-estado').textContent = 'Não consegui falar com o servidor. Tente novamente em instantes.';
    el('av-estado').className = 'nota erro';
    el('av-apresentacao').textContent = '';
  });

function montar(d){
  inst = d;
  inicio = Date.now();
  el('av-titulo').textContent = d.titulo;
  el('av-apresentacao').textContent = d.apresentacao;
  el('av-estado').hidden = true;

  // perfil
  el('av-perfil').innerHTML =
    '<fieldset class="ident"><legend>Sobre você</legend>' +
    d.perfil.map(p =>
      '<div class="perfil-linha">' +
        '<p class="perfil-p">' + esc(p.pergunta) + '</p>' +
        '<div class="perfil-ops">' +
          p.opcoes.map((o, i) =>
            '<label class="chip">' +
              '<input type="radio" name="perfil_' + p.id + '" value="' + esc(o) + '"' +
              (i === 0 ? '' : '') + '>' +
              '<span>' + esc(o) + '</span>' +
            '</label>').join('') +
        '</div>' +
      '</div>').join('') +
    '</fieldset>';

  // itens agrupados por dimensão
  const rot = d.escala.rotulos, notas = Object.keys(rot).map(Number).sort((a,b) => a-b);
  let html = '';
  Object.keys(d.dimensoes).forEach(sig => {
    const its = d.itens.filter(i => i.dim === sig);
    if(!its.length) return;
    html += '<fieldset class="bloco-dim"><legend>' + esc(d.dimensoes[sig]) + '</legend>' +
      '<p class="escala-guia"><span>' + esc(rot[notas[0]]) + '</span>' +
      '<span>' + esc(rot[notas[notas.length-1]]) + '</span></p>' +
      its.map(i =>
        '<div class="likert" id="li-' + i.id + '">' +
          '<p class="likert-txt">' + esc(i.texto) + '</p>' +
          '<div class="likert-ops">' +
            notas.map(n =>
              '<label class="bola" title="' + esc(rot[n]) + '">' +
                '<input type="radio" name="' + i.id + '" value="' + n + '" required>' +
                '<span>' + n + '</span>' +
              '</label>').join('') +
          '</div>' +
        '</div>').join('') +
      '</fieldset>';
  });
  el('av-itens').innerHTML = html;

  // abertas
  el('av-abertas').innerHTML =
    '<fieldset class="ident"><legend>Comentários</legend>' +
    d.abertas.map(a =>
      '<label class="aberta">' + esc(a.pergunta) +
      '<textarea name="ab_' + a.id + '" rows="3" maxlength="1200" placeholder="opcional"></textarea>' +
      '</label>').join('') +
    '</fieldset>';

  el('av-form').hidden = false;
  atualizarProgresso();
}

/* ---------------- progresso ---------------- */

function atualizarProgresso(){
  if(!inst) return;
  const feitos = inst.itens.filter(i =>
    document.querySelector('input[name="' + i.id + '"]:checked')).length;
  el('av-progresso').textContent = feitos + ' de ' + inst.itens.length + ' respondidos';
  el('av-progresso').className = 'progresso' + (feitos === inst.itens.length ? ' completo' : '');
}

document.addEventListener('change', e => {
  if(e.target.type === 'radio'){
    const li = e.target.closest('.likert');
    if(li) li.classList.remove('pendente');
    atualizarProgresso();
  }
});

/* ---------------- envio ---------------- */

el('av-form').addEventListener('submit', ev => {
  ev.preventDefault();

  const respostas = {};
  let faltando = null;
  inst.itens.forEach(i => {
    const m = document.querySelector('input[name="' + i.id + '"]:checked');
    if(m) respostas[i.id] = parseInt(m.value, 10);
    else if(!faltando) faltando = i.id;
  });

  if(faltando){
    el('av-aviso').textContent = 'Faltou responder algum item. Marquei em vermelho o primeiro.';
    el('av-aviso').className = 'nota erro';
    const li = el('li-' + faltando);
    li.classList.add('pendente');
    li.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  const perfil = {};
  inst.perfil.forEach(p => {
    const m = document.querySelector('input[name="perfil_' + p.id + '"]:checked');
    if(m) perfil[p.id] = m.value;
  });

  const abertas = {};
  inst.abertas.forEach(a => {
    const t = document.querySelector('textarea[name="ab_' + a.id + '"]');
    if(t && t.value.trim()) abertas[a.id] = t.value;
  });

  const bt = el('av-enviar');
  bt.disabled = true;
  bt.textContent = 'Enviando…';
  el('av-aviso').textContent = '';

  fetch(API + '/avaliacao', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      respostas: respostas,
      perfil: perfil,
      abertas: abertas,
      duracao_s: Math.round((Date.now() - inicio) / 1000)
    })
  })
  .then(r => r.json().then(j => ({ ok:r.ok, j:j })))
  .then(({ ok, j }) => { if(!ok) throw new Error(); agradecer(j); })
  .catch(() => {
    bt.disabled = false;
    bt.textContent = 'Enviar avaliação';
    el('av-aviso').textContent = 'Não consegui enviar. Suas marcações continuam aqui, tente de novo.';
    el('av-aviso').className = 'nota erro';
  });
});

/* ---------------- fim ---------------- */

function agradecer(r){
  el('av-form').hidden = true;
  const dims = r.medias_dimensao || {};
  el('av-fim').innerHTML =
    '<div class="placar placar-bom">' +
      '<span class="placar-num">Obrigado</span>' +
      '<span class="placar-pct">sua avaliação foi registrada</span>' +
    '</div>' +
    (r.gravado ? '' :
      '<p class="nota erro">O envio chegou, mas o registro não foi gravado. Avise o professor.</p>') +
    '<p class="nota">Como você avaliou cada aspecto, numa escala de 1 a 5:</p>' +
    '<div class="barras">' +
      Object.keys(dims).map(d =>
        '<div class="barra-linha">' +
          '<span class="barra-rot">' + esc(r.dimensoes[d] || d) + '</span>' +
          '<span class="barra-trilho"><span class="barra-cheia" style="width:' +
            (dims[d] / 5 * 100).toFixed(0) + '%"></span></span>' +
          '<span class="barra-val">' + String(dims[d]).replace('.', ',') + '</span>' +
        '</div>').join('') +
    '</div>' +
    '<p class="quiz-acoes"><a class="btn" href="index.html">Voltar ao portal</a>' +
    '<a class="btn btn-fantasma" href="questionario.html">Fazer um questionário</a></p>';
  el('av-fim').hidden = false;
  window.scrollTo({ top:0, behavior:'smooth' });
}
