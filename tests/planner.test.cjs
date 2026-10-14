const test=require('node:test'),assert=require('node:assert/strict');
const {parse,validate,isRequest,same}=require('../planner.js');
const now=new Date(2026,9,14,10);
test('single calendar request extracts accent-preserving title, day, clock, duration and alert',()=>{
 const c=parse('Ajoute appeler le garage demain à 15 h, pendant 30 minutes, avec une alerte 15 minutes avant.',now);
 assert.equal(c.title,'appeler le garage');assert.equal(c.day,'2026-10-15');assert.equal(c.clock,'15:00');assert.equal(c.duration,30);assert.equal(c.alert,15);assert.equal(validate(c,now).alert,15);
});
test('Unicode titles, explicit dates, midnight and zero alert remain exact',()=>{
 const c=parse('Peux-tu ajouter la tâche Réviser mon CV 🚗 le 16 octobre 2026 à 00:00 pendant 1h30 avec une alerte au début',now);
 assert.equal(c.title,'Réviser mon CV 🚗');assert.equal(c.day,'2026-10-16');assert.equal(c.clock,'00:00');assert.equal(c.duration,90);assert.equal(c.alert,0);
 assert.equal(parse('Ajoute déjeuner 🚗 demain à 15h30',now).title,'déjeuner 🚗');
});
test('requests, negations and coaching questions are distinguished',()=>{
 assert.equal(isRequest('Ajoute appeler le garage demain'),true);assert.equal(isRequest("Rappelle-moi d’appeler le garage"),true);
 assert.equal(isRequest("N’ajoute pas de tâche"),false);assert.equal(isRequest('Ne programme pas cette action'),false);
 assert.equal(isRequest('Je suis fatigué'),false);assert.equal(isRequest('Comment améliorer mon CV ?'),false);
});
test('missing dates or times remain unset and ask for clarification',()=>{
 const c=parse('Ajoute appeler le garage',now);assert.equal(c.day,'');assert.equal(c.clock,'');assert.throws(()=>validate(c,now),/Quel jour/);
 const follow=parse('demain à 15h30 pendant 1 heure',now,c);assert.equal(follow.title,'appeler le garage');assert.equal(follow.day,'2026-10-15');assert.equal(follow.duration,60);assert.doesNotThrow(()=>validate(follow,now));
 assert.throws(()=>validate({...follow,clock:''},now),/quelle heure/);
});
test('past and impossible dates, DST gaps and unsupported lengths are rejected, never rounded',()=>{
 assert.throws(()=>validate(parse('Ajoute garage 13/10/2026 à 15h',now),now),/passé/);
 assert.throws(()=>validate(parse('Ajoute garage 31/02/2027 à 15h',now),now),/existe pas/);
 assert.throws(()=>validate(parse('Ajoute garage 2027-03-28 à 02h30',now),now),/existe pas/);
 const c=parse('Ajoute garage demain à 15h pendant 45 minutes',now);assert.equal(c.duration,45);assert.throws(()=>validate(c,now),/durée/);
 assert.throws(()=>validate(parse('Ajoute garage demain à 25h',now),now),/existe pas/);
});
test('relative days, weekday and year are deterministic in local timezone',()=>{
 assert.equal(parse('Ajoute garage après-demain à 15h',now).day,'2026-10-16');assert.equal(parse('Ajoute garage dans 3 jours à 15h',now).day,'2026-10-17');
 assert.equal(parse('Ajoute garage vendredi à 15h',now).day,'2026-10-16');assert.equal(parse('Ajoute garage 02/01/2027 à 15h',now).day,'2027-01-02');
 assert.equal(parse('Ajouter mon rendez-vous demain à 15h',now).title,'mon rendez-vous');
});
test('same title and start blocks duplicate creation even if accents or case differ',()=>{
 assert.equal(same({title:'Réviser CV',due:'2026-10-15',time:'15:00'},{title:'reviser cv',day:'2026-10-15',clock:'15:00'}),true);
 assert.equal(same({title:'Garage',due:'2026-10-15',time:'15:00'},{title:'Garage',day:'2026-10-16',clock:'15:00'}),false);
});

test('spoken durations and compact hour syntax preserve the title',()=>{const c=parse('Ajoute déjeuner demain à15h pendant une heure avec un rappel un jour avant',now);assert.equal(c.title,'déjeuner');assert.equal(c.clock,'15:00');assert.equal(c.duration,60);assert.equal(c.alert,1440);assert.doesNotThrow(()=>validate(c,now));});
