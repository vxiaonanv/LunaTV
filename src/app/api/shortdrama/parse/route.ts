import {NextRequest,NextResponse} from 'next/server';
import {getDrama,parseEpisodes} from '@/lib/shortdrama-tv';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams,id=p.get('id'),source=p.get('source'),episode=Number(p.get('episode')||1);
 if(!id||id.length>100||!Number.isInteger(episode)||episode<1)return NextResponse.json({error:'Invalid id or episode'},{status:400});
 try{
 const data=await getDrama(id,source);
 if(!data)return NextResponse.json({error:'Drama not found'},{status:404});
 const episodes=parseEpisodes(data.found);
 const selected=episodes[episode-1];
 if(!selected)return NextResponse.json({error:'Episode not found',totalEpisodes:episodes.length},{status:404});
 return NextResponse.json({url:selected.url,originalUrl:selected.url,proxyUrl:'',title:data.found.vod_name||'',episode,totalEpisodes:episodes.length,line:selected.line,episodeTitle:selected.title});
 }catch{return NextResponse.json({error:'Failed to parse episode'},{status:502});}
}
