# Gerador de Thumbnail · AcrylicArt

Ferramenta web para criar capas de Reels (1080 × 1920) no padrão visual da AcrylicArt: troca a foto, escolhe o layout, edita os textos num painel lateral e baixa em PNG ou JPG.

Sem servidor, sem build, sem dependências para instalar. HTML, CSS e JavaScript puros. Funciona 100% offline, inclusive com fotos HEIC do iPhone.

## Como usar

**No computador:** baixe o repositório e abra `index.html` no Chrome, Edge ou Firefox (dois cliques).

**Online (GitHub Pages):**
1. Suba este repositório no GitHub.
2. Em *Settings → Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. A ferramenta fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Funções

- **Layout** (passe o mouse no botão): *Rodapé* (texto embaixo), *Topo* (texto em cima) ou *Meio à esquerda*. Sombras, faixa diagonal e linhas magenta acompanham cada um.
- **Painel de textos:** selo, destaque magenta, título principal, processo e chamada. Enter quebra a linha. Deixar "Processo" vazio esconde a faixa. Aviso automático se o texto sair da área segura do feed.
- **Contraste automático:** analisa a foto atrás do texto e escurece só o necessário quando ela é clara. Pode ser desligado.
- **Alterar imagem:** JPG, PNG, WEBP e HEIC/HEIF (foto do iPhone). O HEIC é convertido para JPG no próprio navegador, sem enviar nada para a internet — fotos grandes levam alguns segundos.
- **Reposicionar / redimensionar:** arraste a foto, use o controle ou a rolagem do mouse para zoom (100–300%).
- **Ver cortes:** linha branca = 3:4 (grade do perfil), linha magenta = 4:5 (feed).
- **Simular no Instagram:** mostra a capa como aparece no Reels (9:16), no feed (4:5) e na grade do perfil (3:4).
- **Baixar imagem:** PNG ou JPG em 1080 × 1920, idêntico à pré-visualização.
- Textos, layout, enquadramento e a última foto ficam salvos no navegador.

### Atalhos

| Tecla | Ação |
| --- | --- |
| `Ctrl/⌘ + S` | Baixar imagem |
| Setas (`Shift` = passo maior) | Mover a foto |
| `+` / `−` | Zoom da foto |
| `0` | Centralizar a foto |
| `1` `2` `3` | Layout rodapé / topo / meio |
| `G` | Mostrar cortes |
| `P` | Simular no Instagram |
| `Esc` | Fechar ajuste / simulador |

Os atalhos de uma tecla ficam desativados enquanto você digita num campo.

## Estrutura

```
index.html                 página da ferramenta
css/fontes.css             Oswald e Poppins embutidas (base64) — funciona offline
css/arte.css               a arte 1080×1920 (medidas em px reais)
css/app.css                interface (painel, botões, dropdown, simulador)
js/layouts.js              definição dos 3 layouts (sombras, faixa, linhas)
js/app.js                  lógica: textos, foto, layout, contraste, atalhos, download
js/exportar.js             gera o PNG/JPG lendo o layout real da arte
js/armazenamento.js        salva textos/ajustes (localStorage) e foto (IndexedDB)
js/assets-embutidos.js     logo e foto padrão em base64 (gerado)
assets/logo-branco.png     logo AcrylicArt
assets/foto-padrao.jpg     foto inicial
fonts/*.woff2              arquivos originais das fontes (referência)
js/vendor/heic-to.js       conversor HEIC/HEIF → JPG (libheif, LGPL-3.0)
scripts/embutir-assets.py  regera js/assets-embutidos.js
```

## Personalizar

- **Cores, fontes e tamanhos dos textos:** `css/arte.css`. A exportação lê as posições do layout, então o arquivo baixado acompanha a mudança.
- **Sombras, faixa e linhas de cada layout:** `js/layouts.js` (usado tanto na tela quanto no arquivo exportado).
- **Textos padrão:** `js/app.js` → `PADRAO`.
- **Trocar logo ou foto padrão:** substitua os arquivos em `assets/` (mesmo nome) e rode:

  ```
  python3 scripts/embutir-assets.py
  ```

  Necessário porque, ao abrir o `index.html` direto do computador, o navegador bloqueia o uso de imagens locais na exportação; os arquivos embutidos contornam esse bloqueio.

## Licenças

heic-to 1.6.6 (libheif/libde265): LGPL-3.0 — js/vendor/heic-to-LICENSE.txt. Arquivo usado sem modificações.

Oswald e Poppins: SIL Open Font License 1.1 (Google Fonts). O arquivo `fonts/oswald-600-*.woff2` é a versão variável e cobre os pesos 600 e 700.
