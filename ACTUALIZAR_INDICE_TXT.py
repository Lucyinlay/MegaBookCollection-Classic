#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mega Book Collection - build a reliable static full-text search index for
Zenodo TXT files. Python 3.8+ standard library only.
Run from the extracted website directory (double-click .bat on Windows).
No FTP, API keys, cloud services or dependencies are required.
IMPORTANT: This script must be run on a computer with Internet access.
"""
import concurrent.futures
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

BASE=Path(__file__).resolve().parent
CATALOG=BASE/'zenodo-txt-catalog.json'
CACHE=BASE/'.mbc_txt_cache'
SHARDS=BASE/'mbc_txt_index_data'
MANIFEST=BASE/'zenodo-txt-index-manifest.json'
REPORT=BASE/'INFORME_BUSQUEDA_TXT.txt'
MAX_DOWNLOAD_BYTES=80*1024*1024
MAX_SHARD_BYTES=1_700_000


def raw_urls(source):
    filename='/'.join(urllib.parse.quote(p,safe='') for p in source['file'].split('/'))
    rid=source['record']
    return [f'https://zenodo.org/api/records/{rid}/files/{filename}/content',
            f'https://zenodo.org/records/{rid}/files/{filename}?download=1']


def get_file(source):
    key=hashlib.sha256(source['url'].encode('utf-8')).hexdigest()[:25]
    path=CACHE/(key+'.txt')
    if path.is_file():
        return source,path,None
    last=None
    for url in raw_urls(source):
        for attempt in range(2):
            try:
                request=urllib.request.Request(url,headers={'User-Agent':'MegaBookCollection-MirrorIndexer/1.0 (public TXT archival index)','Accept':'text/plain,application/octet-stream,*/*'})
                with urllib.request.urlopen(request,timeout=35) as response:
                    ct=response.headers.get('Content-Type','').lower()
                    length=response.headers.get('Content-Length','')
                    if length.isdigit() and int(length)>MAX_DOWNLOAD_BYTES:
                        raise ValueError(f'TXT over {MAX_DOWNLOAD_BYTES//1024//1024}MB safety limit')
                    chunks=[];size=0
                    while True:
                        block=response.read(256*1024)
                        if not block:break
                        size+=len(block)
                        if size>MAX_DOWNLOAD_BYTES:raise ValueError('TXT exceeds size limit')
                        chunks.append(block)
                    content=b''.join(chunks)
                    if ('text/html' in ct or content[:300].lstrip().lower().startswith((b'<!doctype html',b'<html'))):
                        raise ValueError('Zenodo returned an HTML page, not TXT content')
                tmp=path.with_suffix('.tmp')
                tmp.write_bytes(content);tmp.replace(path)
                return source,path,None
            except Exception as e:
                last=str(e)
                if attempt==0:time.sleep(0.5)
    return source,None,last


def decode_txt(content, source):
    if content.startswith(b'\xef\xbb\xbf'):return content.decode('utf-8-sig')
    if content.startswith((b'\xff\xfe',b'\xfe\xff')):return content.decode('utf-16')
    try:return content.decode('utf-8')
    except UnicodeDecodeError:pass
    # Some older bibliography lists are stored in a regional Windows encoding.
    hint=(source.get('collection','')+' '+source.get('file',''))
    if any('\u0400'<=c<='\u052f' for c in hint):encoding='cp1251'
    elif any('\u3400'<=c<='\u9fff' for c in hint):encoding='gb18030'
    elif any('\u0370'<=c<='\u03ff' for c in hint):encoding='cp1253'
    else:encoding='cp1252'
    return content.decode(encoding,errors='replace')



def ensure_utf8_word_html():
    """Normalize Word-exported Windows-1252 HTML before publishing a ZIP.

    Only the declared character encoding changes; HTML markup, tables, and URLs
    keep their original Unicode text. Safe to run again for updated HTML files.
    """
    import re
    for p in BASE.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in ('.htm', '.html'):
            continue
        if CACHE in p.parents:
            continue
        raw = p.read_bytes()
        if not re.search(rb'charset\s*=\s*[\'\"]?windows-1252', raw[:220000], re.I):
            continue
        text = raw.decode('cp1252')
        updated, count = re.subn(r'(charset\s*=\s*[\'\"]?)windows-1252',
                                 r'\1utf-8', text, count=1, flags=re.I)
        if count:
            p.write_bytes(updated.encode('utf-8'))

def main():
    if not CATALOG.is_file():raise SystemExit('ERROR: zenodo-txt-catalog.json is missing')
    sources=json.loads(CATALOG.read_text(encoding='utf-8'))['sources']
    print(f'Zenodo TXT catalog: {len(sources)} source files')
    print('Downloading/caching TXT files; already cached files will be reused.')
    CACHE.mkdir(exist_ok=True)
    # Do not destroy a previously working index before a new build finishes.
    staging=BASE/'mbc_txt_index_data_NEW'
    staging.mkdir(exist_ok=True)
    for f in staging.glob('*.json'):f.unlink()
    failed=[];processed=[];completed=0
    # Parallel download, preserve catalog order in the generated index.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures=[pool.submit(get_file,src) for src in sources]
        for future in concurrent.futures.as_completed(futures):
            src,path,err=future.result()
            completed+=1
            print(f'[{completed}/{len(sources)}] '+('OK   ' if path else 'ERROR')+'  '+src['collection'][:72],flush=True)
            if path:processed.append((src,path))
            else:failed.append((src,err))
    processed.sort(key=lambda pair:pair[0]['id'])
    shard=[];shard_size=0;shard_names=[];shard_no=0;line_count=0
    def flush():
        nonlocal shard,shard_size,shard_no
        if not shard:return
        name=f'part-{shard_no:04}.json'
        (staging/name).write_text(json.dumps({'docs':shard},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        shard_names.append('mbc_txt_index_data/'+name)
        shard_no+=1;shard=[];shard_size=0
    for src,path in processed:
        try:content=decode_txt(path.read_bytes(),src)
        except Exception as e:failed.append((src,'decode: '+str(e)));continue
        lines=content.splitlines()
        line_count+=len(lines)
        start=0;batch=[];batch_size=0
        for i,line in enumerate(lines):
            # Preserve complete searchable lines, including empty lines for line numbering.
            entry_bytes=len(json.dumps(line,ensure_ascii=False).encode('utf-8'))+2
            if batch and batch_size+entry_bytes>MAX_SHARD_BYTES:
                doc={'id':src['id'],'start':start,'lines':batch}
                if shard and shard_size+batch_size>MAX_SHARD_BYTES:flush()
                shard.append(doc);shard_size+=batch_size
                start=i;batch=[];batch_size=0
            batch.append(line);batch_size+=entry_bytes
        if batch:
            if shard and shard_size+batch_size>MAX_SHARD_BYTES:flush()
            shard.append({'id':src['id'],'start':start,'lines':batch});shard_size+=batch_size
    flush()
    if not shard_names:
        print('No downloadable TXT content; prior index preserved.')
        return 1
    if SHARDS.exists():
        for p in SHARDS.glob('*.json'):p.unlink()
    else:SHARDS.mkdir(exist_ok=True)
    for p in staging.glob('*.json'):p.replace(SHARDS/p.name)
    staging.rmdir()
    manifest={'version':1,'shards':shard_names,'sources_total':len(sources),
              'sources_indexed':len(processed),'failed_sources':len(failed),
              'line_count':line_count,'generated_at':time.strftime('%Y-%m-%d %H:%M:%S')}
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    report=f'TXT catalog entries: {len(sources)}\nTXT downloaded: {len(processed)}\nTXT unavailable/skipped: {len(failed)}\nLines indexed: {line_count}\nIndex chunks: {len(shard_names)}\n\n'
    for src,error in failed:report+=f"ERROR: {src['collection']}\n{src['url']}\n{error}\n\n"
    REPORT.write_text(report,encoding='utf-8')
    print('\n'+report[:3500])
    ensure_utf8_word_html()
    print('Building the downloadable website ZIP and publishable deployment ZIP ...')
    def files_for_package():
        for p in sorted(BASE.rglob('*')):
            if not p.is_file() or CACHE in p.parents or p==BASE/'MegaBookCollection-Website.zip':continue
            if p.name in ('MegaBookCollection_TXT_BUSCADOR_LISTO_PARA_PUBLICAR.zip',):continue
            if p.suffix=='.tmp':continue
            yield p
    all_files=list(files_for_package())
    zip_path=BASE/'MegaBookCollection-Website.zip'
    with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7,allowZip64=True) as z:
        for p in all_files:z.write(p,p.relative_to(BASE).as_posix())
    package=BASE.parent/'MegaBookCollection_TXT_BUSCADOR_LISTO_PARA_PUBLICAR.zip'
    with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7,allowZip64=True) as z:
        for p in list(files_for_package())+[zip_path]:z.write(p,p.relative_to(BASE).as_posix())
    print('Deployment ZIP ready:',package)
    print('The nested DOWNLOAD ZIP is updated. Upload this deployment ZIP to Cloudflare, or unzip and FTP to FreeWHA.')
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except KeyboardInterrupt:print('\nStopped; previously generated files preserved.');sys.exit(130)
