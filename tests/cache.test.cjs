'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('activation removes only obsolete MOMENTUM caches',async()=>{
 const handlers={},deleted=[];
 const self={addEventListener:(name,cb)=>handlers[name]=cb,clients:{claim:async()=>{}},location:{origin:'https://example.test'}};
 const caches={keys:async()=>['momentum-v8','momentum-v8-bridge-1','momentum-v8-bridge-2','another-pwa'],delete:async key=>deleted.push(key)};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),{self,caches,URL});
 let activation;handlers.activate({waitUntil:p=>activation=p});await activation;
 assert.deepEqual(deleted,['momentum-v8','momentum-v8-bridge-1']);
});
