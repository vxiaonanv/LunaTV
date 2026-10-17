'use client';
import { useEffect, useState } from 'react';
type Source={key:string;name:string;api:string;disabled?:boolean};
type Config={enabled:boolean;sources:Source[]};
const blank=():Source=>({key:'',name:'',api:'',disabled:false});
export default function ShortDramaConfigComponent(){
 const [draft,setDraft]=useState<Config>({enabled:false,sources:[]});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [dirty,setDirty]=useState(false);
 const [newItem,setNewItem]=useState<Source>(blank);
 const [showAdd,setShowAdd]=useState(false);
 useEffect(()=>{let cancelled=false;fetch('/api/admin/shortdrama',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error(r.status===403?'请使用管理员账号登录':'读取失败：HTTP '+r.status);return r.json();}).then(data=>{if(!cancelled)setDraft({enabled:!!data.enabled,sources:Array.isArray(data.sources)?data.sources:[]});}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});return ()=>{cancelled=true;};},[]);
 const update=(next:Config)=>{setDraft(next);setDirty(true);setError('');setNotice('');};
 const change=(i:number,patch:Partial<Source>)=>update({...draft,sources:draft.sources.map((s,j)=>i===j?{...s,...patch}:s)});
 const add=()=>{const next={key:newItem.key.trim(),name:newItem.name.trim(),api:newItem.api.trim(),disabled:!!newItem.disabled};if(!next.key||!next.name||!next.api){setError('请填写完整的新短剧源信息');return;}if(draft.sources.some(s=>s.key===next.key)){setError('源标识不能重复');return;}update({...draft,sources:[...draft.sources,next]});setNewItem(blank());setShowAdd(false);};
 const save=async()=>{
  setSaving(true);setError('');setNotice('');
  try{const result=await fetch('/api/admin/shortdrama',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});if(!result.ok){const d=await result.json().catch(()=>({}));throw Error(d.error||'保存失败 HTTP '+result.status);}setDirty(false);setNotice('短剧源配置保存成功');}catch(e){setError(e instanceof Error?e.message:'保存失败');}finally{setSaving(false);}
 };
 const input='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
 if(loading)return <div className='p-5 text-gray-500'>正在读取短剧源…</div>;
 return <div className='space-y-5 p-4 sm:p-6 text-gray-900 dark:text-gray-100'>
 <p className='text-sm text-gray-500 dark:text-gray-400'>短剧源独立于普通视频源。修改后请点击底部「保存配置」，不会自动保存。</p>
 <label className='flex items-center gap-3'><input type='checkbox' checked={draft.enabled} onChange={e=>update({...draft,enabled:e.target.checked})}/><span className='font-medium'>启用短剧功能</span></label>
 <div className='space-y-4'>{draft.sources.map((s,i)=><div key={i} className='rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3'>
 <div className='flex justify-between items-center'><strong>短剧源 {i+1}</strong><div className='flex gap-3 items-center'><label className='flex gap-2 items-center text-sm'><input type='checkbox' checked={!s.disabled} onChange={e=>change(i,{disabled:!e.target.checked})}/>启用</label><button type='button' className='text-red-500 hover:underline text-sm' onClick={()=>{if(window.confirm('确定从待保存配置中移除该源吗？'))update({...draft,sources:draft.sources.filter((_,j)=>j!==i)});}}>删除</button></div></div>
 <div className='grid sm:grid-cols-2 gap-3'><label className='space-y-1 text-sm'>源标识<input className={input} value={s.key} onChange={e=>change(i,{key:e.target.value})}/></label><label className='space-y-1 text-sm'>名称<input className={input} value={s.name} onChange={e=>change(i,{name:e.target.value})}/></label></div>
 <label className='block space-y-1 text-sm'>CMS API 地址<input className={input} value={s.api} onChange={e=>change(i,{api:e.target.value})}/></label></div>)}</div>
 {showAdd?<div className='border border-green-500/40 rounded-lg p-4 space-y-3'><h4 className='font-semibold'>添加短剧源</h4><div className='grid sm:grid-cols-2 gap-3'><input className={input} placeholder='标识，如 drama02' value={newItem.key} onChange={e=>setNewItem({...newItem,key:e.target.value})}/><input className={input} placeholder='源名称' value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})}/></div><input className={input} placeholder='https://example.com/api.php/provide/vod' value={newItem.api} onChange={e=>setNewItem({...newItem,api:e.target.value})}/><div className='flex gap-3'><button onClick={add} className='px-4 py-2 bg-green-600 text-white rounded-lg'>加入列表</button><button onClick={()=>{setShowAdd(false);setNewItem(blank());}} className='px-4 py-2 border rounded-lg'>取消</button></div></div>:<button className='px-4 py-2 rounded-lg border border-green-600 text-green-600' onClick={()=>setShowAdd(true)}>+ 添加短剧源</button>}
 {error&&<p role='alert' className='text-red-500 text-sm'>{error}</p>}
 {notice&&<p role='status' className='text-green-600 text-sm'>{notice}</p>}
 <div className='flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 pt-5'><span className='text-sm text-gray-500'>{dirty?'有未保存的更改':'配置已保存'}</span><button type='button' disabled={saving||!dirty} onClick={()=>void save()} className='px-6 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50'>{saving?'保存中…':'保存配置'}</button></div>
 </div>;
}
