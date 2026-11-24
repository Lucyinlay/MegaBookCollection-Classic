# -*- coding: utf-8 -*-
"""Start this exact website copy using a free localhost port.
Python 3.7+; no installation beyond Python is needed.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

ROOT = Path(__file__).resolve().parent

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

Handler = functools.partial(NoCacheHandler, directory=str(ROOT))
with ThreadingHTTPServer(('127.0.0.1', 0), Handler) as server:
    url = 'http://127.0.0.1:{}/index.html'.format(server.server_port)
    print('MEGA BOOK COLLECTION - COPIA LOCAL ACTUAL')
    print('Carpeta: {}'.format(ROOT))
    print('Web: {}'.format(url))
    print('Puedes dejar abierto este servidor mientras usas el buscador.')
    print('Para detenerlo: Ctrl+C o cierra esta ventana.')
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Servidor detenido.')
