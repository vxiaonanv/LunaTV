import {activeDramaSources,fetchCms,dramaCategories,dramaItem,DramaSource} from '@/lib/shortdrama';
export async function getSources(key:string|null){const all=await activeDramaSources();return key?all.filter(x=>x.key===key):all;}
export function parseEpisodes(item:any){
 const lines=String(item.vod_play_from||'').split('$$$');
 return String(item.vod_play_url||'').split('$$$').flatMap((group:string,i:number)=>group.split('#').filter(Boolean).map((part:string,index:number)=>{
   const pos=part.indexOf('$');const label=pos<0?'第'+(index+1)+'集':part.slice(0,pos);
   const url=pos<0?part:part.slice(pos+1);
   return {title:label||'第'+(index+1)+'集',url,line:lines[i]||'线路'+(i+1)};
 })).filter((v:{url:string})=>/^https?:\/\//.test(v.url));
}
export async function getDrama(id:string,key:string|null){
 const sources=await getSources(key);
 const requests=await Promise.allSettled(sources.map(async(source:DramaSource)=>{
  const data=await fetchCms(source,{ac:'detail',ids:id});
  const found=(Array.isArray(data.list)?data.list:[]).find((v:any)=>String(v.vod_id)===id);
  return found?{source,found}:null;
 }));
 return requests.filter((x):x is PromiseFulfilledResult<{source:DramaSource;found:any}|null>=>x.status==='fulfilled').map(x=>x.value).find(Boolean)||null;
}
export async function fetchCategory(source:DramaSource,categoryId:string,page:number,size:number){
 const categories=await dramaCategories(source);
 const isParent=categories.some((c:{type_id:number;type_name:string})=>String(c.type_id)===categoryId&&c.type_name==='短剧');
 if(!isParent){
  const data=await fetchCms(source,{ac:'detail',t:categoryId,pg:String(page)});
  return {list:(Array.isArray(data.list)?data.list:[]).slice(0,size).map((x:any)=>dramaItem(x,source)),hasMore:Number(data.page||1)<Number(data.pagecount||1)};
 }
 const children=categories.filter((c:{type_name:string})=>c.type_name!=='短剧');
 const results=await Promise.allSettled(children.slice(0,12).map(async(c:{type_id:number})=>fetchCms(source,{ac:'detail',t:String(c.type_id),pg:String(page)})));
 const success=results.filter((x):x is PromiseFulfilledResult<any>=>x.status==='fulfilled');
 if(!success.length)throw Error('Category source unavailable');
 const distinct=new Map<string,any>();
 for(const d of success)for(const item of Array.isArray(d.value.list)?d.value.list:[])distinct.set(String(item.vod_id),item);
 return {list:Array.from(distinct.values()).slice(0,size).map(x=>dramaItem(x,source)),hasMore:success.some(x=>Number(x.value.page||1)<Number(x.value.pagecount||1))};
}
