#!/usr/bin/env python
"""Baja el texto de una oferta a partir de su URL, para pasárselo a /tailor-cv.

    .venv/bin/python scripts/oferta.py <URL>
    .venv/bin/python scripts/oferta.py <URL> --out ofertas/2026-08-07-empresa-rol.md

Imprime el texto plano. No lo estructura: eso lo hace /tailor-cv leyéndolo, que
para eso hace falta criterio. Aquí solo se resuelve el problema mecánico de
sacar el texto de portales que lo esconden tras JS o antibot.

ponytail: un solo camino genérico (StealthyFetcher, que renderiza JS y pasa el
antibot) + un caso especial para LinkedIn, que es el 88% de las ofertas
guardadas en ofertas/. Sin parser por sitio: el HTML de cada portal cambia cada
pocos meses y mantener selectores es trabajo infinito.

LinkedIn: se usa el endpoint público de invitado (jobs-guest), el mismo que
sirve la oferta a quien no ha iniciado sesión. Es tu propia búsqueda de empleo
y una oferta pública; aun así LinkedIn desaconseja el acceso automatizado en
sus términos, así que úsalo con cabeza: de una en una, no en masa.
"""
import argparse
import re
import sys
from pathlib import Path

from scrapling.fetchers import Fetcher, StealthyFetcher

# /jobs/view/4440059339, /jobs/view/senior-ai-engineer-at-foo-4440059339,
# /jobs/search/?currentJobId=4440059339
LINKEDIN_ID = re.compile(r"(?:currentJobId=|/jobs/view/(?:[^/?]*-)?)(\d{6,})")
GUEST = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{}"
IGNORE = ("script", "style", "noscript", "svg", "nav", "header", "footer", "form", "button")


def clean(page):
    text = page.get_all_text(separator="\n", strip=True, ignore_tags=IGNORE)
    # El HTML deja rachas de líneas vacías; deja como mucho una.
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def fetch(url):
    """Devuelve (texto, cómo_se_obtuvo). Lanza si no saca nada útil."""
    m = LINKEDIN_ID.search(url)
    if m:
        page = Fetcher.get(GUEST.format(m.group(1)), timeout=30)
        if page.status == 200:
            text = clean(page)
            if len(text) > 400:
                return text, f"linkedin jobs-guest #{m.group(1)}"
        print(f"[aviso] jobs-guest devolvió {page.status} o poco texto; "
              "reintento con navegador", file=sys.stderr)

    page = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=60000)
    if page.status != 200:
        raise SystemExit(f"HTTP {page.status} al abrir {url}")
    text = clean(page)
    if len(text) < 400:
        raise SystemExit(
            f"Solo {len(text)} caracteres extraídos: la oferta probablemente exige login. "
            "Ábrela en el navegador y pega el texto directamente en /tailor-cv."
        )
    return text, "navegador (StealthyFetcher)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", help="fichero markdown donde guardarlo")
    args = ap.parse_args()

    text, how = fetch(args.url)
    doc = f"- URL: {args.url}\n- Origen: {how}\n\n{text}\n"

    if args.out:
        Path(args.out).write_text(doc, encoding="utf8")
        print(f"{args.out} — {len(text)} caracteres vía {how}")
    else:
        print(doc)


if __name__ == "__main__":
    main()
