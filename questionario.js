/* ============================================================
   Questionários do portal
   Fala com a API que grava as respostas no MongoDB.
   ============================================================ */

// O endereço fica em config.js, um único lugar para os dois formulários.
const API = (window.PORTAL_API || '').replace(/\/+$/, '');

const el = id => document.getElementById(id);
const estado = el('quiz-estado');
const aula = new URLSearchParams(location.search).get('a') || '';

let questoes = [];
let inicio = 0;
let acordado = false;

/* ---------------- acorda o serviço ---------------- */

// O plano gratuito do Render hiberna após 15 min sem acesso e leva perto
// de um minuto para voltar. Chamamos /saude assim que a página abre, para
// que ele já esteja de pé quando o aluno terminar de responder.
function acordar(){
  const t0 = Date.now();
  estado.textContent = 'Conectando ao servidor…';
  return fetch(API + '/saude', { cache:'no-store' })
    .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(() => {
      acordado = true;
      const s = ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',');
      estado.textContent = 'Servidor pronto (' + s + ' s).';
      estado.classList.add('ok');
    })
    .catch(() => {
      estado.textContent = 'Não consegui falar com o servidor. Verifique o endereço da API ou tente de novo em instantes.';
      estado.classList.add('erro');
      throw new Error('offline');
    });
}

/* ---------------- lista de questionários ---------------- */

function listar(){
  fetch(API + '/questionarios')
    .then(r => r.json())
    .then(lista => {
      el('quiz-lista-ul').innerHTML = lista.map(q =>
        '<li><a href="questionario.html?a=' + q.aula + '">' + q.titulo + '</a>' +
        '<span>' + q.questoes + ' questões</span></li>'
      ).join('');
      el('quiz-lista').hidden = false;
    })
    .catch(() => {});
}

/* ---------------- um questionário ---------------- */

function abrir(){
  fetch(API + '/questionario/' + encodeURIComponent(aula))
    .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => {
      questoes = d.questoes;
      inicio = Date.now();
      el('quiz-titulo').textContent = d.titulo;
      el('quiz-lead').textContent =
        d.questoes.length + ' questões de múltipla escolha. A correção aparece assim que você enviar.';

      el('quiz-questoes').innerHTML = d.questoes.map((q, i) =>
        '<fieldset class="questao" id="box-' + q.id + '">' +
          '<legend><span class="qnum">' + (i + 1) + '</span>' + escapar(q.enunciado) + '</legend>' +
          ['a','b','c','d'].filter(k => q.alternativas[k]).map(k =>
            '<label class="alt">' +
              '<input type="radio" name="' + q.id + '" value="' + k + '" required>' +
              '<span class="alt-letra">' + k + '</span>' +
              '<span class="alt-txt">' + escapar(q.alternativas[k]) + '</span>' +
            '</label>'
          ).join('') +
        '</fieldset>'
      ).join('');

      el('quiz-form').hidden = false;
    })
    .catch(() => {
      el('quiz-lead').textContent = 'Não encontrei esse questionário.';
      listar();
    });
}

/* ---------------- envio ---------------- */

function enviar(ev){
  ev.preventDefault();

  const respostas = {};
  let faltando = null;
  questoes.forEach(q => {
    const m = document.querySelector('input[name="' + q.id + '"]:checked');
    if(m) respostas[q.id] = m.value;
    else if(!faltando) faltando = q.id;
  });

  if(faltando){
    el('f-aviso').textContent = 'Ainda falta responder alguma questão.';
    el('f-aviso').className = 'nota erro';
    const box = el('box-' + faltando);
    box.classList.add('pendente');
    box.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  const bt = el('f-enviar');
  bt.disabled = true;
  bt.textContent = acordado ? 'Enviando…' : 'Acordando o servidor…';
  el('f-aviso').textContent = '';
  el('f-aviso').className = 'nota';

  fetch(API + '/respostas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aula: aula,
      nome: el('f-nome').value,
      matricula: el('f-matricula').value,
      turma: el('f-turma').value,
      respostas: respostas,
      duracao_s: Math.round((Date.now() - inicio) / 1000)
    })
  })
  .then(r => r.json().then(j => ({ ok: r.ok, j: j })))
  .then(({ ok, j }) => {
    if(!ok) throw new Error(JSON.stringify(j));
    mostrar(j);
  })
  .catch(() => {
    bt.disabled = false;
    bt.textContent = 'Enviar respostas';
    el('f-aviso').textContent = 'Não consegui enviar. Confira a conexão e tente de novo, suas marcações continuam aqui.';
    el('f-aviso').className = 'nota erro';
  });
}

/* ---------------- resultado ---------------- */

function mostrar(r){
  el('quiz-form').hidden = true;
  estado.hidden = true;

  const faixa = r.percentual >= 70 ? 'bom' : r.percentual >= 50 ? 'medio' : 'baixo';
  const mapa = {};
  questoes.forEach(q => mapa[q.id] = q);

  el('quiz-resultado').innerHTML =
    '<div class="placar placar-' + faixa + '">' +
      '<span class="placar-num">' + r.acertos + '<span class="placar-de">/' + r.total + '</span></span>' +
      '<span class="placar-pct">' + String(r.percentual).replace('.', ',') + '% de acerto</span>' +
    '</div>' +
    (r.gravado
      ? '<p class="nota ok">Resposta registrada.</p>'
      : '<p class="nota erro">A correção acima está certa, mas o registro não foi gravado. Avise o professor.</p>') +
    '<div class="revisao">' +
      r.detalhe.map((d, i) => {
        const q = mapa[d.id] || { enunciado:'', alternativas:{} };
        return '<div class="rev ' + (d.acertou ? 'rev-ok' : 'rev-nao') + '">' +
          '<p class="rev-tit"><span class="qnum">' + (i + 1) + '</span>' + escapar(q.enunciado) + '</p>' +
          '<p class="rev-linha">Sua resposta: <strong>' + d.marcada + ')</strong> ' +
            escapar(q.alternativas[d.marcada] || '') + '</p>' +
          (d.acertou ? '' :
            '<p class="rev-linha rev-certa">Correta: <strong>' + d.correta + ')</strong> ' +
            escapar(q.alternativas[d.correta] || '') + '</p>') +
          '<p class="rev-exp">' + escapar(d.explicacao) + '</p>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<p class="quiz-acoes"><a class="btn" href="questionario.html">Outro questionário</a>' +
    '<a class="btn btn-fantasma" href="aula.html?f=' + aula + '">Rever a aula</a></p>';

  el('quiz-resultado').hidden = false;
  window.scrollTo({ top:0, behavior:'smooth' });
}

function escapar(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------------- início ---------------- */

document.addEventListener('change', e => {
  if(e.target.type === 'radio'){
    const box = e.target.closest('.questao');
    if(box) box.classList.remove('pendente');
  }
});

el('quiz-form').addEventListener('submit', enviar);

acordar().then(() => { aula ? abrir() : listar(); }).catch(() => {});
