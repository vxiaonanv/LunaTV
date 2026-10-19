import {NextRequest,NextResponse} from 'next/server';
import {fetchHongguoList} from '@/lib/hongguo';
import {getSources,fetchCategory} from '@/lib/shortdrama-tv';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams;const categoryId=p.get('categoryId'),source=p.get('source');
 if(!categoryId||!/^\d+$/.test(categoryId))return NextResponse.json({error:'Invalid categoryId'},{status:400});
 const page=Number(p.get('page')||1),size=Number(p.get('size')||20);
 if(!Number.isInteger(page)||page<1||page>100||!Number.isInteger(size)||size<1||size>100)return NextResponse.json({error:'Invalid page or size'},{status:400});
 if(source==='hongguo'||(!source&&['1','2','3'].includes(categoryId))) {
   try{return NextResponse.json(await fetchHongguoList(categoryId,page,size));}
   catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Hongguo unavailable'},{status:502});}
 }
 const sources=await getSources(source);
 if(!sources.length)return NextResponse.json({list:[],hasMore:false});
 const settled=await Promise.allSettled(sources.map(s=>fetchCategory(s,categoryId,page,size)));
 const values=settled.filter((v):v is PromiseFulfilledResult<{list:any[];hasMore:boolean}>=>v.status==='fulfilled').map(v=>v.value);
 if(!values.length)return NextResponse.json({error:'All sources failed'},{status:502});
 return NextResponse.json({list:values.flatMap(v=>v.list).slice(0,size),hasMore:values.some(v=>v.hasMore)});
}
