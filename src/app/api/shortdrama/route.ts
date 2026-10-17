/* Aggregated short-drama API built on djseven/LunaTV's CMS request flow.
   GET ?action=categories|list|search|detail&source=...&page=1&category=...&wd=...&id=...
*/
import {NextRequest,NextResponse} from 'next/server';
import {activeDramaSources,fetchCms,dramaCategories,dramaItem} from '@/lib/shortdrama';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 try{
 const p=req.nextUrl.searchParams,action=p.get('action')||'list';
 const sources=await activeDramaSources();
 if(!sources.length)return NextResponse.json({list:[],sources:[],disabled:true});
 if(action==='sources')return NextResponse.json(sources.map(({key,name})=>({key,name})));
 const selected=p.get('source');
 const use=selected?sources.filter(s=>s.key===selected):sources;
 if(!use.length)return NextResponse.json({error:'Unknown source'},{status:404});
 const page=Math.max(1,Math.min(100,Number(p.get('page'))||1));
 const results=await Promise.allSettled(use.map(async s=>{
  if(action==='categories')return {source:s.key,categories:await dramaCategories(s)};
  if(action==='detail'){
   const id=p.get('id');if(!id||id.length>100)throw new Error('Invalid id');
   const d=await fetchCms(s,{ac:'detail',ids:id});
   return {source:s.key,list:(Array.isArray(d.list)?d.list:[]).map((v:any)=>({...dramaItem(v,s),vod_play_from:v.vod_play_from||'',vod_play_url:v.vod_play_url||''}))};
  }
  const params:Record<string,string>={ac:'detail',pg:String(page)};
  if(action==='search'){
    const wd=p.get('wd');if(!wd||wd.length>100)throw new Error('Invalid keyword');
    params.wd=wd;
  }else if(action==='list'){
    const category=p.get('category');
    if(category)params.t=category;
    else{
      const categories=await dramaCategories(s);
      if(!categories.length)return {source:s.key,list:[],hasMore:false};
      params.t=String(categories[0].type_id);
    }
  }else throw new Error('Unknown action');
  const d=await fetchCms(s,params);
  return {source:s.key,list:(Array.isArray(d.list)?d.list:[]).slice(0,30).map((v:any)=>dramaItem(v,s)),hasMore:Number(d.page||1)<Number(d.pagecount||1)};
 }));
 const successes=results.filter(x=>x.status==='fulfilled').map(x=>(x as PromiseFulfilledResult<any>).value);
 if(!successes.length)return NextResponse.json({error:'All sources failed'},{status:502});
 if(action==='categories')return NextResponse.json({sources:successes});
 return NextResponse.json({list:successes.flatMap(x=>x.list),hasMore:successes.some(x=>x.hasMore),failedSources:results.length-successes.length});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Request failed'},{status:400});}
}
