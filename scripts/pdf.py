#!/usr/bin/env python
"""Genera el PDF del CV sin abrir el navegador a mano.

    npm run build                       # una vez, o cuando cambie src/
    .venv/bin/python scripts/pdf.py --design 5 --lang en --out CV_ATS_EN.pdf

Hay tres diseños y sus números NO son correlativos, salen de src/designs/index.js:
5 = ATS (el que se sube a un portal, pásalo por scripts/ats.js),
3 = Tarjetas y 0 = Minimalista (los bonitos, para enviar por email o enseñar).

ponytail: sirve dist/ con http.server en vez de file:// porque Vite genera
rutas absolutas (/assets/...) que file:// no resuelve.
"""
import argparse
import functools
import http.server
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


def serve(directory):
    """Arranca un servidor estático en un puerto libre. Devuelve el puerto."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):  # sin ruido en stdout
            pass

    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(directory)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd.server_address[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--design", type=int, default=5, help="0-5 (5 = ATS)")
    ap.add_argument("--lang", default="en", choices=["es", "en"])
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    if not (DIST / "index.html").exists():
        raise SystemExit("Falta dist/. Ejecuta primero: npm run build")

    out = Path(args.out) if args.out else ROOT / f"CV_Victor_Trisac_{args.lang.upper()}_ATS.pdf"
    port = serve(DIST)
    url = f"http://127.0.0.1:{port}/?design={args.design}&lang={args.lang}"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, wait_until="networkidle")
        # Los diseños se cargan con React.lazy: espera a que haya contenido.
        page.wait_for_selector("h1", timeout=15000)
        page.pdf(path=str(out), format="A4", print_background=True,
                 margin={"top": "5mm", "bottom": "5mm", "left": "5mm", "right": "5mm"})
        browser.close()

    print(f"{out}  ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
