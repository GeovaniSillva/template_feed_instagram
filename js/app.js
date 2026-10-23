(function () {
  'use strict';

  var W = 1080, H = 1920;
  var SAFE_TOP = (H - 1350) / 2, SAFE_BOTTOM = SAFE_TOP + 1350; // recorte 4:5 do feed
  var ASSETS = window.ACRYLIC_ASSETS || {};
  var LOGO = ASSETS.logo || 'assets/logo-branco.png';
  var FOTO_PADRAO = ASSETS.photo || 'assets/foto-padrao.jpg';
  var LAYOUTS = window.LAYOUTS;
  var ORDEM_LAYOUTS = ['rodape', 'topo', 'meio'];
  var S = window.Armazenamento;

  var PADRAO = {
    badge: 'Troféus em acrílico',
    kicker: 'Poker além',
    title: 'Do som',
    process: 'Corte, UV e polimento',
    cta: 'Chama no direct'
  };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var frame = $('#frame'), art = $('#art'), fotoEl = $('#photo'), block = $('#block');
  var foot = art.querySelector('.art-foot');
  var inputs = $$('[data-input]');
  var campos = {};
  $$('#art [data-field]').forEach(function (el) { campos[el.dataset.field] = el; });

  var textos = Object.assign({}, PADRAO, S.get('textos') || {});
  var enq = Object.assign({ zoom: 1, ox: 0, oy: 0 }, S.get('enquadramento') || {});
  var layoutKey = LAYOUTS[S.get('layout')] ? S.get('layout') : window.LAYOUT_PADRAO;
  var autoContraste = S.get('contrasteAuto') !== false;
  var foto = { src: null, img: null, amostra: null };
  var plano = null;

  /* ---------- Aviso estilizado ---------- */
  var avisoEl = $('#aviso'), avisoVoltar = null;
  function avisar(msg) {
    avisoVoltar = document.activeElement;
    $('#avisoMsg').textContent = msg;
    avisoEl.hidden = false;
    $('#avisoOk').focus();
  }
  function fecharAviso() {
    avisoEl.hidden = true;
    if (avisoVoltar && avisoVoltar.focus) avisoVoltar.focus();
  }
  $('#avisoOk').addEventListener('click', fecharAviso);
  avisoEl.addEventListener('click', function (e) { if (e.target === avisoEl) fecharAviso(); });

  /* ---------- Utilidades ---------- */
  function escala() { return (frame.clientWidth || W) / W; }

  // Retângulo de um elemento da arte em coordenadas 1080×1920
  function rectArte(el) {
    var a = art.getBoundingClientRect(), r = el.getBoundingClientRect(), k = escala();
    return { top: (r.top - a.top) / k, bottom: (r.bottom - a.top) / k, left: (r.left - a.left) / k, right: (r.right - a.left) / k };
  }

  function rgba(a) { return 'rgba(10,10,12,' + (+a.toFixed(3)) + ')'; }

  function gradienteCSS(dir, stops, emPx) {
    return 'linear-gradient(' + (dir === 'h' ? 'to right' : 'to bottom') + ',' +
      stops.map(function (s) { return rgba(s[1]) + ' ' + (emPx ? s[0] + 'px' : (s[0] * 100) + '%'); }).join(',') + ')';
  }

  function alphaEm(stops, t) {
    if (t <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i];
        return a[1] + (b[1] - a[1]) * ((t - a[0]) / ((b[0] - a[0]) || 1));
      }
    }
    return stops[stops.length - 1][1];
  }

  /* ---------- Escala da pré-visualização ---------- */
  function ajustarEscala() {
    var w = frame.clientWidth || frame.getBoundingClientRect().width;
    if (!w) { requestAnimationFrame(ajustarEscala); return; }
    art.style.transform = 'scale(' + (w / W) + ')';
    agendarCamadas();
  }
  window.addEventListener('resize', ajustarEscala);
  if (window.ResizeObserver) new ResizeObserver(ajustarEscala).observe(frame);

  /* ---------- Camadas: sombra, faixa, linhas, contraste ---------- */
  var camadasPendente = false;
  function agendarCamadas() {
    if (camadasPendente) return;
    camadasPendente = true;
    requestAnimationFrame(function () { camadasPendente = false; atualizarCamadas(); });
  }

  function atualizarCamadas() {
    var L = LAYOUTS[layoutKey];
    art.dataset.layout = layoutKey;

    $('#shade').style.background = L.sombras.map(function (s) { return gradienteCSS(s.dir, s.stops); }).join(',');

    var band = $('#band');
    band.hidden = !L.faixa;
    if (L.faixa === 'baixo') {
      band.style.top = 'auto';
      band.style.bottom = '0px';
      band.style.transformOrigin = 'bottom center';
      band.style.background = 'linear-gradient(to bottom, rgba(10,10,12,0), rgba(10,10,12,.5) 30%, rgba(10,10,12,.82) 70%, rgba(10,10,12,.9))';
    } else if (L.faixa === 'cima') {
      band.style.top = '0px';
      band.style.bottom = 'auto';
      band.style.transformOrigin = 'top center';
      band.style.background = 'linear-gradient(to bottom, rgba(10,10,12,.9), rgba(10,10,12,.82) 30%, rgba(10,10,12,.5) 70%, rgba(10,10,12,0))';
    }

    var b = rectArte(block);
    var linhaY = (L.linha.ref === 'topo' ? b.top : b.bottom) + L.linha.dy;
    $('#line1').style.top = (linhaY - 1) + 'px';
    $('#line2').style.top = (linhaY + 29) + 'px';

    var reforco = calcularReforco(L, b);
    var boost = $('#boost');
    boost.style.background = reforco ? gradienteCSS(reforco.dir, reforco.stops, true) : 'none';

    plano = { sombras: L.sombras, faixa: L.faixa, linhaY: linhaY, reforco: reforco };
    verificarAreaSegura(b);
  }

  /* ---------- Contraste automático ---------- */
  function prepararAmostra() {
    foto.amostra = null;
    if (!foto.img) return;
    try {
      var k = 0.1, cw = W * k, ch = H * k;
      var cv = document.createElement('canvas');
      cv.width = cw;
      cv.height = ch;
      var c = cv.getContext('2d');
      var g = geometria();
      c.drawImage(foto.img, g.x * k, g.y * k, g.dw * k, g.dh * k);
      foto.amostra = { k: k, w: cw, h: ch, data: c.getImageData(0, 0, cw, ch).data };
    } catch (e) {
      foto.amostra = null; // imagem bloqueada pelo navegador: sem análise
    }
  }

  function calcularReforco(L, b) {
    var status = $('#contrastStatus');
    if (!autoContraste) { status.textContent = 'Desligado.'; return null; }
    var a = foto.amostra;
    if (!a) { status.textContent = 'Aguardando a foto…'; return null; }

    var k = a.k, m = 30;
    var x0 = Math.max(0, Math.floor((b.left - m) * k)), x1 = Math.min(a.w, Math.ceil((b.right + m) * k));
    var y0 = Math.max(0, Math.floor((b.top - m) * k)), y1 = Math.min(a.h, Math.ceil((b.bottom + m) * k));
    var vals = [];
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) {
        var i = (y * a.w + x) * 4;
        var lum = (0.2126 * a.data[i] + 0.7152 * a.data[i + 1] + 0.0722 * a.data[i + 2]) / 255;
        var passa = 1;
        for (var s = 0; s < L.sombras.length; s++) {
          var sm = L.sombras[s];
          passa *= 1 - alphaEm(sm.stops, sm.dir === 'h' ? (x / k) / W : (y / k) / H);
        }
        vals.push(lum * passa);
      }
    }
    if (!vals.length) { status.textContent = ''; return null; }
    vals.sort(function (p, q) { return p - q; });
    var media = vals.reduce(function (s, v) { return s + v; }, 0) / vals.length;
    var p90 = vals[Math.floor(vals.length * 0.9)];
    var nivel = 0.5 * media + 0.5 * p90;
    var alvo = 0.26;

    if (nivel <= alvo) {
      status.textContent = 'Contraste bom — nenhum reforço necessário.';
      return null;
    }
    var alpha = Math.min(0.65, 1 - alvo / nivel);
    alpha = Math.round(alpha * 20) / 20;
    if (alpha < 0.05) { status.textContent = 'Contraste bom — nenhum reforço necessário.'; return null; }
    status.textContent = 'Foto clara atrás do texto — reforço de ' + Math.round(alpha * 100) + '% aplicado.';

    if (L.sombras[0].dir === 'h') {
      var r = Math.round(b.right);
      return { dir: 'h', stops: [[0, alpha], [r + 40, alpha], [r + 260, 0]] };
    }
    if (L.bloco === 'cima') {
      var bb = Math.round(b.bottom);
      return { dir: 'v', stops: [[0, alpha], [bb + 40, alpha], [bb + 240, 0]] };
    }
    var tt = Math.max(220, Math.round(b.top));
    return { dir: 'v', stops: [[tt - 220, 0], [tt - 40, alpha], [H, alpha]] };
  }

  $('#autoContrast').checked = autoContraste;
  $('#autoContrast').addEventListener('change', function () {
    autoContraste = this.checked;
    S.set('contrasteAuto', autoContraste);
    agendarCamadas();
  });

  /* ---------- Textos ---------- */
  function aplicarTextos() {
    Object.keys(campos).forEach(function (k) {
      var el = campos[k];
      var v = (textos[k] || '').replace(/\r/g, '');
      el.textContent = v;
      var alvo = el.closest('[data-wrap]') || el;
      alvo.dataset.empty = v.trim() ? 'false' : 'true';
    });
    agendarCamadas();
  }

  function verificarAreaSegura(b) {
    var f = rectArte(foot);
    var fora = b.top < SAFE_TOP - 1 || f.bottom > SAFE_BOTTOM + 1 || b.bottom > f.top - 8;
    $('#warn').hidden = !fora;
  }

  inputs.forEach(function (inp) {
    var k = inp.dataset.input;
    inp.value = textos[k] || '';
    inp.addEventListener('input', function () {
      textos[k] = inp.value;
      aplicarTextos();
      S.set('textos', textos);
    });
  });

  $('#bText').addEventListener('click', function () {
    var f = $('#f-kicker');
    f.focus();
    f.select();
  });

  $('#bReset').addEventListener('click', function () {
    textos = Object.assign({}, PADRAO);
    inputs.forEach(function (inp) { inp.value = textos[inp.dataset.input]; });
    S.del('textos');
    aplicarTextos();
  });

  /* ---------- Layout ---------- */
  var dd = $('#layoutDD');

  function definirLayout(key) {
    if (!LAYOUTS[key]) return;
    layoutKey = key;
    S.set('layout', key);
    $('#layoutNome').textContent = LAYOUTS[key].nome;
    $$('.dd-item').forEach(function (it) { it.setAttribute('aria-checked', it.dataset.layout === key ? 'true' : 'false'); });
    art.dataset.layout = key;
    agendarCamadas();
  }

  function fecharDropdown() {
    dd.classList.remove('is-open');
    dd.classList.add('is-closing');
    $('#bLayout').setAttribute('aria-expanded', 'false');
    if (dd.contains(document.activeElement)) document.activeElement.blur();
    setTimeout(function () { if (!dd.matches(':hover')) dd.classList.remove('is-closing'); }, 350);
  }

  dd.addEventListener('mouseleave', function () { dd.classList.remove('is-closing'); });
  dd.addEventListener('mouseenter', function () { $('#bLayout').setAttribute('aria-expanded', 'true'); });
  $('#bLayout').addEventListener('click', function () {
    var abrir = !dd.classList.contains('is-open');
    dd.classList.remove('is-closing');
    dd.classList.toggle('is-open', abrir);
    this.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  });
  $$('.dd-item').forEach(function (it) {
    it.addEventListener('click', function () { definirLayout(it.dataset.layout); fecharDropdown(); });
  });
  document.addEventListener('pointerdown', function (e) { if (!dd.contains(e.target)) dd.classList.remove('is-open'); });

  /* ---------- Foto e enquadramento ---------- */
  function geometria() {
    var n = foto.img;
    var s = Math.max(W / n.naturalWidth, H / n.naturalHeight) * enq.zoom;
    var dw = n.naturalWidth * s, dh = n.naturalHeight * s;
    var mx = (dw - W) / 2, my = (dh - H) / 2;
    enq.ox = Math.max(-mx, Math.min(mx, enq.ox));
    enq.oy = Math.max(-my, Math.min(my, enq.oy));
    return { x: (W - dw) / 2 + enq.ox, y: (H - dh) / 2 + enq.oy, dw: dw, dh: dh };
  }

  function pintarFoto() {
    if (!foto.img) return;
    var g = geometria();
    fotoEl.style.backgroundSize = g.dw + 'px ' + g.dh + 'px';
    fotoEl.style.backgroundPosition = g.x + 'px ' + g.y + 'px';
    var pct = Math.round(enq.zoom * 100);
    $('#zoom').value = pct;
    $('#zoomLabel').textContent = pct + '%';
    prepararAmostra();
    agendarCamadas();
  }

  var salvarTimer = null;
  function salvarEnquadramento() {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(function () { S.set('enquadramento', enq); }, 150);
  }

  function carregarImagem(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('decode')); };
      im.src = src;
    });
  }

  function definirFoto(src) {
    return carregarImagem(src).then(function (im) {
      foto.src = src;
      foto.img = im;
      fotoEl.style.backgroundImage = 'url("' + src + '")';
      pintarFoto();
    });
  }

  // Lê os primeiros bytes para reconhecer HEIC/HEIF mesmo sem extensão ou tipo
  async function pareceHeic(arquivo) {
    if (/heic|heif/i.test(arquivo.type) || /\.(heic|heif|hif)$/i.test(arquivo.name)) return true;
    try {
      var buf = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
      var marca = String.fromCharCode.apply(null, buf.slice(4, 12));
      return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(marca);
    } catch (e) { return false; }
  }

  async function decodificar(blob) {
    var url = URL.createObjectURL(blob);
    try { return await carregarImagem(url); } finally { URL.revokeObjectURL(url); }
  }

  async function esperarConversor() {
    for (var i = 0; i < 50 && !window.HeicTo; i++) await new Promise(function (r) { setTimeout(r, 100); });
    return window.HeicTo;
  }

  async function normalizar(arquivo) {
    var im = null;
    // 1) o próprio navegador (Safari abre HEIC nativamente)
    try { im = await decodificar(arquivo); } catch (e) { im = null; }
    // 2) HEIC/HEIF: converte no próprio computador
    if (!im && await pareceHeic(arquivo)) {
      var conv = await esperarConversor();
      if (!conv) throw new Error('O conversor de HEIC não carregou. Confira se o arquivo js/vendor/heic-to.js está na pasta do projeto.');
      var jpg;
      try {
        jpg = await conv({ blob: arquivo, type: 'image/jpeg', quality: 0.95 });
      } catch (e) {
        throw new Error('Esta foto HEIC não pôde ser convertida. No iPhone, abra a foto, toque em compartilhar → "Opções" → "Mais compatível", ou envie como JPG.');
      }
      im = await decodificar(Array.isArray(jpg) ? jpg[0] : jpg);
    }
    if (!im) throw new Error('decode');
    var s = Math.min(1, 2600 / Math.max(im.naturalWidth, im.naturalHeight));
    var cv = document.createElement('canvas');
    cv.width = Math.round(im.naturalWidth * s);
    cv.height = Math.round(im.naturalHeight * s);
    var cx = cv.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(im, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.93);
  }

  $('#bImg').addEventListener('click', function () { $('#file').click(); });

  $('#file').addEventListener('change', async function (e) {
    var arq = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    var b = $('#bImg');
    b.disabled = true;
    b.textContent = 'Carregando…';
    if (/heic|heif|hif/i.test(arq.type + arq.name)) b.textContent = 'Convertendo HEIC…';
    try {
      var src = await normalizar(arq);
      enq = { zoom: 1, ox: 0, oy: 0 };
      S.set('enquadramento', enq);
      await definirFoto(src);
      S.setArquivo('foto', src);
      abrirAjuste(true);
    } catch (err) {
      var msg = err && err.message && err.message !== 'decode'
        ? err.message
        : 'Formatos aceitos: JPG, PNG, WEBP e HEIC/HEIF.';
      avisar('Não consegui abrir “' + (arq.name || 'arquivo') + '”.\n\n' + msg);
    }
    b.disabled = false;
    b.textContent = 'Alterar imagem';
  });

  /* ---------- Reposicionar / redimensionar ---------- */
  var ajuste = $('#adjust'), barra = $('#adjustBar'), arraste = null;

  function abrirAjuste(abrir) {
    ajuste.hidden = !abrir;
    barra.hidden = !abrir;
    $('#bAdjust').setAttribute('aria-pressed', abrir ? 'true' : 'false');
  }

  function mover(dx, dy) { enq.ox += dx; enq.oy += dy; pintarFoto(); salvarEnquadramento(); }
  function zoom(f) { enq.zoom = Math.max(1, Math.min(3, enq.zoom * f)); pintarFoto(); salvarEnquadramento(); }
  function centralizar() { enq = { zoom: 1, ox: 0, oy: 0 }; pintarFoto(); salvarEnquadramento(); }

  $('#bAdjust').addEventListener('click', function () { abrirAjuste(ajuste.hidden); });
  $('#bDone').addEventListener('click', function () { abrirAjuste(false); });
  $('#bCenter').addEventListener('click', centralizar);
  $('#zoom').addEventListener('input', function () {
    enq.zoom = Number(this.value) / 100;
    pintarFoto();
    salvarEnquadramento();
  });

  ajuste.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.05 : 1 / 1.05);
  }, { passive: false });

  ajuste.addEventListener('pointerdown', function (e) {
    ajuste.setPointerCapture(e.pointerId);
    ajuste.classList.add('is-dragging');
    arraste = { x: e.clientX, y: e.clientY, ox: enq.ox, oy: enq.oy };
  });
  ajuste.addEventListener('pointermove', function (e) {
    if (!arraste) return;
    var k = W / frame.clientWidth;
    enq.ox = arraste.ox + (e.clientX - arraste.x) * k;
    enq.oy = arraste.oy + (e.clientY - arraste.y) * k;
    pintarFoto();
  });
  function fimArraste() {
    if (arraste) salvarEnquadramento();
    arraste = null;
    ajuste.classList.remove('is-dragging');
  }
  ajuste.addEventListener('pointerup', fimArraste);
  ajuste.addEventListener('pointercancel', fimArraste);

  /* ---------- Guias de corte ---------- */
  function alternarGuias() {
    var g = $('#guide');
    g.hidden = !g.hidden;
    $('#bGuide').setAttribute('aria-pressed', g.hidden ? 'false' : 'true');
  }
  $('#bGuide').addEventListener('click', alternarGuias);

  /* ---------- Exportação ---------- */
  function opcoesExport() {
    atualizarCamadas();
    return { art: art, foto: foto.img ? { img: foto.img, geom: geometria() } : null, plano: plano };
  }

  function nomeArquivo(ext) {
    var base = [textos.kicker, textos.title].join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    return 'thumb-acrylicart' + (base ? '-' + base : '') + '.' + ext;
  }

  var baixando = false;
  async function baixar() {
    if (baixando) return;
    baixando = true;
    var b = $('#bDown'), status = $('#status');
    var fmt = (document.querySelector('input[name="fmt"]:checked') || {}).value || 'png';
    var rotulo = b.innerHTML;
    b.disabled = true;
    b.textContent = 'Gerando…';
    status.textContent = '';
    try {
      var o = opcoesExport();
      o.tipo = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      var blob = await window.exportarArte(o);
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo(fmt);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      status.textContent = 'Arquivo 1080 × 1920 gerado (' + fmt.toUpperCase() + ').';
    } catch (err) {
      status.textContent = 'Não foi possível gerar a imagem: ' + (err && err.message ? err.message : err);
    }
    b.disabled = false;
    b.innerHTML = rotulo;
    baixando = false;
  }
  $('#bDown').addEventListener('click', baixar);

  /* ---------- Simulador ---------- */
  var sim = $('#sim'), simUrl = null;

  async function abrirSimulador() {
    var bt = $('#bSim');
    bt.disabled = true;
    try {
      var cv = await window.desenharArte(opcoesExport());
      var blob = await window.canvasParaBlob(cv, 'image/jpeg', 0.85);
      if (simUrl) URL.revokeObjectURL(simUrl);
      simUrl = URL.createObjectURL(blob);
      $$('#sim .sim-img').forEach(function (im) { im.src = simUrl; });
      sim.hidden = false;
      $('#simClose').focus();
    } catch (e) {
      avisar('Não foi possível gerar a simulação.\n\n' + (e && e.message ? e.message : e));
    }
    bt.disabled = false;
  }
  function fecharSimulador() { sim.hidden = true; $('#bSim').focus(); }

  $('#bSim').addEventListener('click', abrirSimulador);
  $('#simClose').addEventListener('click', fecharSimulador);
  sim.addEventListener('click', function (e) { if (e.target === sim) fecharSimulador(); });

  /* ---------- Atalhos de teclado ---------- */
  document.addEventListener('keydown', function (e) {
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); baixar(); return; }
    if (!avisoEl.hidden) {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); fecharAviso(); }
      return;
    }
    if (e.key === 'Escape') {
      if (!sim.hidden) { fecharSimulador(); return; }
      if (!ajuste.hidden) { abrirAjuste(false); return; }
      dd.classList.remove('is-open');
      return;
    }
    if (mod || e.altKey) return;
    var t = e.target;
    if (t && t.nodeType === 1 && (t.isContentEditable || t.matches('textarea, input[type="text"], input[type="range"], select'))) return;
    if (!sim.hidden) return;

    var passo = e.shiftKey ? 60 : 12;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); mover(-passo, 0); break;
      case 'ArrowRight': e.preventDefault(); mover(passo, 0); break;
      case 'ArrowUp': e.preventDefault(); mover(0, -passo); break;
      case 'ArrowDown': e.preventDefault(); mover(0, passo); break;
      case '+': case '=': e.preventDefault(); zoom(1.05); break;
      case '-': case '_': e.preventDefault(); zoom(1 / 1.05); break;
      case '0': centralizar(); break;
      case '1': case '2': case '3': definirLayout(ORDEM_LAYOUTS[+e.key - 1]); break;
      case 'g': case 'G': alternarGuias(); break;
      case 'p': case 'P': abrirSimulador(); break;
    }
  });

  /* ---------- Início ---------- */
  $('#logo').src = LOGO;
  $('#logo').addEventListener('load', agendarCamadas);
  definirLayout(layoutKey);
  aplicarTextos();
  ajustarEscala();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendarCamadas);

  S.getArquivo('foto').then(function (salva) {
    return definirFoto(salva || FOTO_PADRAO).catch(function () {
      enq = { zoom: 1, ox: 0, oy: 0 };
      return definirFoto(FOTO_PADRAO);
    });
  });
})();
