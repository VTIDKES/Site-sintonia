/* ============================================================
   Animações das aulas
   Canvas puro, sem biblioteca. Cada aula recebe as suas
   conforme o mapa no fim do arquivo.
   ============================================================ */

(function(){

const COR = {
  tinta:'#14202A', suave:'#5A6B70', grade:'#DDE2DA', eixo:'#9AA79C',
  cobalto:'#1B45C8', pena:'#C0341D', verde:'#0F7B54', ambar:'#B07500',
  papel:'#F8F9F5'
};

const MONO = '11px "IBM Plex Mono", monospace';

/* ---------------- helpers de desenho ---------------- */

// box = [x, y, largura, altura] em pixels
function eixos(c, box, xr, yr, op){
  op = op || {};
  const [bx, by, bw, bh] = box;
  const X = x => bx + (x - xr[0]) / (xr[1] - xr[0]) * bw;
  const Y = y => by + bh - (y - yr[0]) / (yr[1] - yr[0]) * bh;

  c.save();
  c.strokeStyle = COR.grade; c.lineWidth = 1;
  c.fillStyle = COR.suave; c.font = MONO; c.textBaseline = 'middle';

  (op.gx || []).forEach(g => {
    const x = Math.round(X(g[0])) + .5;
    c.beginPath(); c.moveTo(x, by); c.lineTo(x, by + bh); c.stroke();
    if(g[1]){ c.textAlign = 'center'; c.fillText(g[1], x, by + bh + 12); }
  });
  (op.gy || []).forEach(g => {
    const y = Math.round(Y(g[0])) + .5;
    c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + bw, y); c.stroke();
    if(g[1]){ c.textAlign = 'right'; c.fillText(g[1], bx - 6, y); }
  });

  c.strokeStyle = COR.eixo; c.lineWidth = 1.2;
  if(yr[0] < 0 && yr[1] > 0){
    const y = Math.round(Y(0)) + .5;
    c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + bw, y); c.stroke();
  }
  if(xr[0] < 0 && xr[1] > 0){
    const x = Math.round(X(0)) + .5;
    c.beginPath(); c.moveTo(x, by); c.lineTo(x, by + bh); c.stroke();
  }
  c.strokeStyle = COR.eixo; c.lineWidth = 1;
  c.strokeRect(bx + .5, by + .5, bw - 1, bh - 1);

  if(op.titulo){
    c.fillStyle = COR.suave; c.textAlign = 'left';
    c.fillText(op.titulo, bx + 6, by + 11);
  }
  c.restore();
  return { X, Y, box };
}

function traco(c, m, pts, cor, larg, dash){
  c.save();
  c.beginPath();
  c.rect(m.box[0], m.box[1], m.box[2], m.box[3]);
  c.clip();
  c.strokeStyle = cor; c.lineWidth = larg || 2;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if(dash) c.setLineDash(dash);
  c.beginPath();
  let novo = true;
  for(const p of pts){
    if(!isFinite(p[1])){ novo = true; continue; }
    const x = m.X(p[0]), y = m.Y(p[1]);
    if(novo){ c.moveTo(x, y); novo = false; } else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
}

function area(c, m, pts, base, cor){
  if(!pts.length) return;
  c.save();
  c.beginPath();
  c.rect(m.box[0], m.box[1], m.box[2], m.box[3]);
  c.clip();
  c.beginPath();
  c.moveTo(m.X(pts[0][0]), m.Y(base));
  pts.forEach(p => c.lineTo(m.X(p[0]), m.Y(p[1])));
  c.lineTo(m.X(pts[pts.length - 1][0]), m.Y(base));
  c.closePath();
  c.fillStyle = cor;
  c.fill();
  c.restore();
}

function bolinha(c, m, x, y, cor, r){
  c.save();
  c.fillStyle = cor;
  c.beginPath(); c.arc(m.X(x), m.Y(y), r || 4.5, 0, 7); c.fill();
  c.restore();
}

function cruz(c, m, x, y, cor, t){
  t = t || 6;
  const px = m.X(x), py = m.Y(y);
  c.save();
  c.strokeStyle = cor; c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(px - t, py - t); c.lineTo(px + t, py + t);
  c.moveTo(px + t, py - t); c.lineTo(px - t, py + t);
  c.stroke();
  c.restore();
}

function rotulo(c, x, y, txt, cor, align){
  c.save();
  c.fillStyle = cor || COR.suave;
  c.font = MONO;
  c.textAlign = align || 'left';
  c.textBaseline = 'middle';
  c.fillText(txt, x, y);
  c.restore();
}

function seta(c, x1, y1, x2, y2, cor, larg){
  const a = Math.atan2(y2 - y1, x2 - x1), t = 6;
  c.save();
  c.strokeStyle = cor; c.fillStyle = cor; c.lineWidth = larg || 1.6;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(x2 - t * Math.cos(a - .4), y2 - t * Math.sin(a - .4));
  c.lineTo(x2 - t * Math.cos(a + .4), y2 - t * Math.sin(a + .4));
  c.closePath(); c.fill();
  c.restore();
}

// resposta ao degrau de 2ª ordem, os três regimes
function deg2(t, z, wn){
  if(t < 0) return 0;
  if(Math.abs(z - 1) < 1e-6) return 1 - (1 + wn * t) * Math.exp(-wn * t);
  if(z < 1){
    const wd = wn * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * wn * t) *
      (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t));
  }
  const r = wn * Math.sqrt(z * z - 1), s1 = -z * wn + r, s2 = -z * wn - r;
  return 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
}

/* ============================================================
   catálogo de animações
   ============================================================ */

const ANIM = {

/* ---- funções singulares: impulso → degrau → rampa → parábola ---- */
singulares: {
  titulo: 'Funções singulares',
  legenda: 'Cada função é a integral da anterior. O impulso vira degrau, o degrau vira rampa, a rampa vira parábola.',
  altura: 210,
  ciclo: 10,
  quadro(c, W, H, t){
    const nomes = ['δ(t) impulso', 'u(t) degrau', 't·u(t) rampa', '½t²·u(t) parábola'];
    const fn = [
      x => (x > -0.02 && x < 0.02) ? 1 : 0,
      x => x >= 0 ? 1 : 0,
      x => x >= 0 ? x : 0,
      x => x >= 0 ? 0.5 * x * x : 0
    ];
    const alto = [1.25, 1.25, 1.6, 1.6];
    const larg = (W - 40) / 4;
    const fase = (t % this.ciclo) / this.ciclo * 4;

    for(let i = 0; i < 4; i++){
      const m = eixos(c, [16 + i * larg, 22, larg - 22, H - 62],
        [-0.6, 1.7], [-0.15, alto[i]],
        { gx:[[0,'0'],[1,'1']], titulo: nomes[i] });

      const vis = Math.max(0, Math.min(1, fase - i + 1));
      if(vis <= 0) continue;
      const xf = -0.6 + vis * 2.3;

      if(i === 0){
        // impulso: seta vertical de área 1
        if(xf > 0) seta(c, m.X(0), m.Y(0), m.X(0), m.Y(1), COR.cobalto, 2.4);
      } else {
        const pts = [];
        for(let k = 0; k <= 120; k++){
          const x = -0.6 + 2.3 * k / 120;
          if(x > xf) break;
          pts.push([x, fn[i](x)]);
        }
        traco(c, m, pts, COR.cobalto, 2.4);
      }

      // seta de integração entre os painéis
      if(i < 3 && fase > i + 1){
        const y = H - 26;
        seta(c, 16 + (i + 1) * larg - 20, y, 16 + (i + 1) * larg - 2, y, COR.pena, 1.4);
        rotulo(c, 16 + (i + 1) * larg - 11, y - 11, '∫', COR.pena, 'center');
      }
    }
  }
},

/* ---- malha aberta x malha fechada diante de uma perturbação ---- */
malha: {
  titulo: 'Malha aberta contra malha fechada',
  legenda: 'A perturbação entra aos 4 s. Na malha aberta a saída simplesmente desvia e fica lá. Na malha fechada o erro medido gera correção e a saída volta à referência.',
  altura: 260,
  ciclo: 12,
  quadro(c, W, H, t){
    const T = t % this.ciclo;
    const dt = 0.004, tau = 1.2, Ki = 3.2;
    const dPert = tt => (tt >= 4 && tt < 8) ? 0.45 : 0;

    let ya = 0, yf = 0, I = 0;
    const A = [], F = [];
    for(let k = 0; k * dt <= T; k++){
      const tt = k * dt;
      // malha aberta: entrada calibrada, sem medição
      ya += (-ya + 1 + dPert(tt)) / tau * dt;
      // malha fechada: integrador sobre o erro
      const e = 1 - yf;
      I += e * dt;
      const u = Ki * I;
      yf += (-yf + u + dPert(tt)) / tau * dt;
      if(k % 5 === 0){ A.push([tt, ya]); F.push([tt, yf]); }
    }

    const m = eixos(c, [46, 18, W - 62, H - 58],
      [0, this.ciclo], [0, 1.8],
      { gx:[[0,'0'],[4,'4 s'],[8,'8 s'],[12,'12']],
        gy:[[0,'0'],[1,'ref'],[1.5,'1,5']] });

    // faixa da perturbação
    c.save();
    c.fillStyle = 'rgba(176,117,0,.10)';
    c.fillRect(m.X(4), m.box[1], m.X(8) - m.X(4), m.box[3]);
    c.restore();
    if(T > 4) rotulo(c, m.X(4) + 6, m.box[1] + 13, 'perturbação', COR.ambar);

    traco(c, m, [[0, 1], [this.ciclo, 1]], COR.pena, 1.4, [5, 4]);
    traco(c, m, A, COR.ambar, 2.4);
    traco(c, m, F, COR.cobalto, 2.4);

    if(A.length){
      bolinha(c, m, A[A.length - 1][0], A[A.length - 1][1], COR.ambar);
      bolinha(c, m, F[F.length - 1][0], F[F.length - 1][1], COR.cobalto);
    }
    rotulo(c, W - 14, H - 30, 'malha aberta', COR.ambar, 'right');
    rotulo(c, W - 14, H - 16, 'malha fechada', COR.cobalto, 'right');
  }
},

/* ---- convolução deslizante ---- */
convolucao: {
  titulo: 'Convolução no tempo',
  legenda: 'h(τ) fica parado e x(t−τ) desliza sobre ele. A área sombreada em cada instante é o valor de y(t) traçado embaixo.',
  altura: 300,
  ciclo: 9,
  quadro(c, W, H, t){
    const T = (t % this.ciclo) / this.ciclo * 5 - 0.8;   // t de -0,8 a 4,2
    const h = τ => τ >= 0 ? Math.exp(-1.4 * τ) : 0;
    const x = τ => (τ >= 0 && τ <= 1) ? 1 : 0;

    const alt = (H - 64) / 2;
    const m1 = eixos(c, [46, 16, W - 62, alt],
      [-1.2, 4.4], [-0.15, 1.35],
      { gx:[[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4']],
        titulo:'h(τ) fixo · x(t−τ) deslizando' });

    // h(τ)
    const ph = [];
    for(let k = 0; k <= 200; k++){ const τ = -1.2 + 5.6 * k / 200; ph.push([τ, h(τ)]); }
    traco(c, m1, ph, COR.suave, 2);

    // x(t-τ) e sobreposição
    const px = [], sob = [];
    for(let k = 0; k <= 300; k++){
      const τ = -1.2 + 5.6 * k / 300;
      px.push([τ, x(T - τ)]);
      sob.push([τ, Math.min(h(τ), x(T - τ) ? h(τ) : 0)]);
    }
    area(c, m1, sob, 0, 'rgba(27,69,200,.20)');
    traco(c, m1, px, COR.cobalto, 2);
    rotulo(c, m1.X(T), m1.box[1] + 12, 't', COR.pena, 'center');
    traco(c, m1, [[T, -1], [T, 2]], COR.pena, 1.2, [3, 3]);

    // y(t) = integral da sobreposição
    const m2 = eixos(c, [46, 32 + alt, W - 62, alt],
      [-1.2, 4.4], [-0.05, 0.8],
      { gx:[[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4']], titulo:'y(t) = x * h' });

    const py = [];
    for(let k = 0; k <= 240; k++){
      const tt = -1.2 + 5.6 * k / 240;
      if(tt > T) break;
      // integral analítica do pulso com a exponencial
      const a = Math.max(0, tt - 1), b = Math.max(0, tt);
      py.push([tt, b > a ? (Math.exp(-1.4 * a) - Math.exp(-1.4 * b)) / 1.4 : 0]);
    }
    traco(c, m2, py, COR.cobalto, 2.4);
    if(py.length) bolinha(c, m2, py[py.length - 1][0], py[py.length - 1][1], COR.pena, 5);
  }
},

/* ---- polo andando no plano s e a resposta correspondente ---- */
polos: {
  titulo: 'Onde está o polo, como responde o sistema',
  legenda: 'Os polos caminham sobre a circunferência de raio ωₙ. Quanto mais perto do eixo imaginário, mais o sistema oscila; quanto mais à esquerda, mais rápido ele acomoda.',
  altura: 270,
  ciclo: 14,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const z = 1.25 - 1.1 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f)); // vai de 1,25 a 0,15 e volta
    const wn = 2;

    const lg = (W - 70) / 2;
    const ms = eixos(c, [46, 16, lg, H - 56],
      [-3.2, 1], [-3, 3],
      { gx:[[-3,'-3'],[-2,'-2'],[-1,'-1'],[0,'0']],
        gy:[[-2,'-2j'],[0,'0'],[2,'2j']], titulo:'plano s' });

    const circ = [];
    for(let k = 0; k <= 180; k++){
      const a = Math.PI / 2 + Math.PI * k / 180;
      circ.push([wn * Math.cos(a), wn * Math.sin(a)]);
    }
    traco(c, ms, circ, COR.grade, 1.5);

    if(z < 1){
      const wd = wn * Math.sqrt(1 - z * z);
      cruz(c, ms, -z * wn, wd, COR.pena, 7);
      cruz(c, ms, -z * wn, -wd, COR.pena, 7);
      traco(c, ms, [[0, 0], [-z * wn, wd]], COR.pena, 1.2, [3, 3]);
    } else {
      const r = wn * Math.sqrt(z * z - 1);
      cruz(c, ms, -z * wn + r, 0, COR.pena, 7);
      cruz(c, ms, -z * wn - r, 0, COR.pena, 7);
    }

    const mr = eixos(c, [70 + lg, 16, lg, H - 56],
      [0, 12], [0, 2],
      { gx:[[0,'0'],[4,'4'],[8,'8'],[12,'12 s']],
        gy:[[0,'0'],[1,'1'],[2,'2']], titulo:'resposta ao degrau' });

    const pts = [];
    for(let k = 0; k <= 300; k++){ const tt = 12 * k / 300; pts.push([tt, deg2(tt, z, wn)]); }
    traco(c, mr, [[0, 1], [12, 1]], COR.suave, 1, [4, 4]);
    traco(c, mr, pts, COR.cobalto, 2.4);

    const nome = z >= 1 ? (z > 1.02 ? 'sobreamortecido' : 'crítico') : 'subamortecido';
    rotulo(c, W - 14, H - 18, 'ζ = ' + z.toFixed(2).replace('.', ',') + ' · ' + nome, COR.pena, 'right');
  }
},

/* ---- carga do capacitor com a constante de tempo ---- */
rc: {
  titulo: 'Circuito RC carregando',
  legenda: 'A cada constante de tempo τ o capacitor cobre 63% do que ainda falta. Em 5τ a carga está praticamente completa.',
  altura: 250,
  ciclo: 12,
  quadro(c, W, H, t){
    const tau = 1;
    const T = (t % this.ciclo) / this.ciclo * 6;
    const v = 1 - Math.exp(-T / tau);

    // desenho do circuito
    const cx = 22, cy = 30, cw = Math.min(210, W * 0.34);
    c.save();
    c.strokeStyle = COR.eixo; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx, cy); c.lineTo(cx + 26, cy);
    c.moveTo(cx + 74, cy); c.lineTo(cx + cw - 44, cy);
    c.moveTo(cx + cw - 44, cy + 46); c.lineTo(cx + cw - 44, cy);
    c.moveTo(cx, cy + 78); c.lineTo(cx + cw - 44, cy + 78);
    c.moveTo(cx + cw - 44, cy + 62); c.lineTo(cx + cw - 44, cy + 78);
    c.moveTo(cx, cy); c.lineTo(cx, cy + 20);
    c.moveTo(cx, cy + 58); c.lineTo(cx, cy + 78);
    c.stroke();
    // resistor
    c.strokeStyle = COR.cobalto; c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(cx + 26, cy);
    [0,1,2,3].forEach(i => {
      c.lineTo(cx + 30 + i * 12, cy - 9);
      c.lineTo(cx + 36 + i * 12, cy + 9);
    });
    c.lineTo(cx + 74, cy);
    c.stroke();
    // capacitor com o nível de carga
    c.beginPath();
    c.moveTo(cx + cw - 60, cy + 46); c.lineTo(cx + cw - 28, cy + 46);
    c.moveTo(cx + cw - 60, cy + 62); c.lineTo(cx + cw - 28, cy + 62);
    c.lineWidth = 3; c.stroke();
    c.fillStyle = COR.cobalto;
    c.globalAlpha = 0.15 + 0.65 * v;
    c.fillRect(cx + cw - 60, cy + 48, 32, 12);
    c.globalAlpha = 1;
    // fonte
    c.strokeStyle = COR.ambar; c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx, cy + 39, 19, 0, 7); c.stroke();
    c.restore();
    rotulo(c, cx, cy + 39, 'V', COR.ambar, 'center');
    rotulo(c, cx + 50, cy - 18, 'R', COR.cobalto, 'center');
    rotulo(c, cx + cw - 14, cy + 54, 'C', COR.cobalto);

    // curva
    const bx = cw + 34;
    const m = eixos(c, [bx + 30, 20, W - bx - 46, H - 60],
      [0, 6], [0, 1.15],
      { gx:[[1,'τ'],[2,'2τ'],[3,'3τ'],[4,'4τ'],[5,'5τ']],
        gy:[[0,'0'],[0.632,'63%'],[1,'V']], titulo:'v_C(t)' });

    const pts = [];
    for(let k = 0; k <= 200; k++){
      const tt = 6 * k / 200;
      if(tt > T) break;
      pts.push([tt, 1 - Math.exp(-tt / tau)]);
    }
    traco(c, m, [[0, 1], [6, 1]], COR.suave, 1, [4, 4]);
    traco(c, m, [[1, 0], [1, 0.632]], COR.pena, 1.2, [3, 3]);
    traco(c, m, pts, COR.cobalto, 2.4);
    if(pts.length) bolinha(c, m, T, v, COR.pena, 5);
  }
},

/* ---- massa-mola-amortecedor nos três regimes ---- */
massamola: {
  titulo: 'Massa-mola-amortecedor',
  legenda: 'O mesmo degrau de força aplicado com três amortecimentos diferentes. O bloco à esquerda e a curva à direita são o mesmo movimento.',
  altura: 280,
  ciclo: 18,
  quadro(c, W, H, t){
    const regimes = [
      { z:0.12, nome:'ζ = 0,12 · subamortecido' },
      { z:0.5,  nome:'ζ = 0,50 · subamortecido' },
      { z:1.0,  nome:'ζ = 1,00 · crítico' }
    ];
    const passo = this.ciclo / 3;
    const idx = Math.floor((t % this.ciclo) / passo);
    const T = (t % passo) / passo * 12;
    const R = regimes[idx];
    const wn = 1.4;
    const x = deg2(T, R.z, wn);

    // bancada
    const bw = Math.min(240, W * 0.38);
    const y0 = 62, x0 = 26;
    const px = x0 + 96 + x * 46;

    c.save();
    c.strokeStyle = COR.eixo; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x0, y0 - 34); c.lineTo(x0, y0 + 52); c.stroke();
    c.beginPath(); c.moveTo(x0, y0 + 52); c.lineTo(x0 + bw, y0 + 52); c.stroke();
    for(let i = 0; i < 12; i++){
      c.beginPath();
      c.moveTo(x0 + i * 16, y0 + 52); c.lineTo(x0 + 8 + i * 16, y0 + 62);
      c.lineWidth = 1; c.stroke();
    }
    // mola
    c.strokeStyle = COR.cobalto; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(x0, y0 - 12);
    const n = 9, dxm = (px - x0) / n;
    for(let i = 0; i < n; i++){
      c.lineTo(x0 + (i + 0.5) * dxm, y0 - 12 + (i % 2 ? 11 : -11));
    }
    c.lineTo(px, y0 - 12); c.stroke();
    // amortecedor
    c.beginPath();
    c.moveTo(x0, y0 + 26); c.lineTo(x0 + 44, y0 + 26);
    c.moveTo(x0 + 44, y0 + 16); c.lineTo(x0 + 44, y0 + 36);
    c.moveTo(x0 + 44, y0 + 16); c.lineTo(x0 + 72, y0 + 16);
    c.moveTo(x0 + 44, y0 + 36); c.lineTo(x0 + 72, y0 + 36);
    c.moveTo(x0 + 66, y0 + 12); c.lineTo(x0 + 66, y0 + 40);
    c.moveTo(x0 + 66, y0 + 26); c.lineTo(px, y0 + 26);
    c.stroke();
    // bloco
    c.fillStyle = COR.papel; c.strokeStyle = COR.tinta; c.lineWidth = 1.8;
    c.fillRect(px, y0 - 30, 46, 82); c.strokeRect(px, y0 - 30, 46, 82);
    c.restore();
    rotulo(c, px + 23, y0 + 11, 'm', COR.tinta, 'center');
    seta(c, px + 46, y0 + 11, px + 78, y0 + 11, COR.pena, 2);
    rotulo(c, px + 82, y0 + 11, 'F', COR.pena);

    // curva
    const bx = bw + 66;
    const m = eixos(c, [bx, 20, W - bx - 16, H - 60],
      [0, 12], [-0.2, 2],
      { gx:[[0,'0'],[4,'4'],[8,'8'],[12,'12 s']],
        gy:[[0,'0'],[1,'1'],[2,'2']], titulo:'x(t)' });
    const pts = [];
    for(let k = 0; k <= 260; k++){
      const tt = 12 * k / 260;
      if(tt > T) break;
      pts.push([tt, deg2(tt, R.z, wn)]);
    }
    traco(c, m, [[0, 1], [12, 1]], COR.suave, 1, [4, 4]);
    traco(c, m, pts, COR.cobalto, 2.4);
    if(pts.length) bolinha(c, m, T, x, COR.pena, 5);
    rotulo(c, W - 14, H - 18, R.nome, COR.pena, 'right');
  }
},

/* ---- estados de equilíbrio ---- */
equilibrio: {
  titulo: 'Três estados de equilíbrio',
  legenda: 'A mesma perturbação aplicada nas três superfícies. Estável volta ao ponto de partida, instável se afasta cada vez mais, neutro para em um novo ponto e fica.',
  altura: 220,
  ciclo: 7,
  quadro(c, W, H, t){
    const T = t % this.ciclo;
    const emp = T > 1 ? Math.min(1, (T - 1) / 0.35) : 0;   // empurrão
    const f = Math.max(0, T - 1.35);

    const larg = (W - 40) / 3;
    const nomes = ['estável', 'instável', 'neutro'];
    const cores = [COR.verde, COR.pena, COR.ambar];

    for(let i = 0; i < 3; i++){
      const bx = 16 + i * larg, bw = larg - 20, by = 34, bh = H - 78;
      const cxm = bx + bw / 2;

      // superfície
      c.save();
      c.strokeStyle = COR.eixo; c.lineWidth = 2;
      c.beginPath();
      for(let k = 0; k <= 60; k++){
        const u = -1 + 2 * k / 60;
        const yy = i === 0 ? u * u * 0.75 : i === 1 ? -u * u * 0.75 + 0.75 : 0.38;
        const X = cxm + u * bw / 2, Y = by + bh - 26 - yy * bh * 0.5;
        k ? c.lineTo(X, Y) : c.moveTo(X, Y);
      }
      c.stroke();
      c.restore();

      // posição da bola
      let u;
      if(i === 0){
        u = 0.55 * emp * Math.exp(-1.1 * f) * Math.cos(3.4 * f);
      } else if(i === 1){
        u = Math.min(1, 0.1 * emp * Math.exp(2.1 * f));
      } else {
        u = Math.min(0.62, 0.62 * emp * (1 - Math.exp(-2.6 * f)));
      }
      const yy = i === 0 ? u * u * 0.75 : i === 1 ? -u * u * 0.75 + 0.75 : 0.38;
      const bxp = cxm + u * bw / 2, byp = by + bh - 26 - yy * bh * 0.5 - 8;

      c.save();
      c.fillStyle = cores[i];
      c.beginPath(); c.arc(bxp, byp, 8, 0, 7); c.fill();
      c.restore();

      if(emp > 0 && f < 0.5) seta(c, bxp - 30, byp, bxp - 12, byp, COR.tinta, 1.6);
      rotulo(c, cxm, by - 14, nomes[i], cores[i], 'center');
    }
    rotulo(c, W / 2, H - 16, T < 1 ? 'em repouso' : 'perturbado', COR.suave, 'center');
  }
},

/* ---- polo cruzando o eixo imaginário ---- */
cruzando: {
  titulo: 'O instante em que o sistema fica instável',
  legenda: 'Os polos deslizam para a direita. Enquanto estão no semiplano esquerdo a resposta converge. No momento em que cruzam o eixo imaginário ela passa a crescer sem limite.',
  altura: 270,
  ciclo: 12,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const z = 0.45 - 0.62 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f));  // 0,45 → -0,17
    const wn = 1.8;
    const estavel = z > 0;

    const lg = (W - 70) / 2;
    const ms = eixos(c, [46, 16, lg, H - 56],
      [-2.4, 1.4], [-2.6, 2.6],
      { gx:[[-2,'-2'],[-1,'-1'],[0,'0'],[1,'1']],
        gy:[[-2,'-2j'],[0,'0'],[2,'2j']], titulo:'plano s' });

    // sombreia o semiplano direito
    c.save();
    c.fillStyle = 'rgba(192,52,29,.07)';
    c.fillRect(ms.X(0), ms.box[1], ms.box[0] + ms.box[2] - ms.X(0), ms.box[3]);
    c.restore();
    rotulo(c, ms.X(0) + 6, ms.box[1] + 13, 'SPD', COR.pena);

    const wd = wn * Math.sqrt(Math.max(0, 1 - z * z));
    const cor = estavel ? COR.verde : COR.pena;
    cruz(c, ms, -z * wn, wd, cor, 7);
    cruz(c, ms, -z * wn, -wd, cor, 7);

    const mr = eixos(c, [70 + lg, 16, lg, H - 56],
      [0, 14], [-2.6, 2.6],
      { gx:[[0,'0'],[7,'7'],[14,'14 s']],
        gy:[[-2,'-2'],[0,'0'],[2,'2']], titulo:'resposta natural' });

    const pts = [];
    for(let k = 0; k <= 320; k++){
      const tt = 14 * k / 320;
      pts.push([tt, Math.exp(-z * wn * tt) * Math.cos(wd * tt)]);
    }
    traco(c, mr, pts, cor, 2.2);

    rotulo(c, W - 14, H - 18,
      'ζ = ' + z.toFixed(2).replace('.', ',') + ' · ' + (estavel ? 'estável' : 'instável'),
      cor, 'right');
  }
},

/* ---- varredura em frequência com o Bode ---- */
bode: {
  titulo: 'Varredura em frequência',
  legenda: 'A senoide de entrada, em cinza, tem sempre a mesma amplitude. A saída, em azul, muda de amplitude e de fase conforme a frequência. O ponto no Bode marca a frequência do momento.',
  altura: 300,
  ciclo: 16,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const w = 0.15 * Math.pow(400, f <= 0.5 ? f * 2 : (1 - f) * 2);
    const z = 0.25, wn = 2;
    const u = w / wn, re = 1 - u * u, im = 2 * z * u;
    const mag = 1 / Math.sqrt(re * re + im * im);
    const fase = -Math.atan2(im, re);

    const alt = (H - 66) / 2;

    // senoides
    const m1 = eixos(c, [46, 16, W - 62, alt],
      [0, 12], [-3.2, 3.2],
      { gy:[[-2,'-2'],[0,'0'],[2,'2']], titulo:'entrada e saída no tempo' });
    const ent = [], sai = [];
    for(let k = 0; k <= 400; k++){
      const tt = 12 * k / 400;
      ent.push([tt, Math.sin(w * (tt + t * 1.4))]);
      sai.push([tt, mag * Math.sin(w * (tt + t * 1.4) + fase)]);
    }
    traco(c, m1, ent, COR.suave, 1.6);
    traco(c, m1, sai, COR.cobalto, 2.4);

    // bode de magnitude
    const m2 = eixos(c, [46, 34 + alt, W - 62, alt],
      [Math.log10(0.15), Math.log10(60)], [-40, 20],
      { gx:[[Math.log10(0.15),'0,15'],[0,'1'],[Math.log10(10),'10'],[Math.log10(60),'60']],
        gy:[[-40,'-40'],[-20,'-20'],[0,'0 dB'],[20,'20']], titulo:'|H| [dB] contra ω [rad/s]' });
    const cur = [];
    for(let k = 0; k <= 300; k++){
      const lw = Math.log10(0.15) + (Math.log10(60) - Math.log10(0.15)) * k / 300;
      const ww = Math.pow(10, lw), uu = ww / wn;
      const rr = 1 - uu * uu, ii = 2 * z * uu;
      cur.push([lw, 20 * Math.log10(1 / Math.sqrt(rr * rr + ii * ii))]);
    }
    traco(c, m2, cur, COR.cobalto, 2.2);
    bolinha(c, m2, Math.log10(w), 20 * Math.log10(mag), COR.pena, 6);

    rotulo(c, W - 14, 30, 'ω = ' + w.toFixed(2).replace('.', ',') + ' rad/s', COR.pena, 'right');
    rotulo(c, W - 14, 44, 'ganho ' + mag.toFixed(2).replace('.', ',') + '×', COR.cobalto, 'right');
  }
},

/* ---- percurso de Nyquist ---- */
nyquist: {
  titulo: 'Percorrendo a curva de Nyquist',
  legenda: 'O ponto caminha conforme ω cresce de zero ao infinito. A linha vermelha mede a distância até o ponto crítico: quanto menor ela fica, mais perto da instabilidade.',
  altura: 300,
  ciclo: 11,
  quadro(c, W, H, t){
    const k = 24;
    const f = (t % this.ciclo) / this.ciclo;
    const w = Math.pow(10, -1.4 + 3.2 * f);

    const G = ww => {
      const dr = 6 - 6 * ww * ww, di = 11 * ww - ww * ww * ww;
      const d = dr * dr + di * di;
      return [k * dr / d, -k * di / d];
    };

    const lado = Math.min(W - 60, H - 44);
    const m = eixos(c, [(W - lado) / 2 + 10, 18, lado, H - 48],
      [-2, 4.6], [-3.3, 3.3],
      { gx:[[-1,'-1'],[0,'0'],[2,'2'],[4,'4']],
        gy:[[-2,'-2j'],[0,'0'],[2,'2j']], titulo:'G(jω), k = 24' });

    const cheia = [], andado = [];
    for(let i = 0; i <= 500; i++){
      const ww = Math.pow(10, -1.4 + 3.2 * i / 500);
      const p = G(ww);
      cheia.push(p);
      if(ww <= w) andado.push(p);
    }
    traco(c, m, cheia.map(p => [p[0], -p[1]]), COR.grade, 1.6);
    traco(c, m, cheia, COR.grade, 1.6);
    traco(c, m, andado, COR.cobalto, 2.6);

    const p = G(w);
    traco(c, m, [[-1, 0], p], COR.pena, 1.4, [4, 3]);
    bolinha(c, m, p[0], p[1], COR.cobalto, 6);
    bolinha(c, m, -1, 0, COR.pena, 6);
    rotulo(c, m.X(-1), m.Y(0) - 14, '(-1, j0)', COR.pena, 'center');

    const d = Math.hypot(p[0] + 1, p[1]);
    rotulo(c, W - 14, 30, 'ω = ' + w.toFixed(2).replace('.', ',') + ' rad/s', COR.suave, 'right');
    rotulo(c, W - 14, 44, 'distância até -1: ' + d.toFixed(2).replace('.', ','), COR.pena, 'right');
  }
},

/* ---- efeito do ganho em malha fechada ---- */
ganhomf: {
  titulo: 'O que o ganho faz na malha fechada',
  legenda: 'Planta k/(s+a) com realimentação unitária. Aumentar o ganho empurra o polo para a esquerda, acelera a resposta e reduz o erro, mas nunca chega a zerá-lo: é um sistema tipo 0.',
  altura: 270,
  ciclo: 12,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const k = Math.pow(10, -0.7 + 2.1 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f)));
    const a = 0.8, polo = a + k, yinf = k / (a + k);

    const lg = (W - 70) / 2;
    const ms = eixos(c, [46, 16, lg, H - 56],
      [-14, 1.6], [-2, 2],
      { gx:[[-12,'-12'],[-8,'-8'],[-4,'-4'],[0,'0']], gy:[[0,'0']], titulo:'polo de malha fechada' });
    traco(c, ms, [[-a, -0.35], [-a, 0.35]], COR.suave, 1.4);
    rotulo(c, ms.X(-a), ms.Y(0) - 26, 'malha aberta', COR.suave, 'center');
    cruz(c, ms, -polo, 0, COR.pena, 7);
    seta(c, ms.X(-a), ms.Y(0.75), ms.X(-polo), ms.Y(0.75), COR.pena, 1.4);

    const mr = eixos(c, [70 + lg, 16, lg, H - 56],
      [0, 6], [0, 1.25],
      { gx:[[0,'0'],[2,'2'],[4,'4'],[6,'6 s']], gy:[[0,'0'],[1,'ref']], titulo:'resposta ao degrau' });
    const pts = [];
    for(let i = 0; i <= 300; i++){
      const tt = 6 * i / 300;
      pts.push([tt, yinf * (1 - Math.exp(-polo * tt))]);
    }
    traco(c, mr, [[0, 1], [6, 1]], COR.pena, 1.3, [5, 4]);
    traco(c, mr, pts, COR.cobalto, 2.4);
    traco(c, mr, [[5.2, yinf], [5.2, 1]], COR.ambar, 1.6);
    rotulo(c, mr.X(5.2) - 6, mr.Y((yinf + 1) / 2), 'erro', COR.ambar, 'right');

    rotulo(c, W - 14, H - 30, 'k = ' + k.toFixed(1).replace('.', ','), COR.pena, 'right');
    rotulo(c, W - 14, H - 16,
      'erro = ' + (100 * (1 - yinf)).toFixed(0) + '%', COR.ambar, 'right');
  }
},

/* ---- lugar das raízes sendo percorrido ---- */
lugar: {
  titulo: 'Lugar das raízes de k / [s(s+2)(s+3)]',
  legenda: 'Os três polos partem de 0, -2 e -3. Dois deles se encontram, viram complexos e sobem em direção ao eixo imaginário. Em k = 30 eles cruzam e o sistema perde a estabilidade.',
  altura: 300,
  ciclo: 14,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const k = 45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f));

    // raízes de s³ + 5s² + 6s + k por Durand-Kerner
    const raizes = kk => {
      let z = [[0.4, 0.9], [-0.9, 0.4], [0.5, -0.9]];
      const p = ([re, im]) => {
        const r2 = re * re - im * im, i2 = 2 * re * im;
        const r3 = r2 * re - i2 * im, i3 = r2 * im + i2 * re;
        return [r3 + 5 * r2 + 6 * re + kk, i3 + 5 * i2 + 6 * im];
      };
      for(let it = 0; it < 220; it++){
        const nz = z.map((zi, i) => {
          let [dr, di] = [1, 0];
          z.forEach((zj, j) => {
            if(i === j) return;
            const ar = zi[0] - zj[0], ai = zi[1] - zj[1];
            const nr = dr * ar - di * ai, ni = dr * ai + di * ar;
            dr = nr; di = ni;
          });
          const [pr, pi] = p(zi);
          const d = dr * dr + di * di || 1e-12;
          return [zi[0] - (pr * dr + pi * di) / d, zi[1] - (pi * dr - pr * di) / d];
        });
        z = nz;
      }
      return z;
    };

    const lado = Math.min(W - 60, H - 44);
    const m = eixos(c, [(W - lado) / 2 + 10, 18, lado, H - 48],
      [-5.2, 2.4], [-4, 4],
      { gx:[[-4,'-4'],[-3,'-3'],[-2,'-2'],[-1,'-1'],[0,'0'],[2,'2']],
        gy:[[-3,'-3j'],[0,'0'],[3,'3j']], titulo:'plano s' });

    c.save();
    c.fillStyle = 'rgba(192,52,29,.06)';
    c.fillRect(m.X(0), m.box[1], m.box[0] + m.box[2] - m.X(0), m.box[3]);
    c.restore();

    // traço completo do lugar, em cinza
    const ramos = [[], [], []];
    for(let i = 0; i <= 160; i++){
      const r = raizes(45 * i / 160).sort((x, y) => x[1] - y[1]);
      r.forEach((z, j) => ramos[j].push(z));
    }
    ramos.forEach(r => traco(c, m, r, COR.grade, 1.8));

    // trecho já percorrido e polos atuais
    const idx = Math.round(k / 45 * 160);
    ramos.forEach(r => traco(c, m, r.slice(0, idx + 1), COR.cobalto, 2.4));

    const atual = raizes(k);
    const estavel = atual.every(z => z[0] < 0.001);
    atual.forEach(z => cruz(c, m, z[0], z[1], estavel ? COR.verde : COR.pena, 7));

    // pontos notáveis
    [[0, 0], [-2, 0], [-3, 0]].forEach(p => cruz(c, m, p[0], p[1], COR.suave, 5));
    bolinha(c, m, 0, Math.sqrt(6), COR.ambar, 4);
    bolinha(c, m, 0, -Math.sqrt(6), COR.ambar, 4);

    rotulo(c, W - 14, 30, 'k = ' + k.toFixed(1).replace('.', ','), COR.tinta, 'right');
    rotulo(c, W - 14, 46, estavel ? 'estável' : 'instável (k > 30)',
      estavel ? COR.verde : COR.pena, 'right');
  }
},

/* ---- P, PI e PID na mesma planta ---- */
acoespid: {
  titulo: 'O que cada ação do PID acrescenta',
  legenda: 'Só com P sobra erro em regime. O I zera esse erro, mas custa sobressinal. O D devolve o amortecimento sem trazer o erro de volta.',
  altura: 290,
  ciclo: 15,
  quadro(c, W, H, t){
    const casos = [
      { kp:8, ki:0,  kd:0, nome:'P  ·  Kp = 8' },
      { kp:8, ki:10, kd:0, nome:'PI  ·  Kp = 8, Ki = 10' },
      { kp:8, ki:10, kd:3, nome:'PID  ·  Kp = 8, Ki = 10, Kd = 3' }
    ];
    const passo = this.ciclo / 3;
    const i = Math.floor((t % this.ciclo) / passo);
    const T = (t % passo) / passo * 10;

    const sim = p => {
      const a1 = 1.2, a0 = 4, dt = 0.002, uMax = 60;
      let x1 = 0, x2 = 0, I = 0;
      const ys = [], us = [];
      for(let n = 0; n * dt <= 10; n++){
        const tt = n * dt, e = 1 - x1;
        const u = p.kp * e + p.ki * I - p.kd * x2;
        const s = Math.max(-uMax, Math.min(uMax, u));
        if(s === u) I += e * dt;
        const d1 = x2, d2 = -a0 * x1 - a1 * x2 + s;
        x1 += d1 * dt; x2 += d2 * dt;
        if(n % 4 === 0){ ys.push([tt, x1]); us.push([tt, s]); }
      }
      return { ys, us };
    };

    const alt = (H - 66) / 2;
    const my = eixos(c, [46, 16, W - 62, alt],
      [0, 10], [0, 1.7],
      { gx:[[0,'0'],[5,'5'],[10,'10 s']], gy:[[0,'0'],[1,'ref'],[1.5,'1,5']], titulo:'saída y(t)' });
    traco(c, my, [[0, 1], [10, 1]], COR.pena, 1.3, [5, 4]);

    // as anteriores ficam de fundo, em cinza
    for(let j = 0; j < i; j++){
      traco(c, my, sim(casos[j]).ys, COR.grade, 1.8);
    }
    const s = sim(casos[i]);
    traco(c, my, s.ys.filter(p => p[0] <= T), COR.cobalto, 2.4);

    const mu = eixos(c, [46, 34 + alt, W - 62, alt],
      [0, 10], [-20, 62],
      { gx:[[0,'0'],[5,'5'],[10,'10 s']], gy:[[0,'0'],[30,'30'],[60,'60']], titulo:'esforço de controle u(t)' });
    traco(c, mu, s.us.filter(p => p[0] <= T), COR.verde, 2);

    rotulo(c, W - 14, 30, casos[i].nome, COR.pena, 'right');
    const yfim = s.ys[s.ys.length - 1][1];
    rotulo(c, W - 14, 46, 'erro em regime: ' + ((1 - yfim) * 100).toFixed(0) + '%', COR.ambar, 'right');
  }
},

/* ---- compensador de avanço de fase ---- */
avanco: {
  titulo: 'Compensador de avanço de fase',
  legenda: 'O zero vem antes do polo e abre uma bolha de fase positiva entre os dois. Quanto menor o alfa, maior o avanço, e maior também o ganho em alta frequência que amplifica ruído.',
  altura: 300,
  ciclo: 13,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const alfa = 0.5 - 0.44 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f));  // 0,5 a 0,06
    const wm = 4, T = 1 / (wm * Math.sqrt(alfa));
    const zc = 1 / T, pc = 1 / (alfa * T);
    const fim = Math.asin((1 - alfa) / (1 + alfa)) * 180 / Math.PI;

    const L = Math.log10(0.2), R = Math.log10(400);
    const alt = (H - 66) / 2;

    const mag = [], fase = [];
    for(let i = 0; i <= 320; i++){
      const lw = L + (R - L) * i / 320, w = Math.pow(10, lw);
      const num = Math.hypot(w / zc, 1), den = Math.hypot(w / pc, 1);
      mag.push([lw, 20 * Math.log10(num / den)]);
      fase.push([lw, (Math.atan(w / zc) - Math.atan(w / pc)) * 180 / Math.PI]);
    }

    const mm = eixos(c, [46, 16, W - 62, alt],
      [L, R], [-2, 26],
      { gx:[[L,'0,2'],[0,'1'],[1,'10'],[2,'100']],
        gy:[[0,'0 dB'],[10,'10'],[20,'20']], titulo:'magnitude' });
    traco(c, mm, mag, COR.cobalto, 2.4);
    traco(c, mm, [[Math.log10(zc), -9], [Math.log10(zc), 99]], COR.verde, 1.2, [3, 3]);
    traco(c, mm, [[Math.log10(pc), -9], [Math.log10(pc), 99]], COR.pena, 1.2, [3, 3]);
    rotulo(c, mm.X(Math.log10(zc)) - 4, mm.box[1] + 12, 'zero', COR.verde, 'right');
    rotulo(c, mm.X(Math.log10(pc)) + 5, mm.box[1] + 12, 'polo', COR.pena);

    const mf = eixos(c, [46, 34 + alt, W - 62, alt],
      [L, R], [-4, 70],
      { gx:[[L,'0,2'],[0,'1'],[1,'10'],[2,'100']],
        gy:[[0,'0°'],[30,'30°'],[60,'60°']], titulo:'fase, ω em rad/s' });
    area(c, mf, fase, 0, 'rgba(27,69,200,.12)');
    traco(c, mf, fase, COR.cobalto, 2.4);
    bolinha(c, mf, Math.log10(wm), fim, COR.pena, 5.5);
    traco(c, mf, [[Math.log10(wm), 0], [Math.log10(wm), fim]], COR.pena, 1.2, [3, 3]);
    rotulo(c, mf.X(Math.log10(wm)) + 8, mf.Y(fim) - 2, 'ω_m', COR.pena);

    rotulo(c, W - 14, 30, 'α = ' + alfa.toFixed(2).replace('.', ','), COR.tinta, 'right');
    rotulo(c, W - 14, 46, 'avanço máximo: ' + fim.toFixed(0) + '°', COR.pena, 'right');
  }
},

/* ---- frações parciais: a resposta como soma de modos ---- */
modos: {
  titulo: 'A resposta é a soma dos modos',
  legenda: 'Para F(s) = 6/[s(s+1)(s+3)], cada polo contribui com um termo. Os três aparecem em cinza e a soma deles, em azul, é a resposta completa.',
  altura: 280,
  ciclo: 13,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const etapa = Math.min(4, Math.floor(f * 4.6));
    const partes = [
      { fn: () => 2,                     cor:COR.ambar,  nome:'2  (polo em 0)' },
      { fn: tt => -3 * Math.exp(-tt),    cor:COR.verde,  nome:'-3e^-t  (polo em -1)' },
      { fn: tt => Math.exp(-3 * tt),     cor:COR.pena,   nome:'+e^-3t  (polo em -3)' }
    ];

    const lg = (W - 70) / 2;
    const ms = eixos(c, [46, 16, lg, H - 56],
      [-4, 1], [-1.6, 1.6],
      { gx:[[-3,'-3'],[-2,'-2'],[-1,'-1'],[0,'0']], gy:[[0,'0']], titulo:'polos de F(s)' });
    [[0, COR.ambar], [-1, COR.verde], [-3, COR.pena]].forEach(function(p, i){
      cruz(c, ms, p[0], 0, etapa > i ? p[1] : COR.grade, 7);
    });

    const mr = eixos(c, [70 + lg, 16, lg, H - 56],
      [0, 6], [-3.4, 2.6],
      { gx:[[0,'0'],[2,'2'],[4,'4'],[6,'6 s']],
        gy:[[-3,'-3'],[0,'0'],[2,'2']], titulo:'contribuição no tempo' });

    for(let i = 0; i < 3; i++){
      if(etapa <= i) continue;
      const pts = [];
      for(let k = 0; k <= 220; k++){ const tt = 6 * k / 220; pts.push([tt, partes[i].fn(tt)]); }
      traco(c, mr, pts, partes[i].cor, 1.8, [5, 4]);
    }
    if(etapa >= 3){
      const soma = [];
      for(let k = 0; k <= 260; k++){
        const tt = 6 * k / 260;
        soma.push([tt, 2 - 3 * Math.exp(-tt) + Math.exp(-3 * tt)]);
      }
      traco(c, mr, soma, COR.cobalto, 2.6);
    }

    const leg = etapa === 0 ? 'y(t) = ?' :
                etapa >= 3 ? 'y(t) = 2 - 3e^-t + e^-3t' :
                partes[etapa - 1].nome;
    rotulo(c, W - 14, H - 18, leg, etapa >= 3 ? COR.cobalto : partes[Math.max(0, etapa - 1)].cor, 'right');
  }
},

/* ---- efeito do zero, inclusive fase não mínima ---- */
efeitozero: {
  titulo: 'O que o zero faz com a resposta',
  legenda: 'O zero desliza pelo eixo real. No semiplano esquerdo ele acelera a saída e pode causar salto inicial. Quando cruza para o semiplano direito, a resposta arranca na direção errada: é a fase não mínima.',
  altura: 280,
  ciclo: 14,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const q = 2 - 3.4 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f));   // 1/b, de 2 a -1,4
    const a = 1, temZero = Math.abs(q) > 0.06, b = 1 / q;

    const lg = (W - 70) / 2;
    const ms = eixos(c, [46, 16, lg, H - 56],
      [-4, 3], [-1.5, 1.5],
      { gx:[[-3,'-3'],[-2,'-2'],[-1,'-1'],[0,'0'],[2,'2']], gy:[[0,'0']], titulo:'plano s' });
    c.save();
    c.fillStyle = 'rgba(192,52,29,.06)';
    c.fillRect(ms.X(0), ms.box[1], ms.box[0] + ms.box[2] - ms.X(0), ms.box[3]);
    c.restore();
    cruz(c, ms, -a, 0, COR.tinta, 7);
    rotulo(c, ms.X(-a), ms.Y(0) + 24, 'polo', COR.tinta, 'center');
    if(temZero){
      const sz = -b;
      c.save();
      c.strokeStyle = sz > 0 ? COR.pena : COR.verde; c.lineWidth = 2.2;
      c.beginPath(); c.arc(ms.X(sz), ms.Y(0), 7, 0, 7); c.stroke();
      c.restore();
      rotulo(c, ms.X(sz), ms.Y(0) - 22, 'zero', sz > 0 ? COR.pena : COR.verde, 'center');
    }

    const mr = eixos(c, [70 + lg, 16, lg, H - 56],
      [0, 6], [-1.8, 2.4],
      { gx:[[0,'0'],[2,'2'],[4,'4'],[6,'6 s']],
        gy:[[-1,'-1'],[0,'0'],[1,'1'],[2,'2']], titulo:'resposta ao degrau' });
    const pts = [];
    for(let k = 0; k <= 260; k++){
      const tt = 6 * k / 260;
      pts.push([tt, 1 + (a * q - 1) * Math.exp(-a * tt)]);
    }
    traco(c, mr, [[0, 1], [6, 1]], COR.suave, 1, [4, 4]);
    traco(c, mr, pts, COR.cobalto, 2.4);
    bolinha(c, mr, 0, a * q, COR.pena, 5);

    const nome = !temZero ? 'sem zero' : (b > 0 ? 'zero no SPE' : 'zero no SPD, fase não mínima');
    rotulo(c, W - 14, H - 30, 'y(0) = ' + (a * q).toFixed(2).replace('.', ','), COR.pena, 'right');
    rotulo(c, W - 14, H - 16, nome, b < 0 && temZero ? COR.pena : COR.suave, 'right');
  }
},

/* ---- margens de ganho e de fase no Bode ---- */
margens: {
  titulo: 'Margens de ganho e de fase',
  legenda: 'Malha aberta k/[s(s+2)(s+3)], a mesma da aula de lugar das raízes. A margem de fase é medida onde o ganho cruza 0 dB. A margem de ganho, onde a fase cruza -180°. Em k = 30 as duas zeram ao mesmo tempo.',
  altura: 310,
  ciclo: 14,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const k = Math.pow(10, 0.2 + 1.5 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f)));  // 1,6 a 50

    const mod = w => k / (w * Math.hypot(w, 2) * Math.hypot(w, 3));
    const arg = w => -90 - Math.atan(w / 2) * 180 / Math.PI - Math.atan(w / 3) * 180 / Math.PI;

    // frequência de cruzamento de ganho, por bisseção
    let lo = 0.02, hi = 40;
    for(let i = 0; i < 60; i++){
      const mid = Math.sqrt(lo * hi);
      if(mod(mid) > 1) lo = mid; else hi = mid;
    }
    const wgc = Math.sqrt(lo * hi);
    const wpc = Math.sqrt(6);
    const mf = arg(wgc) + 180;
    const mg = 20 * Math.log10(30 / k);

    const L = Math.log10(0.05), R = Math.log10(40);
    const alt = (H - 66) / 2;

    const cm = [], cf = [];
    for(let i = 0; i <= 340; i++){
      const lw = L + (R - L) * i / 340, w = Math.pow(10, lw);
      cm.push([lw, 20 * Math.log10(mod(w))]);
      cf.push([lw, arg(w)]);
    }

    const mm = eixos(c, [50, 16, W - 66, alt],
      [L, R], [-70, 50],
      { gx:[[L,'0,05'],[-1,'0,1'],[0,'1'],[1,'10']],
        gy:[[-60,'-60'],[-20,'-20'],[0,'0 dB'],[40,'40']], titulo:'magnitude' });
    traco(c, mm, cm, COR.cobalto, 2.4);
    traco(c, mm, [[Math.log10(wpc), -99], [Math.log10(wpc), 99]], COR.grade, 1.4);
    traco(c, mm, [[Math.log10(wpc), 0], [Math.log10(wpc), -mg]], COR.ambar, 2.6);
    bolinha(c, mm, Math.log10(wgc), 0, COR.pena, 5);
    rotulo(c, mm.X(Math.log10(wpc)) + 7, mm.Y(-mg / 2), 'MG', COR.ambar);

    const mp = eixos(c, [50, 34 + alt, W - 66, alt],
      [L, R], [-280, -80],
      { gx:[[L,'0,05'],[-1,'0,1'],[0,'1'],[1,'10']],
        gy:[[-270,'-270'],[-180,'-180°'],[-90,'-90°']], titulo:'fase, ω em rad/s' });
    traco(c, mp, [[L, -180], [R, -180]], COR.grade, 1.4);
    traco(c, mp, cf, COR.cobalto, 2.4);
    traco(c, mp, [[Math.log10(wgc), -180], [Math.log10(wgc), -180 + mf]], COR.pena, 2.6);
    bolinha(c, mp, Math.log10(wgc), arg(wgc), COR.pena, 5);
    rotulo(c, mp.X(Math.log10(wgc)) + 7, mp.Y(-180 + mf / 2), 'MF', COR.pena);

    rotulo(c, W - 14, 30, 'k = ' + k.toFixed(1).replace('.', ','), COR.tinta, 'right');
    rotulo(c, W - 14, 46,
      'MF ' + mf.toFixed(0) + '°  ·  MG ' + mg.toFixed(1).replace('.', ',') + ' dB',
      mf > 0 ? COR.verde : COR.pena, 'right');
  }
},

/* ---- a curva de Nyquist inflando com o ganho ---- */
balao: {
  titulo: 'O ganho infla a curva de Nyquist',
  legenda: 'O traçado tem sempre a mesma forma: o ganho só o dilata. Enquanto o ponto crítico ficar de fora, a malha fechada é estável. Em k = 60 a curva passa exatamente por ele.',
  altura: 300,
  ciclo: 12,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const k = 6 + 84 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f));

    const curva = kk => {
      const out = [];
      for(let i = 0; i <= 400; i++){
        const w = Math.pow(10, -1.4 + 3.2 * i / 400);
        const dr = 6 - 6 * w * w, di = 11 * w - w * w * w;
        const d = dr * dr + di * di;
        out.push([kk * dr / d, -kk * di / d]);
      }
      return out;
    };

    const lado = Math.min(W - 60, H - 44);
    const m = eixos(c, [(W - lado) / 2 + 10, 18, lado, H - 48],
      [-4, 8], [-6, 6],
      { gx:[[-2,'-2'],[0,'0'],[4,'4'],[8,'8']],
        gy:[[-4,'-4j'],[0,'0'],[4,'4j']], titulo:'G(jω) em malha aberta' });

    [15, 30, 60].forEach(kk => {
      const cu = curva(kk);
      traco(c, m, cu, COR.grade, 1.2);
      traco(c, m, cu.map(p => [p[0], -p[1]]), COR.grade, 1.2);
    });

    const cu = curva(k);
    const dentro = k > 60;
    traco(c, m, cu.map(p => [p[0], -p[1]]), dentro ? COR.pena : COR.cobalto, 1.6, [5, 4]);
    traco(c, m, cu, dentro ? COR.pena : COR.cobalto, 2.6);

    bolinha(c, m, -1, 0, COR.tinta, 6);
    rotulo(c, m.X(-1), m.Y(0) - 16, '-1', COR.tinta, 'center');

    rotulo(c, W - 14, 30, 'k = ' + k.toFixed(0), COR.tinta, 'right');
    rotulo(c, W - 14, 46, dentro ? 'encircla -1, instável' : 'não encircla, estável',
      dentro ? COR.pena : COR.verde, 'right');
  }
},

/* ---- retrato de fase para diferentes matrizes A ---- */
retrato: {
  titulo: 'Retrato de fase e os autovalores de A',
  legenda: 'Várias condições iniciais soltas no mesmo sistema. A forma do escoamento é a assinatura dos autovalores da matriz A: reais negativos dão nó, complexos dão foco, sinais opostos dão sela, imaginários puros dão centro.',
  altura: 290,
  ciclo: 20,
  quadro(c, W, H, t){
    const casos = [
      { A:[[-1, 0], [0, -3]],  nome:'nó estável  ·  λ = -1, -3',      cor:COR.verde },
      { A:[[0, 1], [-4, -1]],  nome:'foco estável  ·  λ = -0,5 ± 1,94j', cor:COR.cobalto },
      { A:[[1, 0], [0, -2]],   nome:'sela  ·  λ = +1, -2',            cor:COR.pena },
      { A:[[0, 1], [-4, 0]],   nome:'centro  ·  λ = ± 2j',            cor:COR.ambar }
    ];
    const passo = this.ciclo / 4;
    const i = Math.floor((t % this.ciclo) / passo);
    const T = (t % passo) / passo * 3.2;
    const R = casos[i], A = R.A;

    const lado = Math.min(W - 60, H - 44);
    const m = eixos(c, [(W - lado) / 2 + 10, 18, lado, H - 48],
      [-2.2, 2.2], [-2.2, 2.2],
      { gx:[[-2,'-2'],[-1,'-1'],[0,'0'],[1,'1'],[2,'2']],
        gy:[[-2,'-2'],[0,'0'],[2,'2']], titulo:'x₂ contra x₁' });

    // campo de direções
    c.save();
    for(let a = -2; a <= 2.01; a += 0.5){
      for(let b = -2; b <= 2.01; b += 0.5){
        const dx = A[0][0] * a + A[0][1] * b, dy = A[1][0] * a + A[1][1] * b;
        const n = Math.hypot(dx, dy) || 1, e = 0.17;
        seta(c, m.X(a), m.Y(b), m.X(a + dx / n * e), m.Y(b + dy / n * e), COR.grade, 1.1);
      }
    }
    c.restore();

    // trajetórias
    const inic = [];
    for(let a = 0; a < 12; a++){
      const th = 2 * Math.PI * a / 12;
      inic.push([1.9 * Math.cos(th), 1.9 * Math.sin(th)]);
    }
    inic.forEach(p0 => {
      let x = p0[0], y = p0[1];
      const dt = 0.004, tr = [[x, y]];
      for(let n = 0; n * dt <= T; n++){
        const dx = A[0][0] * x + A[0][1] * y, dy = A[1][0] * x + A[1][1] * y;
        x += dx * dt; y += dy * dt;
        if(Math.abs(x) > 8 || Math.abs(y) > 8) break;
        if(n % 4 === 0) tr.push([x, y]);
      }
      traco(c, m, tr, R.cor, 1.7);
      bolinha(c, m, tr[tr.length - 1][0], tr[tr.length - 1][1], R.cor, 3.4);
    });
    bolinha(c, m, 0, 0, COR.tinta, 4);

    rotulo(c, W - 14, H - 16, R.nome, R.cor, 'right');
  }
},

/* ---- saturação do integrador ---- */
windup: {
  titulo: 'Windup do integrador',
  legenda: 'O atuador satura em ±3. Sem proteção, a integral continua acumulando um esforço que a válvula não entrega, e a saída dispara. Com a parada condicional, a integral congela enquanto satura e a resposta se comporta.',
  altura: 300,
  ciclo: 14,
  quadro(c, W, H, t){
    const T = (t % this.ciclo) / this.ciclo * 30;
    const uMax = 3;

    const sim = protege => {
      const a1 = 1.2, a0 = 4, dt = 0.004;
      let x1 = 0, x2 = 0, I = 0;
      const ys = [], us = [], Is = [];
      for(let n = 0; n * dt <= 30; n++){
        const tt = n * dt;
        const r = tt < 16 ? 1.6 : 0.4;
        const e = r - x1;
        const u = 6 * e + 4 * I;
        const s = Math.max(-uMax, Math.min(uMax, u));
        if(!protege || s === u) I += e * dt;
        const d1 = x2, d2 = -a0 * x1 - a1 * x2 + s;
        x1 += d1 * dt; x2 += d2 * dt;
        if(n % 6 === 0){ ys.push([tt, x1]); us.push([tt, u]); Is.push([tt, s]); }
      }
      return { ys, us, sat: Is };
    };

    const sem = sim(false), com = sim(true);
    const alt = (H - 66) / 2;

    const my = eixos(c, [46, 16, W - 62, alt],
      [0, 30], [0, 2.6],
      { gx:[[0,'0'],[10,'10'],[20,'20'],[30,'30 s']],
        gy:[[0,'0'],[1.6,'1,6'],[2.4,'2,4']], titulo:'saída y(t)' });
    const ref = [];
    for(let x = 0; x <= 30; x += 0.1) ref.push([x, x < 16 ? 1.6 : 0.4]);
    traco(c, my, ref, COR.suave, 1.3, [5, 4]);
    traco(c, my, sem.ys.filter(p => p[0] <= T), COR.pena, 2.4);
    traco(c, my, com.ys.filter(p => p[0] <= T), COR.cobalto, 2.4);

    const mu = eixos(c, [46, 34 + alt, W - 62, alt],
      [0, 30], [-8, 14],
      { gx:[[0,'0'],[10,'10'],[20,'20'],[30,'30 s']],
        gy:[[-6,'-6'],[0,'0'],[3,'3'],[12,'12']], titulo:'esforço calculado u(t)' });
    c.save();
    c.fillStyle = 'rgba(90,107,112,.10)';
    c.fillRect(mu.box[0], mu.Y(uMax), mu.box[2], mu.Y(-uMax) - mu.Y(uMax));
    c.restore();
    rotulo(c, mu.box[0] + 8, mu.Y(0), 'faixa do atuador', COR.suave);
    traco(c, mu, sem.us.filter(p => p[0] <= T), COR.pena, 2.2);
    traco(c, mu, com.us.filter(p => p[0] <= T), COR.cobalto, 2.2);

    rotulo(c, W - 14, 30, 'sem anti-windup', COR.pena, 'right');
    rotulo(c, W - 14, 46, 'com parada condicional', COR.cobalto, 'right');
  }
},

/* ---- compensador de atraso ---- */
atraso: {
  titulo: 'Compensador de atraso de fase',
  legenda: 'Aqui o polo vem antes do zero. O ganho em baixa frequência sobe por um fator beta, o que derruba o erro em regime pelo mesmo fator, enquanto a fase quase não se mexe na região que importa para a estabilidade.',
  altura: 300,
  ciclo: 13,
  quadro(c, W, H, t){
    const f = (t % this.ciclo) / this.ciclo;
    const beta = 1.5 + 18.5 * (0.5 - 0.5 * Math.cos(2 * Math.PI * f));
    const wgc = 4, zc = wgc / 10, pc = zc / beta;

    const L = Math.log10(0.005), R = Math.log10(200);
    const alt = (H - 66) / 2;

    const mag = [], fase = [];
    for(let i = 0; i <= 340; i++){
      const lw = L + (R - L) * i / 340, w = Math.pow(10, lw);
      const num = Math.hypot(w / zc, 1), den = Math.hypot(w / pc, 1);
      mag.push([lw, 20 * Math.log10(beta * num / den)]);
      fase.push([lw, (Math.atan(w / zc) - Math.atan(w / pc)) * 180 / Math.PI]);
    }

    const mm = eixos(c, [50, 16, W - 66, alt],
      [L, R], [-2, 28],
      { gx:[[-2,'0,01'],[-1,'0,1'],[0,'1'],[1,'10'],[2,'100']],
        gy:[[0,'0 dB'],[13,'13'],[26,'26']], titulo:'magnitude' });
    traco(c, mm, mag, COR.cobalto, 2.4);
    traco(c, mm, [[Math.log10(wgc), -9], [Math.log10(wgc), 99]], COR.ambar, 1.6, [4, 4]);
    rotulo(c, mm.X(Math.log10(wgc)) + 6, mm.box[1] + 12, 'ω_gc', COR.ambar);
    rotulo(c, mm.X(L) + 8, mm.Y(20 * Math.log10(beta)) - 12,
      'ganho DC × ' + beta.toFixed(1).replace('.', ','), COR.cobalto);

    const mf2 = eixos(c, [50, 34 + alt, W - 66, alt],
      [L, R], [-62, 6],
      { gx:[[-2,'0,01'],[-1,'0,1'],[0,'1'],[1,'10'],[2,'100']],
        gy:[[-60,'-60°'],[-30,'-30°'],[0,'0°']], titulo:'fase, ω em rad/s' });
    area(c, mf2, fase, 0, 'rgba(192,52,29,.10)');
    traco(c, mf2, fase, COR.cobalto, 2.4);
    traco(c, mf2, [[Math.log10(wgc), -99], [Math.log10(wgc), 99]], COR.ambar, 1.6, [4, 4]);

    const fgc = (Math.atan(wgc / zc) - Math.atan(wgc / pc)) * 180 / Math.PI;
    bolinha(c, mf2, Math.log10(wgc), fgc, COR.pena, 5);

    rotulo(c, W - 14, 30, 'β = ' + beta.toFixed(1).replace('.', ','), COR.tinta, 'right');
    rotulo(c, W - 14, 46,
      'perda de fase em ω_gc: ' + Math.abs(fgc).toFixed(1).replace('.', ',') + '°',
      Math.abs(fgc) < 8 ? COR.verde : COR.pena, 'right');
  }
},

/* ---- trajetória no plano de fase ---- */
fase: {
  titulo: 'Trajetória no plano de estados',
  legenda: 'À esquerda, o estado do sistema visto como um ponto que se move no plano x₁ contra x₂. À direita, as mesmas duas variáveis ao longo do tempo. A espiral para o centro é a assinatura de um sistema estável.',
  altura: 280,
  ciclo: 13,
  quadro(c, W, H, t){
    const z = 0.16, wn = 1.5;
    const T = (t % this.ciclo) / this.ciclo * 22;
    const wd = wn * Math.sqrt(1 - z * z);
    const x1 = tt => Math.exp(-z * wn * tt) * Math.cos(wd * tt);
    const x2 = tt => Math.exp(-z * wn * tt) *
      (-z * wn * Math.cos(wd * tt) - wd * Math.sin(wd * tt));

    const lg = (W - 70) / 2;
    const mf = eixos(c, [46, 16, lg, H - 56],
      [-1.25, 1.25], [-1.9, 1.9],
      { gx:[[-1,'-1'],[0,'0'],[1,'1']], gy:[[-1,'-1'],[0,'0'],[1,'1']], titulo:'x₂ contra x₁' });

    const tr = [];
    for(let k = 0; k <= 700; k++){
      const tt = 22 * k / 700;
      if(tt > T) break;
      tr.push([x1(tt), x2(tt)]);
    }
    traco(c, mf, tr, COR.cobalto, 2);
    if(tr.length){
      const u = tr[tr.length - 1];
      seta(c, mf.X(0), mf.Y(0), mf.X(u[0]), mf.Y(u[1]), COR.pena, 1.6);
      bolinha(c, mf, u[0], u[1], COR.pena, 5.5);
    }

    const mt = eixos(c, [70 + lg, 16, lg, H - 56],
      [0, 22], [-1.9, 1.9],
      { gx:[[0,'0'],[11,'11'],[22,'22 s']], gy:[[-1,'-1'],[0,'0'],[1,'1']], titulo:'x₁(t) e x₂(t)' });
    const a = [], b = [];
    for(let k = 0; k <= 500; k++){
      const tt = 22 * k / 500;
      if(tt > T) break;
      a.push([tt, x1(tt)]); b.push([tt, x2(tt)]);
    }
    traco(c, mt, b, COR.suave, 1.6);
    traco(c, mt, a, COR.cobalto, 2.2);
    rotulo(c, W - 14, H - 30, 'x₁ posição', COR.cobalto, 'right');
    rotulo(c, W - 14, H - 16, 'x₂ velocidade', COR.suave, 'right');
  }
}

};

/* ============================================================
   onde cada animação entra
   ============================================================ */

const MAPA = {
  '01_sinais_e_sistemas': [
    { anim:'singulares', apos:'Funções Singulares' },
    { anim:'malha',      apos:'Sistemas de Controle' }
  ],
  '02_laplace': [
    { anim:'convolucao', apos:'Convolução' },
    { anim:'polos',      apos:'Função de Transferência' },
    { anim:'modos',      apos:'Expansão em Frações Parciais' }
  ],
  '03_dinamica_ordem1': [
    { anim:'rc',         apos:'Resposta ao Degrau' },
    { anim:'efeitozero', apos:'Sistemas com Zero' }
  ],
  '04_dinamica_ordem2': [
    { anim:'massamola', apos:'Tipos de Resposta' },
    { anim:'polos',     apos:'Diagrama de Polos' }
  ],
  '05_realimentacao': [
    { anim:'ganhomf', apos:'Plantas de 1' },
    { anim:'malha',   apos:'Efeito da Realimentação Sobre Perturbações' }
  ],
  '06_estabilidade': [
    { anim:'equilibrio', apos:'Estados de Equilíbrio' },
    { anim:'cruzando',   apos:'Critério de Estabilidade' }
  ],
  '07_frequencia_bode': [
    { anim:'bode',    apos:'Diagrama de Bode' },
    { anim:'margens', apos:'Margem de Ganho e Margem de Fase' }
  ],
  '08_nyquist': [
    { anim:'nyquist', apos:'Interpretação Gráfica' },
    { anim:'balao',   apos:'Exemplos' }
  ],
  '09_espaco_de_estados': [
    { anim:'retrato', apos:'Equações de Estado' },
    { anim:'fase',    apos:'Solução no Domínio do Tempo' }
  ],
  '10_lugar_das_raizes': [
    { anim:'lugar', apos:'Exemplo Completo' },
    { anim:'polos', apos:'Projeto de Ganho' }
  ],
  '11_pid_e_sintonia': [
    { anim:'acoespid', apos:'Efeito de Cada Ação' },
    { anim:'windup',   apos:'Os Dois Problemas Práticos' }
  ],
  '12_compensadores': [
    { anim:'avanco', apos:'Compensador de Avanço de Fase' },
    { anim:'atraso', apos:'Compensador de Atraso de Fase' }
  ],
  'teoria_sistemas_eletricos': [
    { anim:'rc',        apos:'Circuito RC' },
    { anim:'polos',     apos:'Circuito RLC' }
  ],
  'teoria_sistemas_mecanicos': [
    { anim:'massamola', apos:'Equação de Movimento' },
    { anim:'fase',      apos:'Indicadores de Desempenho' }
  ]
};

/* ============================================================
   montagem e laço de animação
   ============================================================ */

const vivos = [];

function criar(def){
  const a = ANIM[def.anim];
  if(!a) return null;

  const fig = document.createElement('figure');
  fig.className = 'anim';
  fig.innerHTML =
    '<div class="anim-topo">' +
      '<span class="anim-tit">' + a.titulo + '</span>' +
      '<span class="anim-bts">' +
        '<button type="button" class="anim-bt" data-ac="pp" aria-label="Pausar">pausar</button>' +
        '<button type="button" class="anim-bt" data-ac="re" aria-label="Reiniciar">reiniciar</button>' +
      '</span>' +
    '</div>' +
    '<div class="anim-tela" style="height:' + a.altura + 'px"><canvas></canvas></div>' +
    '<figcaption>' + a.legenda + '</figcaption>';

  const cv = fig.querySelector('canvas');
  const est = { a, cv, ctx: cv.getContext('2d'), t0: performance.now(), rodando: true, visivel: false, w:0, h:0 };

  fig.querySelector('[data-ac=pp]').addEventListener('click', e => {
    est.rodando = !est.rodando;
    if(est.rodando) est.t0 = performance.now() - est.pausa;
    e.target.textContent = est.rodando ? 'pausar' : 'seguir';
    if(!est.rodando) est.pausa = performance.now() - est.t0;
  });
  fig.querySelector('[data-ac=re]').addEventListener('click', () => {
    est.t0 = performance.now(); est.pausa = 0;
  });

  if('IntersectionObserver' in window){
    new IntersectionObserver(en => { est.visivel = en[0].isIntersecting; }, { threshold:0.05 })
      .observe(fig);
  } else est.visivel = true;

  vivos.push(est);
  return fig;
}

function medir(e){
  const r = e.cv.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(300, Math.round(r.width)), h = Math.round(r.height);
  if(w !== e.w || h !== e.h){
    e.w = w; e.h = h;
    e.cv.width = w * dpr; e.cv.height = h * dpr;
    e.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

const reduzido = window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function laco(agora){
  vivos.forEach(e => {
    if(!e.visivel) return;
    if(!e.rodando && e.desenhou) return;
    medir(e);
    const t = reduzido ? e.a.ciclo * 0.34
            : (e.rodando ? (agora - e.t0) : e.pausa) / 1000;
    e.ctx.clearRect(0, 0, e.w, e.h);
    try { e.a.quadro.call(e.a, e.ctx, e.w, e.h, t); } catch(err){ /* segue o baile */ }
    e.desenhou = true;
  });
  requestAnimationFrame(laco);
}
requestAnimationFrame(laco);

/* ---------------- inserção nas aulas ---------------- */

function semAcento(s){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

window.inserirAnimacoes = function(raiz, arquivo){
  const defs = MAPA[arquivo];
  if(!defs) return;
  const h2s = Array.from(raiz.querySelectorAll('h2'));

  defs.forEach(def => {
    const alvo = h2s.find(h => semAcento(h.textContent).includes(semAcento(def.apos)));
    const fig = criar(def);
    if(!fig) return;

    if(alvo){
      // entra depois do parágrafo que abre a seção, se houver
      let ref = alvo.nextElementSibling;
      if(ref && ref.tagName === 'P') ref = ref.nextElementSibling;
      ref ? alvo.parentNode.insertBefore(fig, ref) : alvo.parentNode.appendChild(fig);
    } else if(h2s[0]){
      h2s[0].parentNode.insertBefore(fig, h2s[0]);
    } else {
      raiz.appendChild(fig);
    }
  });
};

})();
