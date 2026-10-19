/* Hongguo catalog adapter based on djseven/223344 TV ShortDramaService.
 * Real upstream records only; no manufactured fallback titles or episode counts.
 * Experimental: official endpoints may change or require authorization. */
const endpoint = 'https://api5-normal-sinfonlineb.fqnovel.com/reading/distribution/category/landpage/v/?aid=8662&app_name=novelread&version_code=73532&device_platform=android&os=android';
export const HONGGUO_SOURCE = 'hongguo';
export const HONGGUO_CATEGORIES = [
 { type_id: 1, type_name: '真人剧' },
 { type_id: 2, type_name: '漫剧' },
 { type_id: 3, type_name: 'AI剧' },
] as const;
const genre: Record<string,string> = {'1':'short_play','2':'comic_series','3':'ai_series'};
export type HongguoDrama = { id:string; source:string; name:string; cover:string; description:string; episode_count:number; score:number; categoryName:string };
export async function fetchHongguoList(categoryId:string,page:number,size:number):Promise<{list:HongguoDrama[];hasMore:boolean}> {
 const selected=genre[categoryId];
 if(!selected) throw new Error('Unsupported Hongguo category');
 const offset=(page-1)*size;
 const body={req_scene:selected==='short_play'?'default':selected,offset,limit:size,req_type:'only_content',need_selector_panel:false,client_req_type:offset>0?2:3,session_id:'',filter_ids:'',select_items:{genre:[selected],sort:['online_time'],gender:[],category_dim_theme:[],category_dim_role:[],category_dim_epoch:[],online_time:[],creation_status:[]}};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8','Accept':'application/json','X-XS-From-Web':'0','Sdk-Version':'2','User-Agent':'com.dragon.read/7.3.5.32 (Linux; Android 14)'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok) throw new Error('Hongguo HTTP '+response.status);
 const raw=await response.text();
 if(raw.length>2000000) throw new Error('Hongguo response too large');
 const parsed=JSON.parse(raw);
 if(parsed.code!==0 && parsed.code!=='0' && parsed.code!=null)throw new Error('Hongguo upstream error '+String(parsed.code));
 const items=parsed.data?.video_data;
 if(!Array.isArray(items))throw new Error('Hongguo response has no video_data');
 const list:HongguoDrama[]=items.flatMap((item:Record<string,unknown>)=>{
  const id=String(item.series_id??'');const name=String(item.title??'').trim();
  if(!/^\d{6,32}$/.test(id)||!name)return [];
  const count=Number(item.episode_cnt),score=Number(item.score);
  return [{id,source:HONGGUO_SOURCE,name,cover:String(item.cover??''),description:String(item.video_desc??''),episode_count:Number.isFinite(count)&&count>0?count:0,score:Number.isFinite(score)&&score>0?score:0,categoryName:HONGGUO_CATEGORIES.find(c=>String(c.type_id)===categoryId)?.type_name||''}];
 });
 return {list,hasMore:items.length===size};
}
