import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssistantHandler } from '../supabase/functions/asistente-ia/handler.ts';

const env = name => ({SUPABASE_URL:'https://db.example',SUPABASE_ANON_KEY:'public-test',GEMINI_API_KEY:'provider-test'})[name];
function setup(role='OPERADOR', options={}) {
  const calls=[];
  let providerBody;
  const handler=createAssistantHandler({env:name=>name==='GEMINI_MODEL'?options.model:env(name),fetcher:async (url,init={})=>{
    calls.push({url,init});
    if(url.endsWith('/auth/v1/user'))return Response.json({id:'verified-user',email_confirmed_at:'2026-10-29'});
    if(url.endsWith('/rpc/don_ricardo_role')) return Response.json(role);
    if(url.endsWith('/rpc/consumir_cuota_ia')) return Response.json(options.quota??0);
    if(url.endsWith('/rpc/resumen_asistente_ia')) return options.summaryFail ? new Response('',{status:403}) : Response.json({rol:role,total_lotes:42,alcance:'Lotes autorizados',por_estado:{EN_CAMPO:42}});
    if(url.startsWith('https://generativelanguage.googleapis.com/')){
      if(options.providerError) throw options.providerError;
      if(options.providerStatus) return new Response('provider-private-response', {status:options.providerStatus});
      providerBody=JSON.parse(init.body);
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Tienes 42 lotes autorizados.'}]}}]});
    }
    throw Error('Unexpected request: '+url);
  }});
  const request=()=>new Request('https://edge.example',{method:'POST',headers:{Authorization:'Bearer caller-jwt','Content-Type':'application/json'},body:JSON.stringify({question:'¿Cuántos lotes hay?',lotId:null})});
  return {handler,request,calls,get providerBody(){return providerBody;}};
}
for(const role of ['ADMIN','SUPERVISOR','OPERADOR']) test(`summary follows caller JWT for ${role} without selecting a lot`,async()=>{
  const s=setup(role);const result=await s.handler(s.request());assert.equal(result.status,200);
  const call=s.calls.find(x=>x.url.endsWith('/rpc/resumen_asistente_ia'));
  assert.equal(call.init.headers.Authorization,'Bearer caller-jwt');
  assert.equal(call.init.headers.apikey,'public-test');
  const payload=JSON.parse(s.providerBody.contents[0].parts[0].text);
  assert.equal(payload.resumen_operativo.total_lotes,42);
  assert.equal(payload.resumen_operativo.rol,role);
  assert.equal(payload.lote_registrado,null);
});
test('inactive role cannot fetch summaries or contact the provider',async()=>{
  const s=setup(null);assert.equal((await s.handler(s.request())).status,403);
  assert.equal(s.calls.some(x=>x.url.endsWith('/rpc/resumen_asistente_ia')),false);
  assert.equal(s.providerBody,undefined);
});
test('quota rejection prevents summary and model requests',async()=>{
  const s=setup('OPERADOR',{quota:60});assert.equal((await s.handler(s.request())).status,429);
  assert.equal(s.calls.some(x=>x.url.endsWith('/rpc/resumen_asistente_ia')),false);
});
test('missing summary fails explicitly without inventing a fallback',async()=>{
  const s=setup('ADMIN',{summaryFail:true});assert.equal((await s.handler(s.request())).status,503);
  assert.equal(s.providerBody,undefined);
});
test('Gemini HTTP failures identify likely causes without exposing provider response bodies',async()=>{
  const cases=[
    [400,/formato de la solicitud/],
    [403,/rechazó la autorización/],
    [404,/modelo configurado no está disponible/],
    [500,/Gemini no pudo responder/],
  ];
  for(const [providerStatus,message] of cases){
    const s=setup('ADMIN',{providerStatus});
    const result=await s.handler(s.request());
    const body=await result.json();
    assert.equal(result.status,502);
    assert.match(body.error,message);
    assert.doesNotMatch(JSON.stringify(body),/provider-private-response/);
  }
});
test('Gemini timeouts return an explicit gateway timeout without leaking error text',async()=>{
  const providerError=Object.assign(new Error('provider-private-detail'),{name:'TimeoutError'});
  const s=setup('ADMIN',{providerError});
  const result=await s.handler(s.request());
  const body=await result.json();
  assert.equal(result.status,504);
  assert.match(body.error,/demasiado en responder/);
  assert.doesNotMatch(JSON.stringify(body),/provider-private-detail/);
});
test('Edge Function retains its existing default and honors the remote model setting',async()=>{
  const defaultRun=setup('ADMIN');
  assert.equal((await defaultRun.handler(defaultRun.request())).status,200);
  assert.ok(defaultRun.calls.some(call=>call.url.endsWith('/models/gemini-3.1-flash-lite:generateContent')));

  const configuredRun=setup('ADMIN',{model:'gemini-configured-model'});
  assert.equal((await configuredRun.handler(configuredRun.request())).status,200);
  assert.ok(configuredRun.calls.some(call=>call.url.endsWith('/models/gemini-configured-model:generateContent')));
});
