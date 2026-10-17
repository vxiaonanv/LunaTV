import {NextResponse} from 'next/server';
import {activeDramaSources,dramaCategories} from '@/lib/shortdrama';
export const dynamic='force-dynamic';
export async function GET(){
 const sources=await activeDramaSources();
 if(!sources.length)return NextResponse.json([]);
 const settled=await Promise.allSettled(sources.map(dramaCategories));
 const categories=new Map<string,{type_id:number;type_name:string}>();
 settled.forEach(r=>{if(r.status==='fulfilled')r.value.forEach((v:{type_id:number;type_name:string})=>categories.set(String(v.type_id)+v.type_name,v));});
 return NextResponse.json(Array.from(categories.values()));
}
