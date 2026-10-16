'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function app({failStorage=false,fetchFn}={}){
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),nodes=new Map(),urls=[],alerts=[];let id=0;
 class Element{constructor(){this.value='';this.hidden=false;this.dataset={};this.style={};this.children=[];this.events={};this.textContent='';this.classList={add(){},toggle(){}};}addEventListener(n,f){this.events[n]=f;}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(){}removeAttribute(){}focus(){}scrollIntoView(){}querySelector(){return this.submit||(this.submit=new Element());}async fire(n,event={}){const e={preventDefault(){},...event};if(n==='click'&&this.id)return await sandbox.window.MomentumActions.run(this,e);await this.events[n]?.(e);}}
 for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],Object.assign(new Element(),{id:m[1]}));
 const nav=['home','tasks','coach','jobs','settings'].map(id=>Object.assign(new Element(),{dataset:{nav:id}})),prompts=['blocked','low','job','win'].map(id=>Object.assign(new Element(),{dataset:{coach:id}}));
 const document={getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),querySelectorAll:s=>s==='.screen'?nav.map(n=>Object.assign(nodes.get(n.dataset.nav),{id:n.dataset.nav})):s==='[data-nav]'?nav:s==='[data-coach]'?prompts:[]};
 let data=JSON.stringify({name:'Test',tone:'balanced',tasks:[],jobs:[],coachHistory:[],coachLastDate:'2026-10-14'});
 const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[2026,9,14,10]));}static now(){return new FixedDate().getTime();}}
 const location={protocol:'https:',assign:url=>{assert.equal(JSON.parse(data).tasks.length,1,'persist before Apple launch');urls.push(url);}};
 const sandbox={fetch:fetchFn,clearTimeout(){},document,Date:FixedDate,Intl,URL,URLSearchParams,AbortSignal,AbortController,crypto:{randomUUID:()=>`test-id-${++id}`},navigator:{},localStorage:{getItem:key=>{assert.equal(key,'momentum.v1');return data;},setItem:(key,value)=>{assert.equal(key,'momentum.v1');if(failStorage)throw Error('quota');data=value;}},window:{location,scrollTo(){},addEventListener(){}},location,alert:s=>alerts.push(s),confirm:()=>true,setTimeout(){},console};
 vm.createContext(sandbox);for(const file of ['bridge.js','planner.js','coach.js','online-coach.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox,{filename:file});
 return {nodes,urls,alerts,stored:()=>JSON.parse(data),memory:()=>JSON.parse(vm.runInContext('JSON.stringify(state)',sandbox)),send:async text=>{nodes.get('coach-input').value=text;await nodes.get('coach-form').fire('submit');}};
}
test('chat prepares but never writes a task or Calendar event before one confirmation',async()=>{
 const a=app();await a.send('Ajoute appeler le garage demain à 15h pendant 30 minutes avec une alerte 15 minutes avant');
 assert.equal(a.stored().tasks.length,0);assert.equal(a.urls.length,0);assert.equal(a.nodes.get('coach-draft').hidden,false);assert.equal(a.nodes.get('draft-title').value,'appeler le garage');assert.equal(a.nodes.get('draft-date').value,'2026-10-15');assert.equal(a.nodes.get('draft-time').value,'15:00');assert.equal(a.nodes.get('draft-confirm').disabled,false);
 await a.nodes.get('draft-confirm').fire('click');assert.equal(a.stored().tasks.length,1);assert.equal(a.urls.length,1);
 const url=new URL(a.urls[0]);assert.equal(url.protocol,'shortcuts:');assert.equal(url.searchParams.get('name'),'MOMENTUM Bridge');const payload=JSON.parse(url.searchParams.get('text'));assert.equal(payload.title,'appeler le garage');assert.equal(payload.duration,30);assert.equal(payload.alert,15);assert.match(payload.start,/2026-10-15 15:00/);
 assert.equal(a.stored().tasks[0].bridgeLaunched,true);await a.nodes.get('draft-confirm').fire('click');assert.equal(a.urls.length,1);
 await a.send('Ajoute appeler le garage demain à 15h pendant 30 minutes');await a.nodes.get('draft-confirm').fire('click');assert.equal(a.stored().tasks.length,1);assert.equal(a.urls.length,1);assert.match(a.nodes.get('draft-status').textContent,/existe déjà/);
});
test('follow-up fills missing fields, edited zero alert survives, cancellation never creates anything',async()=>{
 const a=app();await a.send('Ajoute appeler le garage');assert.equal(a.nodes.get('draft-confirm').disabled,true);
 await a.send('demain à 15h');assert.equal(a.nodes.get('draft-title').value,'appeler le garage');assert.equal(a.nodes.get('draft-confirm').disabled,false);
 a.nodes.get('draft-alert').value='0';await a.nodes.get('draft-alert').fire('input');assert.equal(a.nodes.get('draft-confirm').disabled,false);
 await a.nodes.get('draft-confirm').fire('click');assert.equal(a.stored().tasks[0].alert,0);
 const b=app();await b.send('Ajoute le garage demain à 15h');await b.nodes.get('draft-cancel').fire('click');await b.nodes.get('draft-confirm').fire('click');assert.equal(b.urls.length,0);assert.equal(b.stored().tasks.length,0);
});
test('storage failure prevents Calendar launch and restores the task list',async()=>{
 const a=app({failStorage:true});await a.send('Ajoute appeler le garage demain à 15h');await a.nodes.get('draft-confirm').fire('click');
 assert.equal(a.urls.length,0);assert.equal(a.memory().tasks.length,0);assert.equal(a.stored().tasks.length,0);assert.match(a.nodes.get('draft-status').textContent,/Enregistrement impossible/);
});

test('a negated follow-up cancels a pending proposal without Calendar dispatch',async()=>{const a=app();await a.send('Ajoute appeler le garage demain à 15h');await a.send('Ne programme pas cette action demain à 16h');assert.equal(a.nodes.get('coach-draft').hidden,true);await a.nodes.get('draft-confirm').fire('click');assert.equal(a.urls.length,0);assert.equal(a.stored().tasks.length,0);});

test('a coaching intention does not open a calendar proposal or create a task',async()=>{const a=app();await a.send('Je dois me remotiver');assert.equal(a.nodes.get('draft-title').value,'');assert.doesNotMatch(a.nodes.get('coach-message').textContent,/préparé une proposition de créneau/);assert.equal(a.stored().tasks.length,0);assert.equal(a.urls.length,0);});
test('a dated coaching question leaves a pending calendar proposal unchanged',async()=>{const a=app();await a.send('Ajoute appeler le garage demain à 15h');await a.send('Demain, comment améliorer ma motivation ?');assert.equal(a.nodes.get('draft-title').value,'appeler le garage');assert.equal(a.nodes.get('draft-time').value,'15:00');assert.doesNotMatch(a.nodes.get('coach-message').textContent,/préparé une proposition/);assert.equal(a.stored().tasks.length,0);assert.equal(a.urls.length,0);});
test('personal writing asks for real facts instead of inventing a career or saving an event',async()=>{const a=app();await a.send('Rédige mon CV complet');assert.match(a.nodes.get('coach-message').textContent,/faits réels/);assert.equal(a.stored().tasks.length,0);assert.equal(a.urls.length,0);});

test('online consent is explicit, cooldown preserves input, and calendar commands remain local',async()=>{
 let calls=0;const a=app({fetchFn:async()=>{calls++;return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:'Merci pour ton invitation. Je ne pourrai pas venir.'}}]})}}});
 await a.nodes.get('coach-ai-enable').fire('click');await a.send('Bonjour');assert.equal(calls,0);
 a.nodes.get('coach-cloud-consent').checked=true;await a.nodes.get('coach-ai-enable').fire('click');assert.equal(calls,0);
 await a.send('Rédige un refus poli.');assert.equal(calls,1);assert.match(a.nodes.get('coach-message').textContent,/Merci pour ton invitation/);
 const before=a.stored().coachHistory.length;await a.send('Plus chaleureux.');assert.equal(calls,1);assert.equal(a.nodes.get('coach-input').value,'Plus chaleureux.');assert.equal(a.stored().coachHistory.length,before);
 await a.send('Ajoute appeler le garage demain à 15h');assert.equal(calls,1);assert.equal(a.nodes.get('coach-draft').hidden,false);assert.equal(a.urls.length,0); a.nodes.get('coach-cloud-consent').checked=false;await a.nodes.get('coach-cloud-consent').fire('change');assert.match(a.nodes.get('coach-mode').textContent,/hors ligne/);await a.send('Rédige un autre message');assert.equal(calls,1);
});
