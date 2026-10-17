import { NextRequest,NextResponse } from 'next/server';
import {getAuthInfoFromCookie} from '@/lib/auth';
import {getConfig,clearConfigCache} from '@/lib/config';
import {db} from '@/lib/db';
import {safeApi} from '@/lib/shortdrama';
export const runtime='nodejs';
async function authorized(request:NextRequest){
 const a=getAuthInfoFromCookie(request);if(!a?.username)return false;
 if(a.username===process.env.USERNAME)return true;
 const c=await getConfig();return c.UserConfig.Users.some(u=>u.username===a.username&&u.role==='admin'&&!u.banned);
}
export async function GET(r:NextRequest){
 if(!await authorized(r))return NextResponse.json({error:'Unauthorized'},{status:403});
 const c=await getConfig();return NextResponse.json(c.ShortDramaConfig||{enabled:false,sources:[]});
}
export async function POST(r:NextRequest){
 if(!await authorized(r))return NextResponse.json({error:'Unauthorized'},{status:403});
 try{
 const body=await r.json();
 if(typeof body.enabled!=='boolean'||!Array.isArray(body.sources)||body.sources.length>20)return NextResponse.json({error:'Invalid config'},{status:400});
 const seen=new Set<string>();
 const sources=body.sources.map((s:any)=>{
  if(typeof s.key!=='string'||!/^[a-z0-9_-]{1,32}$/.test(s.key)||seen.has(s.key)||typeof s.name!=='string'||s.name.length>80||typeof s.api!=='string'||!safeApi(s.api))throw new Error('Invalid source');
  seen.add(s.key);return {key:s.key,name:s.name,api:s.api,disabled:!!s.disabled};
 });
 const config=await getConfig();config.ShortDramaConfig={enabled:body.enabled,sources};
 await db.saveAdminConfig(config);clearConfigCache();
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Invalid config'},{status:400});}
}
