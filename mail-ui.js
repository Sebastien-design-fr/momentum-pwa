(function(root){
 'use strict';
 function mount({$,action,feedback,fieldError,prepare,forget,navigate}){
  const CONFIG='momentum.mail.config.v1';let api=null,connected=false,needsLogin=false,busy=false,bilan=null,accountName='',filter='open',selected='',generation=0,lastRefresh=0,lastSummary='',lastPreparedTitle='';
  const statuses=new Map(),edits=new Map();
  const redirect=new URL('./mail-auth.html',location.href).href;
  $('mail-redirect').textContent=redirect;
  try{$('mail-client-id').value=localStorage.getItem(CONFIG)||'';}catch{}
  function text(node,tag,value,cls){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;node.append(el);return el;}
  function status(t){return statuses.get(t.id)||t.status;}
  function controls(){ $('mail-connect').disabled=busy||!api;$('mail-connect').hidden=(connected&&!needsLogin)||!api;$('mail-connect').textContent=needsLogin?'Reconnecter Outlook':'Connecter Outlook';$('mail-setup-open').hidden=!!api;$('mail-setup-open').disabled=busy;$('mail-disconnect').hidden=!connected;$('mail-disconnect').disabled=busy;$('mail-refresh').hidden=!connected;$('mail-refresh').disabled=busy||!connected;$('mail-save-config').disabled=busy||connected;$('mail-client-id').disabled=connected;$('mail-refresh').textContent=busy?'Chargement…':'Actualiser le bilan';$('mail-account').textContent=connected?'Connecté : '+accountName:'Outlook non connecté';$('mail-body').hidden=!connected||!bilan;$('mail-assist').hidden=!connected||!bilan;$('mail-assist').disabled=busy||!bilan||!connected;}
  async function configure(){
   fieldError('mail-client-id','mail-config-error','');try{
    const id=$('mail-client-id').value.trim();const next=MomentumMail.client({msal:root.msal,clientId:id,redirectUri:redirect});await next.ready;
    localStorage.setItem(CONFIG,id);api=next;$('mail-status').textContent='Configuration enregistrée. Tu peux connecter Outlook.';controls();
   }catch(err){api=null;fieldError('mail-client-id','mail-config-error',err.message==='Indique un identifiant d’application Microsoft valide.'?err.message:'Configuration impossible. Vérifie l’identifiant et le stockage Safari.');controls();}
  }
  action('mail-setup-open',()=>{$('mail-setup').open=true;$('mail-setup').scrollIntoView({behavior:'smooth',block:'start'});});
  action('mail-save-config',configure);
  $('mail-config-form').addEventListener('submit',e=>{e.preventDefault();if(!busy&&!connected)configure();});
  action('mail-connect',async()=>{
   if(busy||!api)return;busy=true;const own=++generation;controls();$('mail-status').textContent='Connexion Microsoft en cours…';
   try{const info=await api.connect();if(own!==generation)return;connected=true;needsLogin=false;accountName=info.name;$('mail-setup').open=false;statuses.clear();edits.clear();bilan=null;busy=false;controls();await refresh();}
   catch{if(own===generation)$('mail-status').textContent='Connexion non terminée. Réessaie et autorise la fenêtre Microsoft. Sur iPhone, essaie aussi depuis Safari.';}
   finally{if(own===generation){busy=false;controls();}}
  });
  action('mail-disconnect',async()=>{
   generation++;if(lastSummary&&$('coach-message').textContent===lastSummary){$('coach-message').textContent='Qu’est-ce qui compte pour toi aujourd’hui ?';$('coach-mode').textContent='Conseils adaptés à ta journée';}if(lastPreparedTitle)forget(lastPreparedTitle);lastSummary='';lastPreparedTitle='';connected=false;needsLogin=false;busy=false;bilan=null;accountName='';statuses.clear();edits.clear();$('mail-list').replaceChildren();$('mail-detail').replaceChildren();$('mail-search').value='';controls();$('mail-status').textContent='Outlook déconnecté. Le bilan et les réponses locales ont été effacés de cette session.';try{await api?.disconnect();}catch{feedback('Session locale fermée. Ferme l’application avant une nouvelle connexion.');api=null;controls();}
  });
  async function refresh(){
   if(!connected||busy)return;busy=true;const own=generation;controls();$('mail-status').textContent=bilan?'Vérification du dernier bilan…':'Lecture du bilan privé Outlook…';
   try{const result=await api.snapshot();if(own!==generation)return;bilan=result;lastRefresh=Date.now();draw();$('mail-status').textContent=result?'Bilan chargé. Dernière vérification des mails : '+dateLabel(result.checkedDate)+'.'+(result.skipped?' Un ancien brouillon de bilan illisible a été ignoré.':''):'Aucun bilan MOMENTUM dans les brouillons Outlook. L’agent quotidien doit y enregistrer son premier bilan.';}
   catch(err){if(own===generation){if(/session Microsoft a expiré/.test(err.message))needsLogin=true;$('mail-status').textContent=err.message+(bilan?' Le bilan précédent reste affiché.':'');}}
   finally{if(own===generation){busy=false;controls();}}
  }
  function dateLabel(date){return new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(new Date(date+'T12:00:00Z'));}
  action('mail-refresh',refresh);
  function draw(){
   controls();if(!bilan)return;
   const stale=bilan.checkedDate<MomentumMail.parisDay();$('mail-freshness').textContent=(stale?'Bilan ancien · ':'Mails vérifiés le ')+dateLabel(bilan.checkedDate);$('mail-freshness').classList.toggle('mail-stale',stale);
   $('mail-open-count').textContent=bilan.tasks.filter(t=>status(t)!=='Traité').length+' à traiter';
   const q=$('mail-search').value.trim().toLocaleLowerCase('fr');$('mail-clear-search').hidden=!q;
   const visible=bilan.tasks.filter(t=>(filter==='all'||filter==='open'&&status(t)!=='Traité'||filter==='reply'&&status(t)==='À répondre'||filter==='done'&&status(t)==='Traité')&&[t.title,t.group,t.detail].join(' ').toLocaleLowerCase('fr').includes(q)).sort((a,b)=>['Haute','Normale','Basse'].indexOf(a.priority)-['Haute','Normale','Basse'].indexOf(b.priority));
   document.querySelectorAll('[data-mail-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mailFilter===filter)));
   $('mail-result-count').textContent=visible.length+' action'+(visible.length>1?'s':'')+' affichée'+(visible.length>1?'s':'');
   const list=$('mail-list');list.replaceChildren();if(!visible.length){text(list,'p',q?'Aucune action ne correspond. Efface la recherche ou choisis Tout.':'Aucune action dans ce filtre. Choisis Tout pour consulter les dossiers.','empty');selected='';$('mail-detail').replaceChildren();return;}
   if(!visible.some(t=>t.id===selected))selected=visible[0].id;
   visible.forEach(t=>{const b=text(list,'button','','mail-item');b.type='button';b.setAttribute('aria-pressed',String(selected===t.id));text(b,'span',t.group+' · '+t.priority,'mail-meta');text(b,'strong',t.title);text(b,'span',status(t),'mail-meta');b.addEventListener('click',()=>{selected=t.id;draw();$('mail-detail-title').focus();});});detail();
  }
  function detail(){
   const t=bilan.tasks.find(t=>t.id===selected),box=$('mail-detail');box.replaceChildren();if(!t)return;
   const heading=text(box,'h2',t.title);heading.id='mail-detail-title';heading.tabIndex=-1;text(box,'p',t.detail,'muted');if(t.date)text(box,'p','Mail reçu le '+dateLabel(t.date.slice(0,10))+' · ce n’est pas une date de rendez-vous.','hint');
   const links=text(box,'div','','actions');for(const [label,url] of [['Ouvrir le mail source ↗',t.source],['Ouvrir le brouillon Outlook ↗',t.draftLink]])if(url){const a=text(links,'a',label,'btn secondary small');a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
   if(t.draft){const label=text(box,'label','Réponse à vérifier');label.htmlFor='mail-draft';const draft=text(box,'textarea','');draft.id='mail-draft';draft.value=edits.get(t.id)??t.draft;draft.rows=9;draft.setAttribute('aria-describedby','mail-draft-note');draft.addEventListener('input',()=>edits.set(t.id,draft.value));const note=text(box,'p','Retouches conservées pendant cette session uniquement. Le brouillon Outlook reste inchangé. Aucun mail envoyé.','hint');note.id='mail-draft-note';const copy=text(box,'button','Copier ma réponse','btn secondary small');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(draft.value);feedback('Réponse copiée. Aucun mail envoyé.');}catch{draft.focus();draft.select();feedback('Sélectionne puis copie le texte avec le menu de ton appareil.');}});}
   const actions=text(box,'div','','actions');const plan=text(actions,'button','Préparer un créneau','btn');plan.type='button';plan.addEventListener('click',()=>{lastPreparedTitle=t.title;prepare(t.title);});
   const done=text(actions,'button',status(t)==='Traité'?'Remettre à traiter':'Marquer comme traité','btn ghost small');done.type='button';done.addEventListener('click',()=>{statuses.set(t.id,status(t)==='Traité'?(t.status==='Traité'?'À vérifier':t.status):'Traité');draw();feedback('Statut modifié dans cette session. Outlook reste inchangé.');});
  }
  $('mail-search').addEventListener('input',draw);action('mail-clear-search',()=>{$('mail-search').value='';draw();$('mail-search').focus();});
  document.querySelectorAll('[data-mail-filter]').forEach(b=>action('mail-filter-'+b.dataset.mailFilter,()=>{filter=b.dataset.mailFilter;draw();}));
  action('mail-assist',()=>{if(!bilan)return;const pending=bilan.tasks.filter(t=>status(t)!=='Traité').sort((a,b)=>['Haute','Normale','Basse'].indexOf(a.priority)-['Haute','Normale','Basse'].indexOf(b.priority));navigate('coach');lastSummary='Ton bilan mail du '+dateLabel(bilan.checkedDate)+' :\n\n'+(pending.slice(0,3).map(t=>'• '+t.title).join('\n')||'Aucune action à traiter.')+'\n\nChoisis un dossier dans Mail pour préparer un créneau. Ce résumé n’est pas enregistré dans l’historique.';$('coach-message').textContent=lastSummary;$('coach-mode').textContent='Priorités du bilan Outlook';});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastRefresh>300000)refresh();});
  setInterval(()=>{if(document.visibilityState==='visible'&&!$('mail').hidden&&Date.now()-lastRefresh>300000)refresh();},60000);
  // Configuration is public; tokens, bodies and edits never enter localStorage or backups.
  if($('mail-client-id').value)configure();else controls();
 }
 root.MomentumMailUI={mount};
})(window);
