(function(root){
 'use strict';
 const SUBJECT='MOMENTUM Mail — bilan privé',MARKER='MOMENTUM_MAIL_V1',GRAPH='https://graph.microsoft.com/v1.0/';
 const clip=(x,n)=>typeof x==='string'?x.slice(0,n):'';
 function safeLink(x){try{const u=new URL(x);return u.protocol==='https:'&&['outlook.live.com','outlook.office.com','outlook.office365.com'].includes(u.hostname)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function parisDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
 function parseSnapshot(body){
  if(typeof body!=='string'||body.length>400000)throw Error('Le bilan Outlook est trop volumineux ou invalide.');
  const text=body.trim();if(!text.startsWith(MARKER+'\n')&&!text.startsWith(MARKER+'\r\n'))throw Error('Ce brouillon ne contient pas un bilan MOMENTUM.');
  let x;try{const payload=text.slice(MARKER.length).trim();const decoded=payload.startsWith('{')?payload:new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(payload.replace(/\s/g,'')),c=>c.charCodeAt(0)));x=JSON.parse(decoded);}catch{throw Error('Le bilan Outlook est illisible.');}
  if(x.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(x.checkedDate||'')||!Number.isFinite(Date.parse(x.checkedDate+'T12:00:00Z'))||new Date(x.checkedDate+'T12:00:00Z').toISOString().slice(0,10)!==x.checkedDate||!Number.isFinite(Date.parse(x.generatedAt))||!Array.isArray(x.tasks)||x.tasks.length>200)throw Error('Le format du bilan Outlook est invalide.');
  const seen=new Set(),tasks=x.tasks.map(t=>{
   if(!t||typeof t!=='object'||typeof t.id!=='string'||!t.id||t.id.length>180||typeof t.title!=='string'||!t.title.trim()||seen.has(t.id))throw Error('Le bilan contient des actions invalides ou en double.');seen.add(t.id);
   return {id:clip(t.id,180),title:clip(t.title,250),group:clip(t.group,120),detail:clip(t.detail,3000),priority:['Haute','Normale','Basse'].includes(t.priority)?t.priority:'Normale',status:['À répondre','À vérifier','À faire','Traité'].includes(t.status)?t.status:'À vérifier',source:safeLink(t.source),draftLink:safeLink(t.draftLink),draft:clip(t.draft,10000),date:Number.isFinite(Date.parse(t.date))?t.date:''};
  });
  return {version:1,checkedDate:x.checkedDate,generatedAt:x.generatedAt,tasks};
 }
 function client({msal,fetcher=fetch,clientId,redirectUri}){
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clientId||''))throw Error('Indique un identifiant d’application Microsoft valide.');
  const pca=new msal.PublicClientApplication({auth:{clientId,authority:'https://login.microsoftonline.com/common',redirectUri},cache:{cacheLocation:'memoryStorage'},system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}},popupBridgeTimeout:90000,iframeBridgeTimeout:15000}});
  const ready=pca.initialize();let account=null,epoch=0;
  const scopes=['https://graph.microsoft.com/Mail.Read'];
  async function connect(){await ready;const generation=epoch;const result=await pca.loginPopup({scopes,prompt:'select_account'});if(generation!==epoch)throw Error('Connexion annulée.');account=result.account;if(!account)throw Error('Microsoft n’a pas confirmé la connexion.');return {name:account.name||account.username||'Compte Microsoft'};}
  async function disconnect(){epoch++;account=null;await ready;await pca.clearCache();}
  async function snapshot(){
   await ready;if(!account)throw Error('Connecte Outlook pour lire ton bilan.');const generation=epoch;
   let auth;try{auth=await pca.acquireTokenSilent({scopes,account});}catch{throw Error('La session Microsoft a expiré. Reconnecte Outlook.');}
   async function get(url){
    const u=new URL(url);if(u.origin!=='https://graph.microsoft.com'||u.username||u.password||u.pathname!=='/v1.0/me/mailFolders/drafts/messages')throw Error('Adresse Outlook refusée.');
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);let response;
    try{response=await fetcher(u.href,{headers:{Authorization:'Bearer '+auth.accessToken,Prefer:'outlook.body-content-type="text"'},cache:'no-store',signal:abort.signal,redirect:'error'});}catch{throw Error('Outlook est inaccessible. Vérifie ta connexion puis réessaie.');}finally{clearTimeout(timer);}
    if(generation!==epoch)throw Error('Connexion Outlook fermée.');
    if(!response.ok){if(response.status===401)throw Error('La session Microsoft a expiré. Reconnecte Outlook.');if(response.status===403)throw Error('Microsoft refuse la lecture des mails. Vérifie l’autorisation Mail.Read.');if(response.status===429)throw Error('Outlook reçoit trop de demandes. Réessaie dans quelques minutes.');throw Error('Outlook n’a pas pu charger le bilan. Réessaie.');}
    const json=await response.json();if(generation!==epoch)throw Error('Connexion Outlook fermée.');return json;
   }
   const query=new URLSearchParams({'$filter':"isDraft eq true and subject eq '"+SUBJECT+"'",'$select':'id,lastModifiedDateTime,body,isDraft,subject','$top':'25'});
   let next=GRAPH+'me/mailFolders/drafts/messages?'+query,items=[],pages=0;
   while(next){if(++pages>20)throw Error('Trop de bilans Outlook à parcourir. Aucun bilan partiel affiché.');const data=await get(next);if(!Array.isArray(data.value))throw Error('La réponse Outlook est invalide.');items.push(...data.value);next=data['@odata.nextLink']||'';}
   if(!items.length)return null;
   const snapshots=[];let skipped=0;for(const message of items){try{
    if(!message.isDraft||message.subject!==SUBJECT||message.body?.contentType?.toLowerCase()!=='text')throw Error('Le bilan Outlook n’est pas un brouillon texte valide.');
    snapshots.push(parseSnapshot(message.body.content));
   }catch{skipped++;}}
   if(!snapshots.length)throw Error('Aucun bilan Outlook valide. L’agent doit recréer le bilan.');
   // Opening or editing an older draft must not replace a newer generated report.
   snapshots.sort((a,b)=>Date.parse(b.generatedAt)-Date.parse(a.generatedAt));
   return {...snapshots[0],skipped};
  }
  return {ready,connect,disconnect,snapshot};
 }
 const api={SUBJECT,MARKER,safeLink,parisDay,parseSnapshot,client};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MomentumMail=api;
})(typeof window==='undefined'?globalThis:window);
