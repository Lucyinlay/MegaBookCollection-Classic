/* Mega Book Collection - Zenodo TXT full-text search.
 * This searches the CONTENT of TXT lists, not just names in the HTML table.
 * A locally generated index is preferred; when absent, it attempts Zenodo's
 * cross-origin file API, explicitly reporting inaccessible sources.
 * Does not change any Word-authored table cell, link or its position.
 */
(function () {
  'use strict';
  function make(tag, klass, text) {
    var x = document.createElement(tag);
    if (klass) x.className = klass;
    if (text !== undefined) x.textContent = text;
    return x;
  }
  function clean(s) {
    s=String(s || '').toLowerCase();
    try { s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch(e){}
    return s;
  }
  function httpJson(url) {return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();});}
  function init(){
    var hero=document.querySelector('.mbc-hero');
    if (!hero || document.querySelector('.mbc-txt-area')) return;
    var oldLabel=document.querySelector('.mbc-hero-search label');
    if(oldLabel)oldLabel.textContent='Filter collection names (visible tables)';
    var oldInput=document.querySelector('#mbc-search');
    if(oldInput)oldInput.placeholder='Filter collection titles...';
    var area=make('section','mbc-ui mbc-txt-area');
    var intro=make('div','mbc-txt-intro');
    intro.appendChild(make('h2','','Search inside Zenodo TXT lists'));
    intro.appendChild(make('p','','Find book titles, filenames and other information inside the TXT files linked by “See list”. Results show the matching collection and the original list.'));
    area.appendChild(intro);
    var form=make('form','mbc-txt-form');
    var query=make('input');query.type='search';query.placeholder='Book title, author or filename...';query.required=true;query.minLength=2;query.setAttribute('aria-label','Search inside Zenodo TXT file contents');
    var submit=make('button','mbc-txt-submit','Search TXT');submit.type='submit';
    var stop=make('button','mbc-txt-stop','Stop');stop.type='button';stop.hidden=true;
    form.appendChild(query);form.appendChild(submit);form.appendChild(stop);area.appendChild(form);
    var status=make('p','mbc-txt-status','Search all indexed TXT lists, not only collection names.');status.setAttribute('aria-live','polite');area.appendChild(status);
    var results=make('div','mbc-txt-results');area.appendChild(results);
    hero.insertAdjacentElement('afterend',area);
    var catalog=null, session=null, rowLinks={};
    // Match each TXT to its original row without editing its link or table layout.
    var linkNodes=Array.prototype.slice.call(document.querySelectorAll('a[href]'));
    function linkToRow(source){
      if (Object.prototype.hasOwnProperty.call(rowLinks,source.id))return rowLinks[source.id];
      var link=linkNodes.find(function(a){return a.getAttribute('href')===source.url && a.closest('tr');});
      var row=link && link.closest('tr');
      if (!row) return rowLinks[source.id]='index.htm';
      if (!row.id) row.id='mbc-txt-row-'+source.id;
      return rowLinks[source.id]=((location.pathname.split('/').pop()||'index.htm')+'#'+row.id);
    }
    function rawUrl(source){
      // Zenodo's public API provides CORS support for its content endpoint.
      return 'https://zenodo.org/api/records/'+source.record+'/files/'+
        source.file.split('/').map(encodeURIComponent).join('/')+'/content';
    }
    function addResult(source, hits, total, state){
      if(!hits.length || state.output>=250)return;
      var card=make('article','mbc-txt-card');
      var head=make('div','mbc-txt-card-head');
      var name=make('strong','',source.collection);head.appendChild(name);
      var info=make('span','',total+' matching line'+(total!==1?'s':''));head.appendChild(info);
      card.appendChild(head);
      var actions=make('div','mbc-txt-card-actions');
      var zenodo=make('a','','Open TXT on Zenodo');zenodo.href=source.url;zenodo.target='_blank';zenodo.rel='noopener noreferrer';actions.appendChild(zenodo);
      if(linkNodes.some(function(a){return a.getAttribute('href')===source.url && a.closest('tr');})){
        var rowlink=make('a','','Show collection in table');rowlink.href=linkToRow(source);actions.appendChild(rowlink);
      }
      card.appendChild(actions);
      var ul=make('ul','mbc-txt-lines');
      hits.slice(0,Math.max(0,250-state.output)).forEach(function(hit){
        var li=make('li','','Line '+hit.number+': '+hit.text);ul.appendChild(li);state.output++;
      });
      card.appendChild(ul);
      results.appendChild(card);
    }
    function matchingLines(lines, tokens, offset){
      offset=offset||0;
      var matches=[],total=0;
      for(var i=0;i<lines.length;i++){
        var line=String(lines[i]||'');
        if (!line.trim())continue;
        var content=clean(line);
        if(tokens.every(function(tok){return content.indexOf(tok)!==-1;})){
          total++;
          if(matches.length<5)matches.push({number:i+1+offset,text:line.replace(/\s+/g,' ').slice(0,450)});
        }
      }
      return {hits:matches,total:total};
    }
    function setProgress(s){
      status.textContent='TXT checked: '+s.done+'/'+s.total+' · TXT with matches: '+s.matched+
        ' · inaccessible/skipped: '+s.failed+(s.output>=250?' · Showing first 250 matching lines':'');
    }
    function finish(s,indexed){
      stop.hidden=true;submit.disabled=false;
      if(s.cancelled){status.textContent='Search stopped. Results are partial: '+s.done+'/'+s.total+' TXT files checked.';return;}
      setProgress(s);
      if(s.failed) {
        var p=make('p','mbc-txt-warning','Incomplete search: '+s.failed+' TXT file(s) could not be read. These files may still contain matches.');
        results.prepend(p);
      }
      if(!s.matched){
        results.appendChild(make('p','mbc-txt-empty',s.failed===s.total?'No TXT files could be accessed. For reliable searching, generate the local search index with ACTUALIZAR_INDICE_TXT.bat.':'No matching lines were found in the TXT files successfully checked.'));
      }
      if(indexed){results.prepend(make('p','mbc-txt-source-note','Search performed using the local TXT index (a snapshot; update it when the Zenodo files change).'));}
      else {results.prepend(make('p','mbc-txt-source-note','Live search using the Zenodo API. Coverage depends on remote file access, CORS, size and network availability.'));}
    }
    async function useIndex(manifest,sourceMap,tokens,s){
      s.total=manifest.shards.length;
      s.failed=Number(manifest.failed_sources||0);
      setProgress(s);
      for(var i=0;i<manifest.shards.length;i++){
        if(s.cancelled)break;
        try{
          var data=await httpJson(manifest.shards[i]);
          if(s.cancelled)break;
          (data.docs||[]).forEach(function(doc){
            var source=sourceMap[doc.id];if(!source)return;
            var m=matchingLines(doc.lines||[],tokens,doc.start||0);
            if(m.total){s.matched++;addResult(source,m.hits,m.total,s);}
          });
        }catch(e){s.failed++;}
        s.done++;setProgress(s);
        await new Promise(function(r){setTimeout(r,0)});
      }
      finish(s,true);
    }
    async function useZenodo(sourceList,tokens,s){
      if(location.protocol==='file:'){
        results.appendChild(make('p','mbc-txt-warning','Browser security restricts TXT searching from file://. Publish this website to Cloudflare Pages or FreeWHA, or run it through a local web server.'));
        stop.hidden=true;submit.disabled=false;return;
      }
      s.total=sourceList.length;setProgress(s);
      var current=0;
      async function worker(){
        while(!s.cancelled && current<sourceList.length){
          var source=sourceList[current++];
          var controller=new AbortController();s.controllers.push(controller);
          var timeout=setTimeout(function(){controller.abort();},18000);
          try{
            var response=await fetch(rawUrl(source),{mode:'cors',signal:controller.signal});
            if(!response.ok)throw Error('HTTP '+response.status);
            var txt=await response.text();
            if(s.cancelled)break;
            var m=matchingLines(txt.split(/\r\n|\n|\r/),tokens);
            if(m.total){s.matched++;addResult(source,m.hits,m.total,s);}
          }catch(e){if(!s.cancelled)s.failed++;}
          finally{
            clearTimeout(timeout);
            var index=s.controllers.indexOf(controller);if(index>=0)s.controllers.splice(index,1);
            s.done++;setProgress(s);
          }
        }
      }
      await Promise.all(Array.from({length:6},worker));
      finish(s,false);
    }
    form.addEventListener('submit',async function(event){
      event.preventDefault();
      var q=query.value.trim();if(q.length<2)return;
      if(location.protocol==='file:'){status.textContent='El navegador bloquea el buscador al abrir un HTML desde disco (file://). Para probarlo en Windows, ejecuta PROBAR_BUSCADOR_EN_LOCAL.bat. En FreeWHA abre la web por HTTPS.';return;}
      if(session) {session.cancelled=true;session.controllers.forEach(function(x){x.abort()});}
      var s={cancelled:false,controllers:[],done:0,total:0,failed:0,matched:0,output:0};session=s;
      results.textContent='';submit.disabled=true;stop.hidden=false;status.textContent='Loading the TXT catalog...';
      try{
        if(!catalog) catalog=(await httpJson('zenodo-txt-catalog.json')).sources;
        if(!catalog || !catalog.length)throw Error('Empty catalog');
        var tokens=clean(q).split(/\s+/).filter(Boolean);
        var map={};catalog.forEach(function(source){map[source.id]=source;});
        var index=null;
        try{index=await httpJson('zenodo-txt-index-manifest.json');}catch(e){}
        if(s.cancelled)return;
        if(index && index.shards && index.shards.length){await useIndex(index,map,tokens,s);}
        else {await useZenodo(catalog,tokens,s);}
      }catch(e){
        status.textContent='Unable to load the TXT catalog or search index: '+e.message;
        stop.hidden=true;submit.disabled=false;
      }
    });
    stop.addEventListener('click',function(){
      if(session){session.cancelled=true;session.controllers.forEach(function(c){c.abort()});}
      status.textContent='Stopping the search...';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
