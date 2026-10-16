'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../coach.js'),P=require('../planner.js');
const now=new Date(2026,9,16,12);
const state=()=>({tone:'balanced',tasks:[{title:'Appeler le garage',category:'Maison',due:'2026-10-13',done:false},{title:'Adapter mon CV',category:'Emploi',done:false}],jobs:[{title:'Entreprise fictive',status:'Envoyée',followup:'2026-10-14'}],coachHistory:[]});
for(const [question,topic] of [
 ['Quelle est la différence entre une habitude et une tâche ?','habits'],
 ['Comment me remettre à la lecture régulièrement ?','habits'],
 ['Je suis fatigué et je ne veux pas parler de boulot.','energy'],
 ['Rédige un message pour refuser poliment une invitation.','writing'],
 ['Comment préparer mon entretien ?','employment'],
 ['Bonjour','greeting'],
 ['Que faire en priorité parmi mes actions ?','priorities'],
 ['Comment améliorer mon CV ?','cv']
])test('recognizes the actual subject: '+question,()=>assert.equal(C.intent(question,state()).topic,topic));
test('asking for advice is not mistaken for asking for a capabilities list',()=>{assert.equal(C.intent('Que peux-tu me conseiller pour reprendre la lecture ?',state()).topic,'habits');assert.equal(C.directReply(state(),'Que peux-tu me conseiller pour reprendre la lecture ?',now),null);assert.equal(C.intent('Je dois me remotiver',state()).topic,'energy');});
test('unrelated questions never receive tasks, followups or a canned guided answer inside the prompt',()=>{for(const question of ['Quelle est la différence entre une habitude et une tâche ?','Rédige un message pour refuser une invitation.','Je suis fatigué.','Explique la différence entre urgent et important.']){const s=state(),prompt=C.messages(s,question,now)[0].content;assert.doesNotMatch(prompt,/Appeler le garage|Adapter mon CV|Entreprise fictive|Piste guidée/);assert.doesNotMatch(C.localReply(s,question,now),/garage|Entreprise fictive/);}});
test('personal priorities are grounded, exclude finished tasks and respect exclusion of work',()=>{const s=state();s.tasks[0].done=true;s.tasks.push({title:'Ranger un tiroir',category:'Maison',done:false});const x=C.requestContext(s,'Mes priorités, sans parler de travail',now);assert.deepEqual(x.tasks.map(t=>t.title),['Ranger un tiroir']);assert.equal(x.pendingTaskCount,1);assert.doesNotMatch(JSON.stringify(x),/CV|Entreprise fictive|garage/);});
test('employment explanations and interview preparation do not turn into an unrelated followup',()=>{assert.doesNotMatch(C.localReply(state(),'Comment préparer mon entretien ?',now),/Entreprise fictive|date de suivi/);assert.match(C.localReply(state(),'Comment préparer mon entretien ?',now),/exemples réels/);assert.equal(C.requestContext(state(),'Comment préparer mon entretien ?',now).followups,undefined);});
test('a short followup retains the original subject and coherent previous messages',()=>{const s=state();s.coachHistory=[{role:'moi',text:'Comment me remettre à la lecture ?'},{role:'coach',text:'Lis deux pages après le petit déjeuner.'},{role:'moi',text:'Plus concret ?'}];assert.equal(C.intent('Plus concret ?',s).topic,'habits');const m=C.messages(s,'Plus concret ?',now);assert.equal(m.at(-1).content,'Plus concret ?');assert.ok(m.some(t=>t.content.includes('Lis deux pages')));assert.equal(m.filter(t=>t.content==='Plus concret ?').length,1);});
test('no invented CV facts or automatic email/Calendar capability',()=>{const s=state();assert.match(C.directReply(s,'Rédige mon CV complet',now),/faits réels/);s.coachHistory=[{role:'coach',text:'Tu as dix ans de direction et un MBA.'}];assert.match(C.directReply(s,'Rédige mon CV complet',now),/faits réels/);assert.match(C.directReply(s,'Peux-tu envoyer un mail ?',now),/ne peut pas envoyer/);assert.match(C.directReply(s,'Peux-tu modifier mon calendrier ?',now),/ne peux pas consulter ni modifier/);assert.match(C.directReply(s,'Combien de jours mon habitude a été accomplie ?',now),/pas encore disponible/);});
test('ordinary coaching and dated questions never become accidental calendar commands',()=>{assert.equal(P.isRequest('Je dois me remotiver'),false);assert.equal(P.isRequest('Il faut que je trouve un meilleur rythme'),false);assert.equal(P.isRequest('Je dois appeler le garage demain à 15h'),true);assert.equal(P.isScheduleFollowup('Demain à 15h, pendant 30 minutes'),true);assert.equal(P.isScheduleFollowup('Finalement demain à 16h'),true);assert.equal(P.isScheduleFollowup('Demain, comment améliorer ma motivation ?'),false);});
test('history and current request remain bounded without copying an old guided suggestion',()=>{const s=state();s.coachHistory=Array.from({length:30},(_,i)=>({role:i%2?'coach':'moi',text:'Une phrase '.repeat(200)}));const m=C.messages(s,'Question actuelle',now);assert.ok(m.slice(1,-1).reduce((n,t)=>n+t.content.length,0)<=2000);assert.equal(m.at(-1).content,'Question actuelle');assert.doesNotMatch(m[0].content,/Piste guidée/);});

test('short rewrite constraints inherit the writing topic across multiple turns',()=>{
 const state={coachHistory:[{role:'moi',text:'Rédige un message pour reporter un café.'},{role:'coach',text:'Un brouillon.'},{role:'moi',text:'Moins formel, deux phrases.'},{role:'coach',text:'Autre brouillon.'}]};
 assert.equal(C.intent('Non, je veux décliner, pas reporter.',state).topic,'writing');
 assert.match(C.messages(state,'Non, je veux décliner, pas reporter.')[0].content,/donne uniquement le texte demandé/);
});
