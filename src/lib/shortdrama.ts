/* Short-drama CMS adapter, based on djseven/LunaTV's category/list/search strategy. */
import { getConfig } from '@/lib/config';

export type DramaSource = {key:string;name:string;api:string;disabled?:boolean};
export async function activeDramaSources():Promise<DramaSource[]> {
  const config=await getConfig();
  if (!config.ShortDramaConfig?.enabled) return [];
  return (config.ShortDramaConfig.sources||[]).filter(s=>!s.disabled);
}
export function safeApi(url:string):boolean {
  try {
    const u=new URL(url);
    if (!['https:','http:'].includes(u.protocol)||u.username||u.password) return false;
    const h=u.hostname.toLowerCase().replace(/\.$/,'');
    if (h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')) return false;
    if (/^(10|127|0|169\.254|192\.168)\./.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (h==='::1'||h==='[::1]'||h==='0.0.0.0') return false;
    if (/^[0-9.]+$/.test(h)&&h.split('.').length!==4) return false;
    return true;
  } catch {return false;}
}
export async function fetchCms(source:DramaSource,params:Record<string,string>) {
  if(!safeApi(source.api)) throw new Error('Forbidden source URL');
  const u=new URL(source.api);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store',redirect:'error'});
  if(!r.ok) throw new Error('Source HTTP '+r.status);
  const len=Number(r.headers.get('content-length')||0);
  if(len>2000000)throw new Error('Source response too large');
  const raw=await r.text();
  if(raw.length>2000000)throw new Error('Source response too large');
  return JSON.parse(raw);
}
export const dramaKeywords=['短剧','女频恋爱','反转爽剧','古装仙侠','年代穿越','脑洞悬疑','现代都市'];
export async function dramaCategories(source:DramaSource){
  const data=await fetchCms(source,{ac:'list'});
  const items=Array.isArray(data.class)?data.class:[];
  return items.filter((c:{type_name?:string})=>typeof c.type_name==='string'&&dramaKeywords.some(w=>c.type_name!.includes(w)));
}
export function dramaItem(v:any,source:DramaSource){
 return {id:String(v.vod_id),source:source.key,name:v.vod_name||'',cover:v.vod_pic||'',description:v.vod_content||v.vod_blurb||'',episode_count:Number.parseInt(String(v.vod_remarks||'').replace(/[^0-9]/g,''),10)||0,update_time:v.vod_time||'',score:Number(v.vod_score)||0};
}
