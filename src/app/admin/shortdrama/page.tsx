'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import PageLayout from '@/components/PageLayout';

type Source = {key:string;name:string;api:string;disabled:boolean};
type Config = {enabled:boolean;sources:Source[]};
const empty:Source={key:'',name:'',api:'',disabled:false};

export default function ShortDramaAdminPage(){
 const [config,setConfig]=useState<Config>({enabled:false,sources:[]});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [editor,setEditor]=useState<Source|null>(null);
 const [originalKey,setOriginalKey]=useState<string|null>(null);
 const load=async()=>{
  setLoading(true);setError('');
  try{
   const r=await fetch('/api/admin/shortdrama',{cache:'no-store'});
   if(!r.ok)throw Error(r.status===403?'需要管理员账号登录':'读取失败 HTTP '+r.status);
   const d=await r.json() as Config;
   setConfig({enabled:Boolean(d.enabled),sources:(d.sources||[]).map(s=>({...s,disabled:Boolean(s.disabled)}))});
  }catch(e){setError(e instanceof Error?e.message:'读取失败');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);
 const persist=async(next:Config)=>{
  setSaving(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin/shortdrama',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
   if(!r.ok){const data=await r.json().catch(()=>({error:'保存失败'}));throw Error(data.error||'保存失败');}
   setConfig(next);setMessage('保存成功，短剧源配置已更新');setEditor(null);setOriginalKey(null);
  }catch(e){setError(e instanceof Error?e.message:'保存失败');}
  finally{setSaving(false);}
 };
 const saveSource=()=>{
  if(!editor)return;
  const s={...editor,key:editor.key.trim(),name:editor.name.trim(),api:editor.api.trim()};
  if(!/^[a-z0-9_-]{1,32}$/.test(s.key)){setError('源标识只能使用小写英文字母、数字、下划线和横线（1-32 位）');return;}
  if(!s.name||s.name.length>80){setError('请输入不超过 80 字的源名称');return;}
  try{const u=new URL(s.api);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{setError('请输入有效的 HTTP/HTTPS CMS 接口地址');return;}
  if(config.sources.some(x=>x.key===s.key&&x.key!==originalKey)){setError('源标识重复');return;}
  const sources=originalKey?config.sources.map(x=>x.key===originalKey?s:x):[...config.sources,s];
  void persist({...config,sources});
 };
 const remove=(key:string)=>{if(window.confirm('确定删除这个短剧源吗？'))void persist({...config,sources:config.sources.filter(x=>x.key!==key)});};
 return <PageLayout activePath='/admin'>
 <div className='max-w-5xl mx-auto px-4 sm:px-8 py-8 text-gray-900 dark:text-gray-100 space-y-6'>
 <div className='flex gap-3 justify-between items-center'><div><Link href='/admin' className='text-green-600 hover:underline text-sm'>← 返回管理员设置</Link><h1 className='text-2xl font-bold mt-3'>短剧源管理</h1><p className='text-sm text-gray-500 mt-2'>独立于普通影视源，管理 CMS 短剧接口；网页和 TV 端共用。</p></div><button onClick={()=>{setEditor({...empty});setOriginalKey(null);setError('');}} disabled={loading||saving} className='px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50'>添加短剧源</button></div>
 {error&&<p role='alert' className='text-red-500'>{error}</p>}
 {message&&<p role='status' className='text-green-600'>{message}</p>}
 {loading?<p>正在读取短剧配置…</p>:<>
 <label className='flex items-center gap-3 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm'><input type='checkbox' checked={config.enabled} disabled={saving} onChange={e=>void persist({...config,enabled:e.target.checked})}/><span>启用短剧功能</span></label>
 <div className='space-y-3'>{config.sources.length===0?<p className='text-gray-500'>尚未添加短剧源</p>:config.sources.map(s=><div key={s.key} className='rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3'>
 <div className='flex-1 min-w-0'><div className='font-semibold'>{s.name} <span className='text-xs opacity-50'>({s.key})</span></div><p className='text-sm opacity-60 truncate' title={s.api}>{s.api}</p></div>
 <div className='flex items-center gap-2 flex-wrap'><label className='flex items-center gap-1 text-sm'><input type='checkbox' checked={!s.disabled} disabled={saving} onChange={e=>void persist({...config,sources:config.sources.map(x=>x.key===s.key?{...x,disabled:!e.target.checked}:x)})}/>启用</label><button disabled={saving} className='px-3 py-1 rounded border border-gray-300 dark:border-gray-600' onClick={()=>{setOriginalKey(s.key);setEditor({...s});setError('');}}>编辑</button><button disabled={saving} className='px-3 py-1 rounded border border-red-400 text-red-500' onClick={()=>remove(s.key)}>删除</button></div>
 </div>)}</div>
 </>}
 {editor&&<div className='fixed inset-0 z-50 bg-black/70 overflow-y-auto flex justify-center items-start pt-16 p-3'><div className='w-full max-w-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-xl space-y-4 shadow-xl'>
 <h2 className='text-xl font-semibold'>{originalKey?'编辑短剧源':'添加短剧源'}</h2>
 <label className='block space-y-1'><span className='text-sm'>源标识（唯一，建议不修改）</span><input value={editor.key} disabled={Boolean(originalKey)} onChange={e=>setEditor({...editor,key:e.target.value})} className='block w-full rounded border p-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white'/></label>
 <label className='block space-y-1'><span className='text-sm'>源名称</span><input value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})} className='block w-full rounded border p-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white'/></label>
 <label className='block space-y-1'><span className='text-sm'>CMS API 地址</span><input value={editor.api} onChange={e=>setEditor({...editor,api:e.target.value})} placeholder='https://example.com/api.php/provide/vod' className='block w-full rounded border p-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white'/></label>
 <label className='flex gap-2 items-center'><input checked={!editor.disabled} type='checkbox' onChange={e=>setEditor({...editor,disabled:!e.target.checked})}/>启用此源</label>
 {error&&<p role='alert' className='text-red-500'>{error}</p>}
 <div className='flex justify-end gap-3'><button disabled={saving} onClick={()=>{setEditor(null);setError('');}} className='px-4 py-2 border rounded-lg'>取消</button><button disabled={saving} onClick={saveSource} className='px-5 py-2 bg-green-600 text-white rounded-lg'>{saving?'保存中…':'保存'}</button></div>
 </div></div>}
 </div>
 </PageLayout>;
}
