#!/usr/bin/env python3
"""Regera js/assets-embutidos.js a partir de assets/logo-branco.png e assets/foto-padrao.jpg.

Uso (na raiz do repositório):
    python3 scripts/embutir-assets.py

Os arquivos ficam embutidos em base64 para que a exportação PNG/JPG funcione
mesmo abrindo o index.html direto do computador (file://), onde o navegador
bloqueia a leitura de imagens locais pelo <canvas>.
"""
import base64
import mimetypes
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ASSETS = {
    "logo": RAIZ / "assets" / "logo-branco.png",
    "photo": RAIZ / "assets" / "foto-padrao.jpg",
}
SAIDA = RAIZ / "js" / "assets-embutidos.js"


def data_url(caminho: Path) -> str:
    mime = mimetypes.guess_type(caminho.name)[0] or "application/octet-stream"
    dados = base64.b64encode(caminho.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{dados}"


def main() -> None:
    linhas = [
        "/* Gerado automaticamente a partir de assets/logo-branco.png e assets/foto-padrao.jpg",
        "   (rode: python3 scripts/embutir-assets.py).",
        "   Mantém o logo e a foto padrão embutidos para que o PNG/JPG seja gerado sem bloqueio",
        "   de segurança quando o index.html é aberto direto do computador (file://). */",
        "window.ACRYLIC_ASSETS = {",
    ]
    itens = list(ASSETS.items())
    for i, (chave, caminho) in enumerate(itens):
        if not caminho.exists():
            raise SystemExit(f"Arquivo não encontrado: {caminho}")
        virgula = "," if i < len(itens) - 1 else ""
        linhas.append(f'  {chave}: "{data_url(caminho)}"{virgula}')
    linhas.append("};")
    SAIDA.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"OK → {SAIDA.relative_to(RAIZ)} ({SAIDA.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
