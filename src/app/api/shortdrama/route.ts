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
    // Some CMS implementations reject ac=detail&wd or return invalid JSON.
    // Try both supported search conventions before falling back to filtering
    // their populated short-drama categories.
    const candidates=[{ac:'videolist',wd,pg:String(page)},{ac:'detail',wd,pg:String(page)}];
    for(const candidate of candidates){
      try{
        const found=await fetchCms(s,candidate);
        if(Array.isArray(found.list)){
          const filtered=found.list.filter((v:any)=>String(v.vod_name||'').toLocaleLowerCase().includes(wd.toLocaleLowerCase()));
          if(filtered.length||Number(found.recordcount||0)===0){
            return {source:s.key,list:filtered.slice(0,30).map((v:any)=>dramaItem(v,s)),hasMore:Number(found.page||1)<Number(found.pagecount||1)};
          }
        }
      }catch{ /* Try alternate CMS search syntax. */ }
    }
    const categories=await dramaCategories(s);
    const child=categories.filter((c:{type_name:string})=>c.type_name!=='短剧').slice(0,12);
    const batches=await Promise.allSettled(child.map((c:{type_id:number})=>fetchCms(s,{ac:'detail',t:String(c.type_id),pg:String(page)})));
    const ok=batches.filter((r):r is PromiseFulfilledResult<any>=>r.status==='fulfilled');
    if(!ok.length)throw new Error('Search unavailable for this source');
    const found=new Map<string,any>();
    ok.forEach(r=>(Array.isArray(r.value.list)?r.value.list:[]).forEach((v:any)=>{if(String(v.vod_name||'').toLocaleLowerCase().includes(wd.toLocaleLowerCase()))found.set(String(v.vod_id),v);}));
    return {source:s.key,list:Array.from(found.values()).slice(0,30).map((v:any)=>dramaItem(v,s)),hasMore:ok.some(r=>Number(r.value.page||1)<Number(r.value.pagecount||1))};
  }else if(action==='list'){
    const category=p.get('category');
    if(category)params.t=category;
    else{
      const categories=await dramaCategories(s);
      if(!categories.length)return {source:s.key,list:[],hasMore:false};
      // CMS parent category may contain no direct videos. Query matching child categories.
      const childCategories=categories.filter((c:{type_name:string})=>c.type_name!=='短剧');
      const targets=childCategories.length?childCategories:categories;
      const batches=await Promise.allSettled(targets.slice(0,12).map(async(c:{type_id:number})=>{
        const data=await fetchCms(s,{ac:'detail',pg:String(page),t:String(c.type_id)});
        return {items:Array.isArray(data.list)?data.list:[],hasMore:Number(data.page||1)<Number(data.pagecount||1)};
      }));
      const ok=batches.filter((r):r is PromiseFulfilledResult<{items:any[];hasMore:boolean}>=>r.status==='fulfilled');
      if(!ok.length)throw new Error('All short drama categories failed');
      const unique=new Map<string,any>();
      ok.forEach(r=>r.value.items.forEach((v:any)=>unique.set(String(v.vod_id),v)));
      return {source:s.key,list:Array.from(unique.values()).slice(0,60).map((v:any)=>dramaItem(v,s)),hasMore:ok.some(r=>r.value.hasMore)};
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
