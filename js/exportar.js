/* Exportação 1080×1920.
   Desenha a arte num <canvas>: as camadas (sombra, faixa, linhas, reforço de
   contraste) vêm do mesmo "plano" calculado pelo app; caixas, letras e logo
   são lidas da posição real no layout da página. O arquivo baixado sai
   idêntico à pré-visualização. */
(function () {
  'use strict';
  var W = 1080, H = 1920;
  var RAD = -4.573 * Math.PI / 180;

  function dark(a) { return 'rgba(10,10,12,' + a + ')'; }
  function stops(g, list) { list.forEach(function (p) { g.addColorStop(p[0], dark(p[1])); }); }

  /**
   * plano = {
   *   sombras: [{dir:'v'|'h', stops:[[pos,alpha]...]}, ...],
   *   faixa: 'baixo'|'cima'|null,
   *   linhaY: número (centro da linha principal),
   *   reforco: {dir:'v'|'h', stops:[[px,alpha]...]} | null   (posições em px)
   * }
   */
  function camadas(c, plano) {
    var g;
    plano.sombras.forEach(function (s) {
      g = s.dir === 'h' ? c.createLinearGradient(0, 0, W, 0) : c.createLinearGradient(0, 0, 0, H);
      stops(g, s.stops);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    });

    if (plano.reforco) {
      var r = plano.reforco, len = r.dir === 'h' ? W : H;
      g = r.dir === 'h' ? c.createLinearGradient(0, 0, W, 0) : c.createLinearGradient(0, 0, 0, H);
      r.stops.forEach(function (p) { g.addColorStop(Math.max(0, Math.min(1, p[0] / len)), dark(p[1])); });
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }

    if (plano.faixa) {
      c.save();
      if (plano.faixa === 'baixo') {
        c.translate(W / 2, H);
        c.rotate(RAD);
        g = c.createLinearGradient(0, -691, 0, 0);
        stops(g, [[0, 0], [.3, .5], [.7, .82], [1, .9]]);
        c.fillStyle = g;
        c.fillRect(-648, -691, 1296, 691);
      } else {
        c.translate(W / 2, 0);
        c.rotate(RAD);
        g = c.createLinearGradient(0, 0, 0, 691);
        stops(g, [[0, .9], [.3, .82], [.7, .5], [1, 0]]);
        c.fillStyle = g;
        c.fillRect(-648, 0, 1296, 691);
      }
      c.restore();
    }

    c.save();
    c.translate(W / 2, plano.linhaY);
    c.rotate(RAD);
    c.fillStyle = '#e6007e';
    c.fillRect(-594, -1, 1188, 2);
    c.restore();

    c.save();
    c.translate(W / 2, plano.linhaY + 29.5);
    c.rotate(RAD);
    g = c.createLinearGradient(-594, 0, 594, 0);
    g.addColorStop(0, 'rgba(230,0,126,.05)');
    g.addColorStop(1, 'rgba(230,0,126,.55)');
    c.fillStyle = g;
    c.fillRect(-594, -.5, 1188, 1);
    c.restore();
  }

  function visivel(el) { return el.getClientRects().length > 0; }
  function transparente(cor) { return !cor || cor === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(cor); }

  function caixa(c, el, ox, oy) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var cs = getComputedStyle(el);
    var x = r.left - ox, y = r.top - oy;
    if (!transparente(cs.backgroundColor)) {
      c.fillStyle = cs.backgroundColor;
      c.fillRect(x, y, r.width, r.height);
    }
    var bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw > 0 && cs.borderTopStyle !== 'none' && !transparente(cs.borderTopColor)) {
      c.strokeStyle = cs.borderTopColor;
      c.lineWidth = bw;
      c.strokeRect(x + bw / 2, y + bw / 2, r.width - bw, r.height - bw);
    }
  }

  function texto(c, el, ox, oy) {
    var cs = getComputedStyle(el);
    c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    c.fillStyle = cs.color;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    if ('letterSpacing' in c) c.letterSpacing = '0px';

    var m = c.measureText('ÉHg');
    var asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    if (asc == null) { asc = m.actualBoundingBoxAscent; desc = m.actualBoundingBoxDescent; }
    var maiusc = cs.textTransform === 'uppercase';

    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var range = document.createRange();
    var node;
    while ((node = walker.nextNode())) {
      var s = node.nodeValue;
      for (var i = 0; i < s.length; i++) {
        var code = s.charCodeAt(i);
        var len = (code >= 0xD800 && code <= 0xDBFF) ? 2 : 1;
        var ch = s.substr(i, len);
        if (!/\s/.test(ch)) {
          range.setStart(node, i);
          range.setEnd(node, i + len);
          var r = range.getBoundingClientRect();
          if (r.width || r.height) {
            var base = r.top - oy + (r.height - (asc + desc)) / 2 + asc;
            c.fillText(maiusc ? ch.toUpperCase() : ch, r.left - ox, base);
          }
        }
        i += len - 1;
      }
    }
  }

  function imagem(c, el, ox, oy) {
    if (!el.complete || !el.naturalWidth) return;
    var r = el.getBoundingClientRect();
    c.drawImage(el, r.left - ox, r.top - oy, r.width, r.height);
  }

  async function esperarFontes() {
    if (!document.fonts || !document.fonts.load) return;
    try {
      await Promise.all([
        document.fonts.load('500 28px Poppins'), document.fonts.load('600 37px Poppins'),
        document.fonts.load('700 57px Oswald'), document.fonts.load('600 40px Oswald')
      ]);
      await document.fonts.ready;
    } catch (e) {}
  }

  /**
   * Gera o canvas 1080×1920.
   * @param {{art:HTMLElement, foto:{img,geom}|null, plano:Object}} o
   * @returns {Promise<HTMLCanvasElement>}
   */
  window.desenharArte = async function (o) {
    await esperarFontes();
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var c = cv.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.fillStyle = '#0a0a0c';
    c.fillRect(0, 0, W, H);

    if (o.foto && o.foto.img) {
      var g = o.foto.geom;
      c.drawImage(o.foto.img, g.x, g.y, g.dw, g.dh);
    }
    camadas(c, o.plano);

    var art = o.art;
    var anterior = art.style.transform;
    art.style.transform = 'none';
    try {
      var b = art.getBoundingClientRect();
      var ox = b.left, oy = b.top;
      var els = art.querySelectorAll('[data-box],[data-text],[data-img]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (!visivel(el)) continue;
        if (el.hasAttribute('data-box')) caixa(c, el, ox, oy);
        if (el.hasAttribute('data-img')) imagem(c, el, ox, oy);
        if (el.hasAttribute('data-text')) texto(c, el, ox, oy);
      }
    } finally {
      art.style.transform = anterior;
    }
    return cv;
  };

  window.canvasParaBlob = function (cv, tipo, qualidade) {
    return new Promise(function (resolve, reject) {
      try {
        cv.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('o navegador não gerou o arquivo'));
        }, tipo || 'image/png', qualidade || 0.95);
      } catch (e) { reject(e); }
    });
  };

  window.exportarArte = async function (o) {
    var cv = await window.desenharArte(o);
    return window.canvasParaBlob(cv, o.tipo);
  };
})();
