const origin = 'https://snarr.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,authorization,apikey','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const incomingOrigin=request.headers.get('origin');if(incomingOrigin && incomingOrigin!==origin)return json({error:'Please use the Haunted Window page.'},403);
 const url=new URL(request.url), action=url.pathname.split('/').pop();
 if(!['status','messages','device'].includes(action||''))return json({error:'Not found'},404);
 if((action==='status'&&request.method!=='GET')||(action!=='status'&&request.method!=='POST'))return json({error:'Method not allowed'},405);
 try{
  let data:Record<string,unknown>={};
  if(request.method==='POST'){if(Number(request.headers.get('content-length')||0)>1024)return json({error:'Request too large'},413);const text=await request.text();if(text.length>1024)return json({error:'Request too large'},413);data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'Invalid request'},400);}
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if(action==='status')data={id:url.searchParams.get('id')};
  if(action==='messages'){data.client=await hash(service+(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim());}
  if(action==='device'){const auth=request.headers.get('authorization')||'';if(!auth.startsWith('Bearer ')||auth.length<40)return json({error:'Unauthorized'},401);data.token_hash=await hash(auth.slice(7));}
  const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/halloween_api',{method:'POST',headers:{'Content-Type':'application/json',apikey:service,Authorization:'Bearer '+service},body:JSON.stringify({p_action:action,p_data:data})});
  if(!result.ok){console.error('Queue database request failed',result.status);return json({error:'The window is taking a break. Try again shortly.'},503);}
  const payload=await result.json();const status=payload.http_status||200;delete payload.http_status;return json(payload,status);
 }catch{return json({error:'Could not process that message. Please try again.'},400);}
});
