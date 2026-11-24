/* Mega Book Collection, Modern Library Edition. Original Word table structures untouched. */
(function () {
  'use strict';
  var pages = [
    ['index.htm','Home','Explore open collections','Books, magazines and digital archives in one community collection. Browse, share and preserve.'],
    ['scienceebooks.html','Science','Science & technology','Browse the science and technology collections.'],
    ['Projectmuse.html','Project MUSE','Project MUSE','Browse the Project MUSE collection.'],
    ['BibliothecaAlexandrina.html','Alexandrina','Bibliotheca Alexandrina','Browse this digital library collection.'],
    ['TheUltimateTravel.html','Travel','Travel collections','Explore travel books and guides.'],
    ['tuttoinitaliano.htm','Italiano','Libri in italiano','Collezioni e libri in italiano.'],
    ['TUDOEMPORTUGUES.htm','Português','Livros em português','Coleções e livros em português.'],
    ['LIBRUSEC.htm','Librusec','Librusec collection','Browse the Librusec book collection.'],
    ['EMULEAMULE.htm','eMule / aMule','eMule and aMule','Applications, resources and links.'],
    ['torrentclients.htm','Torrent clients','Torrent clients','Discover torrent software collections.'],
    ['mirror-guide.html','Mirror guide','Create your own mirror','Download and customize an independent copy of this site.']
  ];
  function el(tag,klass,txt){var e=document.createElement(tag); if(klass)e.className=klass;if(txt!==undefined)e.textContent=txt;return e;}
  function link(url,klass,txt){var a=el('a',klass,txt);a.href=url;return a;}
  function init(){
    try {
    var name=decodeURIComponent(location.pathname.split('/').pop()||'index.htm');
    if(name==='index.html')name='index.htm';
    var match=pages.find(function(p){return p[0].toLowerCase()===name.toLowerCase()})||pages[0];
    if(name.toLowerCase()==='mega book collection security backup.htm'){match=[name,'Backup','Website security backup','Download an independent backup copy of the site.'];}
    var isGuide=name.toLowerCase()==='mirror-guide.html';
    var header=el('header','mbc-ui mbc-top');var top=el('div','mbc-top-inner');
    var brand=link('index.htm','mbc-brand');brand.appendChild(el('span','mbc-brand-mark','MBC'));
    var bc=el('span','mbc-brand-copy');bc.appendChild(el('span','mbc-brand-name','Mega Book Collection'));bc.appendChild(el('small','mbc-brand-caption','Discover · Share · Preserve'));brand.appendChild(bc);top.appendChild(brand);
    var actions=el('div','mbc-top-actions');actions.appendChild(link('https://pixellize.io/website-clone','mbc-top-action','Clone online'));actions.appendChild(link('mirror-guide.html','mbc-top-action','GitHub mirror'));
    var dl=link('MegaBookCollection-Website.zip','mbc-top-action mbc-download','↓ Download website ZIP');dl.download='MegaBookCollection-Website.zip';actions.appendChild(dl);top.appendChild(actions);header.appendChild(top);
    var nav=el('nav','mbc-nav');nav.setAttribute('aria-label','Browse collections');pages.forEach(function(p){var a=link(p[0],'',p[1]);if(p[0]===match[0])a.setAttribute('aria-current','page');nav.appendChild(a)});header.appendChild(nav);document.body.insertBefore(header,document.body.firstChild);
    var hero=el('section','mbc-ui mbc-hero');var heroCopy=el('div','mbc-hero-copy');heroCopy.appendChild(el('p','mbc-overline','DIGITAL LIBRARY · COMMUNITY MIRRORS'));
    heroCopy.appendChild(el('h1','',match[2]));heroCopy.appendChild(el('p','mbc-desc',match[3]));hero.appendChild(heroCopy);
    var searchPanel=el('div','mbc-hero-search');var lab=el('label','','Find a collection on this page');lab.htmlFor='mbc-search';searchPanel.appendChild(lab);
    var line=el('div','mbc-search-line');line.appendChild(el('span','','⌕'));var inp=el('input');inp.id='mbc-search';inp.type='search';inp.placeholder='Search collection names…';line.appendChild(inp);
    var clear=el('button','','Clear');clear.type='button';clear.hidden=true;line.appendChild(clear);searchPanel.appendChild(line);var count=el('small','mbc-search-count','');searchPanel.appendChild(count);hero.appendChild(searchPanel);document.body.insertBefore(hero,header.nextSibling);
    document.body.classList.add('mbc-classic');
    var section=document.querySelector('.WordSection1');var entries=[];
    if(isGuide)document.body.classList.add('mbc-guide-page');
    if(section){
      var tables=Array.prototype.slice.call(section.querySelectorAll('table'));
      var contentTables=tables.filter(function(t){return t.querySelectorAll('tr').length>=6});
      var mainTable=contentTables[0];
      if(name==='index.htm'&&mainTable){
        var legacy=el('details','mbc-legacy-block');legacy.appendChild(el('summary','','Original header, social sharing and backup links'));
        var inner=el('div','mbc-legacy-content');legacy.appendChild(inner);
        while(section.firstChild && section.firstChild!==mainTable)inner.appendChild(section.firstChild);
        section.insertBefore(legacy,mainTable);
      }
      // Classic presentation: group only pre-table Word header content.
      // This leaves all legacy links, icons, table columns and rows unmodified.
      if(!mainTable){var backupIntro=el('div','mbc-classic-intro');while(section.firstChild)backupIntro.appendChild(section.firstChild);section.appendChild(backupIntro);}
      if(name!=='index.htm' && mainTable && mainTable.parentNode===section){
        var classicIntro=el('div','mbc-classic-intro');
        section.insertBefore(classicIntro,mainTable);
        while(section.firstChild && section.firstChild!==classicIntro){
          classicIntro.appendChild(section.firstChild);
        }
      }
      contentTables.forEach(function(table){
        table.classList.add('mbc-library-table');var frame=el('div','mbc-table-frame');var caption=el('div','mbc-table-label');
        var rows=Array.prototype.slice.call(table.querySelectorAll('tr'));
        caption.appendChild(el('span','','▦ COLLECTION INDEX'));caption.appendChild(el('small','',rows.length+' rows · scroll sideways to see all columns ↔'));
        table.parentNode.insertBefore(frame,table);frame.appendChild(caption);frame.appendChild(table);
        Array.prototype.forEach.call(table.querySelectorAll('a[href]'),function(a){
          var t=a.textContent.replace(/\s+/g,' ').trim().toUpperCase();
          var kind={'DOWNLOAD':'download','GH':'gh','JOIN':'join','GO':'go','SEE LIST':'list','SEE FILES':'list','VER LISTA':'list','LISTA':'list','SCARICAMENTO':'download','UNISCITI':'join'}[t];
          if(kind)a.classList.add('mbc-action','mbc-a-'+kind);
        });
        rows.forEach(function(row,i){if(i===0)return;
          var cells=Array.prototype.slice.call(row.children).filter(function(e){return e.tagName==='TD'||e.tagName==='TH'});
          var candidate=cells.find(function(c){var t=c.textContent.replace(/\s+/g,' ').trim();return t.length>12&&t.length<170&&!/^(DOWNLOAD|JOIN|GH|GO|SEE LIST|SEE FILES|COLLECTIONS|UPDATED)$/i.test(t)});
          if(candidate)candidate.classList.add('mbc-collection-title');
          var t=row.textContent.replace(/\s+/g,' ').trim().toLocaleLowerCase();if(t.length>4)entries.push({row:row,text:t});
        });
      });
    }
    if(entries.length){
      var empty=el('div','mbc-ui mbc-no-results','No matching collections found. Try another term.');section.parentNode.insertBefore(empty,section.nextSibling);
      function filter(){var q=inp.value.trim().toLocaleLowerCase();var terms=q.split(/\s+/).filter(Boolean);var total=0;
        entries.forEach(function(x){var ok=!terms.length||terms.every(function(t){return x.text.indexOf(t)>=0});x.row.style.display=ok?'':'none';if(ok)total++});
        count.textContent=q?total+' matching rows':entries.length+' collection rows';clear.hidden=!q;empty.classList.toggle('visible',!!q&&!total);
      }
      inp.addEventListener('input',filter);clear.addEventListener('click',function(){inp.value='';filter();inp.focus()});filter();
      document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();inp.focus();inp.select();}});
    } else {searchPanel.style.display='none';}
    var footer=el('footer','mbc-ui mbc-footer');footer.appendChild(el('span','','Mega Book Collection · Discover · Share · Preserve'));footer.appendChild(link('mirror-guide.html','','Cloning and AI customization guide'));document.body.appendChild(footer);
    } finally {
      // Release the page after its navigation, hero and tables are fully built.
      document.documentElement.classList.remove('mbc-initializing');
      document.documentElement.classList.add('mbc-ready');
      if (window.__mbcRevealFallback) {
        clearTimeout(window.__mbcRevealFallback);
        window.__mbcRevealFallback = null;
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* TXT search loads as a deferred script in the HTML, after this layout script. */
