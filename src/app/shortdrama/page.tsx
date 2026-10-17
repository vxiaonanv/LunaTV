'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';

type Category = { type_id: number; type_name: string };
type Drama = { id: string; source: string; name: string; cover: string; description?: string; vod_play_from?: string; vod_play_url?: string };
type ListResult = { list?: Drama[]; hasMore?: boolean; error?: string; disabled?: boolean };
const endpoint = '/api/shortdrama';
export default function ShortDramaPage() {
  const router=useRouter();
  const [categories,setCategories]=useState<Category[]>([]);
  const [category,setCategory]=useState('');
  const [items,setItems]=useState<Drama[]>([]);
  const [page,setPage]=useState(1);
  const [hasMore,setHasMore]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [detail,setDetail]=useState<Drama|null>(null);
  const [episodes,setEpisodes]=useState<{title:string;url:string}[]>([]);
  const [episode,setEpisode]=useState(0);
  const [query,setQuery]=useState('');
  const [search,setSearch]=useState('');
  const [sources,setSources]=useState<{key:string;name:string}[]>([]);
  const [source,setSource]=useState('');
  useEffect(()=>{
    Promise.all([
      fetch(endpoint+'?action=categories').then(r=>r.json()),
      fetch(endpoint+'?action=sources').then(r=>r.json()),
    ]).then(([c,s])=>{
      const cats=(c.sources||[]).flatMap((group:{categories:Category[]})=>group.categories||[]) as Category[];
      setCategories(Array.from(new Map(cats.map(x=>[String(x.type_id),x])).values()));
      if(Array.isArray(s)){setSources(s);if(s.length===1)setSource(s[0].key);}
    }).catch(()=>setError('分类加载失败，请检查登录或短剧源配置'));
  },[]);
  const load=useCallback(async(currentPage:number,append:boolean)=>{
    setLoading(true);setError('');
    const p=new URLSearchParams({action:search?'search':'list',page:String(currentPage)});
    if(source)p.set('source',source);
    if(search)p.set('wd',search);
    else if(category)p.set('category',category);
    try{
      const r=await fetch(endpoint+'?'+p.toString());
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json() as ListResult;
      if(d.error)throw new Error(d.error);
      setItems(old=>append?[...old,...(d.list||[])]:d.list||[]);
      setHasMore(Boolean(d.hasMore));
    }catch(e){setError(e instanceof Error?e.message:'加载失败');}
    finally{setLoading(false);}
  },[search,source,category]);
  useEffect(()=>{setPage(1);void load(1,false);},[load]);
  const open=async(item:Drama)=>{
    setDetail(item);setEpisodes([]);setEpisode(0);setError('');
    try{
      const p=new URLSearchParams({action:'detail',id:item.id,source:item.source});
      const r=await fetch(endpoint+'?'+p.toString());
      if(!r.ok)throw new Error('详情 HTTP '+r.status);
      const d=await r.json() as ListResult;
      const entry=d.list?.[0];if(!entry)throw new Error('未找到播放详情');
      setDetail(entry);
      const parsed=(entry.vod_play_url||'').split('$$$').flatMap(group=>group.split('#')).filter(Boolean).map((part,i)=>{
        const cut=part.indexOf('$');
        return cut===-1?{title:'第'+(i+1)+'集',url:part}:{title:part.slice(0,cut)||'第'+(i+1)+'集',url:part.slice(cut+1)};
      }).filter(x=>/^https?:\/\//.test(x.url));
      setEpisodes(parsed);
    }catch(e){setError(e instanceof Error?e.message:'详情加载失败');}
  };
  return <PageLayout activePath='/shortdrama'>
    <div className='max-w-7xl mx-auto px-5 py-8 space-y-5 text-gray-900 dark:text-white'>
      <h1 className='text-2xl font-bold'>短剧</h1>
      <form className='flex gap-2' onSubmit={e=>{e.preventDefault();setCategory('');setSearch(query.trim());}}>
        <input className='flex-1 rounded-lg p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white' placeholder='搜索短剧' value={query} onChange={e=>setQuery(e.target.value)}/>
        <button className='rounded-lg px-4 py-2 bg-green-600 text-white' type='submit'>搜索</button>
        <button type='button' className='rounded-lg px-3 border' onClick={()=>{setQuery('');setSearch('');}}>清除</button>
      </form>
      {sources.length>1&&<div className='flex gap-2 flex-wrap'>{[{key:'',name:'全部来源'},...sources].map(s=><button key={s.key} onClick={()=>setSource(s.key)} className={'rounded-lg px-3 py-2 '+(source===s.key?'bg-green-600 text-white':'bg-gray-200 dark:bg-gray-800')}>{s.name}</button>)}</div>}
      {!search&&<div className='flex gap-2 flex-wrap'>{[{type_id:0,type_name:'全部'},...categories.filter(c=>c.type_name!=='短剧')].map(c=><button key={c.type_id} className={'rounded-lg px-3 py-2 '+(category===String(c.type_id||'')?'bg-green-600 text-white':'bg-gray-200 dark:bg-gray-800')} onClick={()=>setCategory(c.type_id?String(c.type_id):'')}>{c.type_name}</button>)}</div>}
      {error&&<p role='alert' className='text-red-500'>{error}</p>}
      {loading&&<p>加载中…</p>}
      {!loading&&items.length===0&&<p className='text-gray-500'>暂无短剧，请检查数据源或更换分类。</p>}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
        {items.map((item,i)=><button key={item.source+item.id+i} onClick={()=>router.push('/shortdrama/play?'+new URLSearchParams({id:item.id,source:item.source}).toString())} className='text-left group'>
          {item.cover?<img loading='lazy' src={item.cover} alt={item.name} className='w-full aspect-[2/3] object-cover rounded-lg group-hover:ring-2 ring-green-500'/>:<div className='w-full aspect-[2/3] rounded-lg bg-gray-700'/>}
          <span className='block mt-2 text-sm line-clamp-2'>{item.name}</span>
        </button>)}
      </div>
      {hasMore&&!loading&&<button className='bg-green-600 text-white rounded-lg px-5 py-2' onClick={()=>{setPage(page+1);void load(page+1,true);}}>加载更多</button>}
      {detail&&<div className='fixed inset-0 z-50 bg-black/90 overflow-y-auto p-5 md:p-12 text-white'>
        <button className='mb-5 px-4 py-2 rounded bg-gray-700' onClick={()=>{setDetail(null);setEpisodes([]);setError('');}}>返回短剧列表</button>
        <h2 className='text-2xl font-bold mb-3'>{detail.name}</h2>
        {episodes.length>0?<video key={episodes[episode]?.url} className='w-full max-w-4xl aspect-video bg-black' src={episodes[episode]?.url} controls autoPlay playsInline/>:<p>正在读取播放资源，或该剧暂无有效播放地址。</p>}
        <div className='flex flex-wrap gap-2 my-4'>{episodes.map((ep,i)=><button key={i} onClick={()=>setEpisode(i)} className={'px-3 py-2 rounded '+(episode===i?'bg-green-600':'bg-gray-700')}>{ep.title}</button>)}</div>
        {error&&<p className='text-red-400'>{error}</p>}
        <p className='text-gray-300'>{detail.description}</p>
        <p className='text-sm text-gray-400 mt-2'>部分浏览器不支持原生 HLS 视频，请用支持 HLS 的播放器测试播放。</p>
      </div>}
    </div>
  </PageLayout>;
}
