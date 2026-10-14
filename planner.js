'use strict';
(function(root){
 const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase();
 const amount=s=>({un:1,une:1,deux:2}[s]??Number(s));
 function isRequest(text){
  const s=normalize(text).trim();
  if(/\b(?:ne|n')\s*(?:\w+\s+){0,3}(?:ajout|planifi|programm)|\b(?:ajoute|programme|planifie)\s+pas\b/.test(s))return false;
  return /^(?:(?:peux[- ]tu|tu peux|je voudrais|j'aimerais|est-ce que tu peux)\s+)?(?:ajoute|ajouter|programme|programmer|planifie|planifier|prevois|prevoir|rappelle[- ]moi|rappeler|note|mets|il faut que je|je dois)\b/.test(s);
 }
 function parse(text,now=new Date(),base=null){
  // Normalized indexes map back to original characters so titles retain accents.
  let s='',map=[],offset=0;for(const ch of String(text)){const n=normalize(ch);for(let i=0;i<n.length;i++){s+=n[i];map.push([offset,offset+ch.length]);}offset+=ch.length;}
  const spans=[],found={},issues=[];
  const remove=m=>{if(m?.[0])spans.push([map[m.index][0],map[m.index+m[0].length-1][1]]);};
  const find=re=>{const m=s.match(re);if(m)remove(m);return m;};
  const iso=find(/\b(?:le\s+)?(\d{4})-(\d{2})-(\d{2})\b/);
  const numeric=!iso&&find(/\b(?:le\s+)?(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}))?\b/);
  const months=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
  const named=!iso&&!numeric&&find(new RegExp('\\b(?:le\\s+)?(\\d{1,2})\\s+('+months.join('|')+')(?:\\s+(\\d{4}))?\\b'));
  if(iso)found.day=`${iso[1]}-${iso[2]}-${iso[3]}`;
  if(numeric)found.day=`${numeric[3]||now.getFullYear()}-${numeric[2].padStart(2,'0')}-${numeric[1].padStart(2,'0')}`;
  if(named)found.day=`${named[3]||now.getFullYear()}-${String(months.indexOf(named[2])+1).padStart(2,'0')}-${named[1].padStart(2,'0')}`;
  if(!found.day){
   const inDays=find(/\bdans\s+(\d{1,3})\s+jours?\b/);if(inDays)found.day=day(new Date(now.getFullYear(),now.getMonth(),now.getDate()+Number(inDays[1]),12));
   const relative=!inDays&&find(/\b(?:apres[- ]demain|demain|aujourd'hui)\b/);
   if(relative){const delta=/apres/.test(relative[0])?2:relative[0]==='demain'?1:0;found.day=day(new Date(now.getFullYear(),now.getMonth(),now.getDate()+delta,12));}
   else if(!inDays){const weekdays=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];const weekday=find(new RegExp('\\b('+weekdays.join('|')+')(?:\\s+prochain)?\\b'));
    if(weekday){let delta=(weekdays.indexOf(weekday[1])-now.getDay()+7)%7;if(!delta&&/prochain/.test(weekday[0]))delta=7;found.day=day(new Date(now.getFullYear(),now.getMonth(),now.getDate()+delta,12));}}
  }
  const clock=find(/\b(?:a|vers)\s*(\d{1,2})(?::(\d{2})|\s*h(?:eures?)?(?:\s*(\d{1,2})(?:\s*min(?:utes?)?)?)?)(?!\d)/);
  if(clock)found.clock=`${clock[1].padStart(2,'0')}:${String(clock[2]||clock[3]||0).padStart(2,'0')}`;
  const duration=find(/\b(?:pendant|pour une duree de|duree(?: de)?|durant)\s+(\d+|une?|deux)\s*(minutes?|min\b|h(?:eures?)?)(?:\s*(\d{1,2})\s*(?:min(?:utes?)?)?)?/);
  if(duration)found.duration=amount(duration[1])*(duration[2].startsWith('h')?60:1)+Number(duration[3]||0);
  const alert=find(/\b(?:(?:avec\s+)?(?:une?\s+)?(?:alerte|rappel)(?:\s+de)?\s+)?(\d+|une?|deux)\s*(minutes?|min\b|heures?|h\b|jours?)\s+avant\b/);
  const atStart=!alert&&find(/\b(?:avec\s+)?(?:une?\s+)?(?:alerte|rappel)\s+(?:au debut|a l'heure)\b/);
  if(alert)found.alert=amount(alert[1])*(alert[2].startsWith('h')?60:alert[2].startsWith('j')?1440:1);
  if(atStart)found.alert=0;
  const prefix=s.match(/^(?:(?:peux[- ]tu|tu peux|je voudrais|j'aimerais|est-ce que tu peux)\s+)?(?:ajoute|ajouter|programme|programmer|planifie|planifier|prevois|prevoir|rappelle[- ]moi|rappeler|note|mets|il faut que je|je dois)\b(?:[- ]moi)?(?:\s+(?:dans|au)\s+(?:mon\s+)?(?:calendrier|agenda))?(?:\s+(?:une?|la)\s+(?:tache|action|rendez[- ]vous|evenement))?(?:\s+(?:de\b|d'))?\s*[:,-]?\s*/);remove(prefix);
  const suffix=s.match(/\s+(?:dans|au)\s+(?:mon\s+)?(?:calendrier|agenda)\b/);remove(suffix);
  // Merge spans before removing them, including overlapping date/time fields.
  spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const span of spans){if(merged.length&&span[0]<=merged.at(-1)[1])merged.at(-1)[1]=Math.max(merged.at(-1)[1],span[1]);else merged.push([...span]);}
  let title=String(text);for(const [start,end] of merged.reverse())title=title.slice(0,start)+' '+title.slice(end);
  title=title.replace(/\s+/g,' ').replace(/^[\s,:;.-]+|[\s,:;.-]+$/g,'').trim();
  if(base&&!isRequest(text))title=base.title;
  const c={title:title.slice(0,120),day:base?.day||'',clock:base?.clock||'',duration:base?.duration??60,alert:base?.alert??30,category:base?.category||(/emploi|candidat|\bcv\b|annonce|entretien/.test(s)?'Emploi':/marche|sport|medit|repos/.test(s)?'Bien-être':'Maison'),...found};
  if(found.duration!==undefined&&![30,60,90,120].includes(found.duration))issues.push('Choisis une durée disponible : 30, 60, 90 ou 120 minutes.');
  if(found.alert!==undefined&&![0,15,30,60,1440].includes(found.alert))issues.push('Choisis une alerte disponible : au début, 15 ou 30 minutes, 1 heure ou 1 jour avant.');
  c.weather=/quand il fera beau|meteo|quand il ne pleuvra pas/.test(s);
  c.negated=/\b(?:ne|n')\s*(?:\w+\s+){0,3}(?:ajout|planifi|programm)|\b(?:ajoute|programme|planifie)\s+pas\b/.test(s);c.hasSchedule=Object.keys(found).length>0;c.issues=issues;return c;
 }
 function validate(c,now=new Date()){
  if(!String(c.title||'').trim())throw Error('Indique le nom de l’action.');
  if(!c.day)throw Error('Quel jour veux-tu prévoir cette action ?');
  if(!c.clock)throw Error('À quelle heure veux-tu commencer ?');
  const start=new Date(c.day+'T'+c.clock+':00');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(c.day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.clock)||Number.isNaN(start.getTime())||day(start)!==c.day||`${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`!==c.clock)throw Error('Cette date ou cette heure n’existe pas. Corrige le créneau.');
  if(start<=now)throw Error('Ce créneau est déjà passé. Choisis une date et une heure à venir.');
  if(![30,60,90,120].includes(Number(c.duration)))throw Error('Choisis une durée disponible : 30, 60, 90 ou 120 minutes.');
  if(c.alert==null||c.alert===''||![0,15,30,60,1440].includes(Number(c.alert)))throw Error('Choisis une alerte disponible.');
  return {...c,title:c.title.trim().slice(0,120),duration:Number(c.duration),alert:Number(c.alert)};
 }
 const same=(a,b)=>normalize(a.title||'').trim()===normalize(b.title||'').trim()&&a.due===(b.day||b.due)&&a.time===(b.clock||b.time);
 const api={isRequest,parse,validate,same};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MomentumPlanner=api;
})(globalThis);
