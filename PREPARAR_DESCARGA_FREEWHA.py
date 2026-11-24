# -*- coding: utf-8 -*-
"""Crea una copia completa del sitio descargable en partes aptas para FreeWHA.
Ejecutar desde la carpeta de la web (Python 3.7+).
El servidor la reconstruye al solicitar MegaBookCollection-Website.zip.
"""
from __future__ import print_function
import hashlib
import json
import os
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
PART_SIZE = 7_000_000  # siempre menor que 12 MB por archivo en FTP
PART_DIR = ROOT / 'site-download-parts'
ARCHIVE_NAME = 'MegaBookCollection-Website.zip'
TEMP_ZIP = ROOT / '_MBC_COMPILACION_TEMPORAL.zip'
EXCLUDED_DIRS = {'site-download-parts', '__pycache__', '.git'}


def include_file(p):
    rel = p.relative_to(ROOT)
    if any(piece in EXCLUDED_DIRS for piece in rel.parts[:-1]):
        return False
    if p.name in (ARCHIVE_NAME, TEMP_ZIP.name):
        return False
    return True


def main():
    if PART_DIR.exists():
        shutil.rmtree(str(PART_DIR))
    PART_DIR.mkdir(exist_ok=True)
    files = [p for p in ROOT.rglob('*') if p.is_file() and include_file(p)]
    with zipfile.ZipFile(str(TEMP_ZIP), 'w', compression=zipfile.ZIP_DEFLATED,
                         allowZip64=True, compresslevel=6) as z:
        for p in sorted(files):
            z.write(str(p), p.relative_to(ROOT).as_posix())
    parts = []
    sha256 = hashlib.sha256()
    with TEMP_ZIP.open('rb') as src:
        index = 1
        while True:
            data = src.read(PART_SIZE)
            if not data:
                break
            sha256.update(data)
            name = '{}.part{:03d}'.format(ARCHIVE_NAME, index)
            (PART_DIR / name).write_bytes(data)
            parts.append({'name': name, 'bytes': len(data)})
            index += 1
    total = TEMP_ZIP.stat().st_size
    (PART_DIR / 'manifest.json').write_text(json.dumps({
        'archive': ARCHIVE_NAME,
        'size': total,
        'sha256': sha256.hexdigest(),
        'parts': parts,
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    TEMP_ZIP.unlink()
    print('Preparados {} fragmentos para FreeWHA.'.format(len(parts)))
    print('Tamano total de la descarga: {:,.1f} MB.'.format(total / 1_000_000))
    print('Sube tambien .htaccess y download-site.php a FreeWHA.')
    print('La URL de descarga sigue siendo {}'.format(ARCHIVE_NAME))

if __name__ == '__main__':
    main()
