/* Layouts disponíveis.
   Cada layout define onde o bloco de texto fica e como as camadas escuras,
   a faixa diagonal e as linhas magenta se posicionam. Os mesmos dados são
   usados para montar a pré-visualização (DOM) e o arquivo exportado (canvas),
   então os dois nunca divergem. */
(function () {
  'use strict';

  var RODAPE_SOMBRA = [[0, .12], [.22, .04], [.5, .04], [.66, .42], [.78, .8], [.9, .93], [1, .96]];
  function espelhar(stops) {
    return stops.map(function (s) { return [+(1 - s[0]).toFixed(4), s[1]]; }).reverse();
  }

  // Escurece só a faixa do logo/chamada quando o bloco de texto não está embaixo
  var BASE_RODAPE = { dir: 'v', stops: [[0, 0], [.72, 0], [.84, .55], [.92, .82], [1, .9]] };

  window.LAYOUTS = {
    rodape: {
      nome: 'Rodapé',
      desc: 'Texto embaixo · produto em cima',
      bloco: 'baixo',            // posição do bloco de texto na área segura
      sombras: [{ dir: 'v', stops: RODAPE_SOMBRA }],
      faixa: 'baixo',            // faixa escura diagonal
      linha: { ref: 'topo', dy: 76 }  // linhas magenta relativas ao bloco
    },
    topo: {
      nome: 'Topo',
      desc: 'Texto em cima · produto embaixo',
      bloco: 'cima',
      sombras: [{ dir: 'v', stops: espelhar(RODAPE_SOMBRA) }, BASE_RODAPE],
      faixa: 'cima',
      linha: { ref: 'base', dy: -76 }
    },
    meio: {
      nome: 'Meio à esquerda',
      desc: 'Texto centralizado à esquerda · produto à direita',
      bloco: 'meio',
      sombras: [{ dir: 'h', stops: [[0, .9], [.38, .72], [.62, .28], [.85, .04], [1, 0]] }, BASE_RODAPE],
      faixa: null,
      linha: { ref: 'topo', dy: 76 }
    }
  };

  window.LAYOUT_PADRAO = 'rodape';
})();
