import { NextResponse } from 'next/server';
import { getPublicProjects } from '@/app/api/public-projects';
export async function GET() { return NextResponse.json(await getPublicProjects()); }
