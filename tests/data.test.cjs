'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
test('V0.8.1 data retains IDs, dates, zero alerts, Bridge flags, jobs and exchanges under the same key',()=>{
 const original={name:'Sébastien',tone:'firm',tasks:[{id:'existing-event-id',title:'Garage 🚗',category:'Maison',done:false,due:'2026-10-16',time:'15:30',duration:90,alert:0,bridgeLaunched:true,calendarExported:true},{id:'completed',title:'CV',category:'Emploi',done:true}],jobs:[{id:'job-id',title:'Entreprise A',link:'https://example.com/offre',status:'Entretien',followup:'2026-10-15'}],coachHistory:[{role:'moi',text:'Mon message'},{role:'coach',text:'Mon conseil'}],coachLastDate:'2026-10-14'};
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').split('const $=id=>')[0];
 const sandbox={crypto,localStorage:{getItem:key=>{assert.equal(key,'momentum.v1');return JSON.stringify(original)}}};
 vm.runInNewContext(source+'\nglobalThis.loaded=state;',sandbox);
 const loaded=JSON.parse(JSON.stringify(sandbox.loaded));
 assert.equal(loaded.name,original.name);assert.equal(loaded.tone,original.tone);assert.deepEqual(loaded.tasks[0],original.tasks[0]);
 assert.equal(loaded.tasks[1].done,true);assert.equal(loaded.tasks[1].id,'completed');
 assert.deepEqual(loaded.jobs,original.jobs);assert.deepEqual(loaded.coachHistory,original.coachHistory);assert.equal(loaded.coachLastDate,original.coachLastDate);
});
