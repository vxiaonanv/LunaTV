'use client';
import Hls from 'hls.js';
import { ArrowLeft, Play } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import PageLayout from '@/components/PageLayout';

type Drama={id:string;source:string;name:string;cover:string;description?:string;vod_play_from?:string;vod_play_url?:string};
type Episode={title:string;url:string;line:string};
function ShortDramaPlayClient(){
  const router=useRouter(),params=useSearchParams();
  const id=params.get('id')||'',source=params.get('source')||'';
  const [detail,setDetail]=useState<Drama|null>(null);
  const [episodes,setEpisodes]=useState<Episode[]>([]);
  const [current,setCurrent]=useState(0);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  useEffect(()=>{
    if(!id||!source){setError('缺少短剧信息');setLoading(false);return;}
    let cancelled=false;
    const q=new URLSearchParams({action:'detail',source,id});
    fetch('/api/shortdrama?'+q).then(async r=>{
      if(!r.ok)throw Error('详情请求失败：HTTP '+r.status);
      return r.json();
    }).then(data=>{
      if(cancelled)return;
      const d=data.list?.[0] as Drama|undefined;
      if(!d)throw Error('没有找到该短剧');
      setDetail(d);
      const lines=(d.vod_play_from||'').split('$$$');
      const parsed:Episode[]=(d.vod_play_url||'').split('$$$').flatMap((group:string,lineIndex:number)=>
        group.split('#').filter(Boolean).map((item:string,index:number)=>{
          const p=item.indexOf('$');
          return {title:p>=0?item.substring(0,p):'第'+(index+1)+'集',url:p>=0?item.substring(p+1):item,line:lines[lineIndex]||'线路'+(lineIndex+1)};
        })
      ).filter((ep:Episode)=>/^https?:\/\//.test(ep.url));
      setEpisodes(parsed);setCurrent(0);
      if(!parsed.length)setError('该短剧没有可用的播放地址');
    }).catch(e=>{if(!cancelled)setError(e.message||'详情加载失败');}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[id,source]);
  useEffect(()=>{
    const video=videoRef.current,url=episodes[current]?.url;
    if(!video||!url)return;
    video.pause();video.removeAttribute('src');video.load();
    let hls:Hls|null=null;
    if(Hls.isSupported()&&/\.m3u8(?:\?|$)/i.test(url)){
      hls=new Hls({enableWorker:true});
      hls.loadSource(url);hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,()=>{void video.play().catch(()=>{ /* Autoplay may require a user gesture. */ });});
      hls.on(Hls.Events.ERROR,(_evt,data)=>{if(data.fatal)setError('播放失败：'+data.details);});
    }else{
      video.src=url;
      void video.play().catch(()=>{ /* Autoplay may require a user gesture. */ });
    }
    return ()=>{hls?.destroy();video.pause();video.removeAttribute('src');video.load();};
  },[episodes,current]);
  return <PageLayout activePath='/shortdrama/play'>
    <div className='min-h-screen bg-gradient-to-br from-sky-50 to-slate-200 dark:from-gray-950 dark:to-slate-900 text-gray-900 dark:text-gray-100 px-5 md:px-10 py-4'>
      <div className='flex items-center gap-4 mb-6'>
        <button aria-label='返回短剧列表' onClick={()=>router.push('/shortdrama')} className='p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10'><ArrowLeft size={22}/></button>
        <h1 className='font-semibold text-lg truncate'>{detail?.name||'短剧播放'}</h1>
      </div>
      <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] gap-5 items-stretch'>
        <div className='aspect-video xl:aspect-auto xl:min-h-[580px] bg-black rounded-xl overflow-hidden shadow-lg flex items-center justify-center'>
          <video ref={videoRef} className='w-full h-full max-h-[70vh] bg-black' controls playsInline autoPlay/>
        </div>
        <aside className='bg-gray-300/65 dark:bg-gray-800/70 rounded-xl p-4 min-h-[300px] max-h-[70vh] overflow-y-auto'>
          <div className='flex items-center justify-between mb-4'><h2 className='text-green-600 dark:text-green-400 font-bold'>选集 / 播放线路</h2><span className='text-xs opacity-70'>共 {episodes.length} 个播放条目</span></div>
          {loading?<p>正在加载播放信息…</p>:episodes.length===0?<p className='text-sm opacity-70'>暂无可播放资源</p>:
          <div className='grid grid-cols-3 xl:grid-cols-2 gap-2'>{episodes.map((ep,i)=>
            <button key={i} onClick={()=>{setCurrent(i);setError('');}} className={'text-sm text-left rounded-lg px-3 py-3 flex items-center gap-2 '+(current===i?'bg-green-600 text-white':'bg-white/75 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-gray-600')} title={ep.line+' · '+ep.title}>
              {current===i&&<Play size={14}/>}<span className='truncate'>{ep.title||'第'+(i+1)+'集'}</span>
            </button>)}</div>}
          {episodes[current]&&<p className='mt-4 text-xs opacity-70'>当前线路：{episodes[current].line}</p>}
        </aside>
      </div>
      {error&&<p role='alert' className='text-red-600 dark:text-red-400 mt-4'>{error}</p>}
      {detail&&<section className='mt-7 flex gap-6 items-start'>
        {detail.cover&&<img src={detail.cover} alt={detail.name} className='w-40 sm:w-52 rounded-xl object-cover shadow'/>}
        <div className='space-y-3'>
          <h2 className='text-2xl font-bold'>{detail.name}</h2>
          <div className='flex gap-2 flex-wrap text-sm'><span className='text-green-600 font-semibold'>短剧</span><span>{detail.vod_play_from||'在线播放'}</span></div>
          <p className='leading-7 text-sm opacity-80'>{detail.description||'暂无剧情简介'}</p>
        </div>
      </section>}
    </div>
  </PageLayout>;
}
export default function ShortDramaPlayPage(){return <Suspense fallback={<p>正在加载…</p>}><ShortDramaPlayClient/></Suspense>;}
