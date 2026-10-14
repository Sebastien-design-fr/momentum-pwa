import {CreateMLCEngine} from 'https://esm.run/@mlc-ai/web-llm@0.2.85';
let engine=null;
self.onmessage=async({data})=>{
 if(data.type==='stop'){engine?.interruptGenerate();return;}
 try{
  if(data.type==='load')engine=await CreateMLCEngine(data.value.model,{initProgressCallback:value=>self.postMessage({id:data.id,type:'progress',value}),logLevel:'WARN'},data.value.config);
  else if(data.type==='generate'){if(!engine)throw Error('Le modèle n’est pas chargé.');const stream=await engine.chat.completions.create(data.value);for await(const value of stream)self.postMessage({id:data.id,type:'chunk',value});}
  else throw Error('Action IA inconnue.');
  self.postMessage({id:data.id,type:'done'});
 }catch{self.postMessage({id:data.id,type:'error',message:'Le moteur IA local n’a pas terminé. Réessaie ou utilise les conseils guidés.'});}
};
