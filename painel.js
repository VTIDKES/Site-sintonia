/* ============================================================
   Painel de resultados
   Consome as rotas protegidas da API usando o cabeçalho X-Chave.
   ============================================================ */

const API = (window.PORTAL_API || '').replace(/\/+$/, '');
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = v => v == null ? '—' : String(v).replace('.', ',');

let chave = '';
let cache = {};

/* ---------------- acesso ---------------- */

const guardada = localStorage.getItem('portal_chave');
if(guardada) el('p-chave').value = guardada;

el('p-entrar').addEventListener('submit', ev => {
  ev.preventDefault();
  chave = el('p-chave').value.trim();
  if(!chave) return;
  el('p-estado').textContent = 'Consultando…';
  el('p-estado').className = 'nota';

  buscar('/resumo')
    .then(d => {
      cache.resumo = d;
      if(el('p-lembrar').checked) localStorage.setItem('portal_chave', chave);
      el('p-entrar').hidden = true;
      el('p-estado').hidden = true;
      el('p-conteudo').hidden = false;
      abrir('questionarios');
    })
    .catch(e => {
      el('p-estado').textContent = e.message === '401'
        ? 'Chave incorreta.'
        : 'Não consegui falar com o servidor. Ele pode estar acordando, tente de novo em um minuto.';
      el('p-estado').className = 'nota erro';
    });
});

function buscar(rota){
  return fetch(API + rota, { headers:{ 'X-Chave': chave } })
    .then(r => { if(!r.ok) throw new Error(String(r.status)); return r.json(); });
}

/* ---------------- abas ---------------- */

el('p-abas').addEventListener('click', e => {
  const bt = e.target.closest('.aba');
  if(bt) abrir(bt.dataset.aba);
});

function abrir(nome){
  document.querySelectorAll('.aba').forEach(b =>
    b.classList.toggle('ativa', b.dataset.aba === nome));
  el('p-painel').innerHTML = '<p class="nota">Carregando…</p>';

  if(nome === 'questionarios'){
    (cache.resumo ? Promise.resolve(cache.resumo) : buscar('/resumo'))
      .then(d => { cache.resumo = d; verQuestionarios(d); }).catch(erro);
  }
  if(nome === 'avaliacao'){
    (cache.aval ? Promise.resolve(cache.aval) : buscar('/avaliacao/resumo'))
      .then(d => { cache.aval = d; verAvaliacao(d); }).catch(erro);
  }
  if(nome === 'tentativas'){
    (cache.rel ? Promise.resolve(cache.rel) : buscar('/relatorio?limite=500'))
      .then(d => { cache.rel = d; verTentativas(d); }).catch(erro);
  }
}

function erro(){
  el('p-painel').innerHTML = '<p class="nota erro">Não consegui carregar esses dados.</p>';
}

/* ---------------- questionários ---------------- */

function verQuestionarios(d){
  if(!d.por_aula || !d.por_aula.length){
    el('p-painel').innerHTML = '<p class="nota">Nenhum questionário respondido ainda.</p>';
    return;
  }
  el('p-painel').innerHTML =
    '<h2 class="p-tit">Desempenho por aula</h2>' +
    tabela(['Aula', 'Tentativas', 'Alunos', 'Média'],
      d.por_aula.map(a => [a.aula, a.tentativas, a.alunos, num(a.media) + '%'])) +
    '<h2 class="p-tit">Questões por índice de acerto</h2>' +
    '<p class="nota">Da mais difícil para a mais fácil. As primeiras linhas mostram onde a turma está travando.</p>' +
    tabela(['Questão', 'Respostas', 'Acerto'],
      (d.por_questao || []).map(q => [
        q.questao, q.respostas,
        '<span class="barrinha"><span style="width:' + q.acerto_pct + '%"></span></span> ' +
        num(q.acerto_pct) + '%'
      ])) +
    baixar('resumo-questionarios', d);
}

/* ---------------- avaliação ---------------- */

function verAvaliacao(d){
  if(!d.n){
    el('p-painel').innerHTML = '<p class="nota">Nenhuma avaliação registrada ainda.</p>';
    return;
  }
  const alfa = d.alfa_cronbach_geral;
  el('p-painel').innerHTML =
    '<div class="cartoes">' +
      cartao('Respondentes', d.n) +
      cartao('Média geral', num(d.media_geral) + ' / 5') +
      cartao('Alfa de Cronbach', num(alfa),
             alfa == null ? 'poucos dados' : alfa >= 0.7 ? 'consistente' : 'abaixo de 0,70') +
      cartao('Tempo mediano', d.duracao_mediana_s ? Math.round(d.duracao_mediana_s / 60) + ' min' : '—') +
    '</div>' +

    '<h2 class="p-tit">Por dimensão</h2>' +
    tabela(['Dimensão', 'Itens', 'Média', 'Desvio', 'Alfa'],
      d.por_dimensao.map(x => [
        esc(x.nome), x.itens,
        '<span class="barrinha"><span style="width:' + (x.media / 5 * 100) + '%"></span></span> ' + num(x.media),
        num(x.desvio),
        num(x.alfa_cronbach)
      ])) +

    '<h2 class="p-tit">Itens, da menor para a maior média</h2>' +
    tabela(['Item', 'Dim', 'Texto', 'Média', '1', '2', '3', '4', '5'],
      d.por_item.map(x => [
        x.item + (x.reverso ? ' <em>(rev)</em>' : ''),
        x.dimensao, esc(x.texto), num(x.media),
        x.distribuicao['1'], x.distribuicao['2'], x.distribuicao['3'],
        x.distribuicao['4'], x.distribuicao['5']
      ])) +

    '<h2 class="p-tit">Perfil da amostra</h2>' +
    Object.keys(d.perfil).map(k => {
      const p = d.perfil[k];
      const itens = Object.keys(p.contagem);
      if(!itens.length) return '';
      return '<p class="p-sub">' + esc(p.pergunta) + '</p>' +
        tabela(['Opção', 'Respostas'], itens.map(o => [esc(o), p.contagem[o]]));
    }).join('') +

    '<h2 class="p-tit">Comentários</h2>' +
    Object.keys(d.abertas).map(k => {
      const a = d.abertas[k];
      if(!a.respostas.length) return '';
      return '<p class="p-sub">' + esc(a.pergunta) + '</p><ul class="comentarios">' +
        a.respostas.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>';
    }).join('') +

    baixar('avaliacao-portal', d);
}

/* ---------------- tentativas ---------------- */

function verTentativas(d){
  if(!d.itens || !d.itens.length){
    el('p-painel').innerHTML = '<p class="nota">Nenhuma tentativa registrada ainda.</p>';
    return;
  }
  el('p-painel').innerHTML =
    '<h2 class="p-tit">Últimas ' + d.itens.length + ' tentativas</h2>' +
    tabela(['Quando', 'Aluno', 'Matrícula', 'Turma', 'Aula', 'Nota'],
      d.itens.map(t => [
        (t.enviado_em || '').slice(0, 16).replace('T', ' '),
        esc(t.nome), esc(t.matricula), esc(t.turma || '—'), t.aula,
        t.acertos + '/' + t.total
      ])) +
    baixar('tentativas', d) +
    '<button class="btn btn-fantasma" type="button" id="p-csv">Baixar CSV</button>';

  const bt = el('p-csv');
  if(bt) bt.addEventListener('click', () => csv(d.itens));
}

/* ---------------- utilidades ---------------- */

function tabela(cabecalho, linhas){
  return '<div class="p-tab"><table><thead><tr>' +
    cabecalho.map(h => '<th>' + h + '</th>').join('') +
    '</tr></thead><tbody>' +
    linhas.map(l => '<tr>' + l.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

function cartao(rot, val, obs){
  return '<div class="cartao"><span class="cartao-rot">' + rot + '</span>' +
    '<span class="cartao-val">' + val + '</span>' +
    (obs ? '<span class="cartao-obs">' + obs + '</span>' : '') + '</div>';
}

function baixar(nome, dados){
  const blob = encodeURIComponent(JSON.stringify(dados, null, 2));
  return '<p class="quiz-acoes"><a class="btn btn-fantasma" download="' + nome + '.json" ' +
    'href="data:application/json;charset=utf-8,' + blob + '">Baixar JSON</a></p>';
}

function csv(itens){
  const cab = ['enviado_em','nome','matricula','turma','aula','acertos','total','percentual','duracao_s'];
  const linhas = itens.map(t => cab.map(c => {
    const v = String(t[c] == null ? '' : t[c]);
    return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(';'));
  const texto = '\ufeff' + cab.join(';') + '\n' + linhas.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type:'text/csv;charset=utf-8' }));
  a.download = 'tentativas.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
