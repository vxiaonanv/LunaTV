import {NextRequest,NextResponse} from 'next/server';
import {getDrama,parseEpisodes} from '@/lib/shortdrama-tv';
import {dramaItem} from '@/lib/shortdrama';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams,id=p.get('id'),source=p.get('source');
 if(!id||id.length>100)return NextResponse.json({error:'Invalid id'},{status:400});
 try{
 const result=await getDrama(id,source);
 if(!result)return NextResponse.json({error:'Drama not found'},{status:404});
 const episodes=parseEpisodes(result.found),data=dramaItem(result.found,result.source);
 return NextResponse.json({...data,episodes,totalEpisodes:episodes.length,episode_count:episodes.length,playFrom:result.found.vod_play_from||''});
 }catch{return NextResponse.json({error:'Failed to load drama'},{status:502});}
}
