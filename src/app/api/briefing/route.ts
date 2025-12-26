// Gemini AI 브리핑 생성 API 라우트

import { NextRequest, NextResponse } from 'next/server';
import { generateAIBriefing } from '@/lib/geminiAI';
import { NasdaqData, StockData, MarketStatus, RateStatus, CrisisState } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nasdaq, topStock, marketStatus, rateStatus, crisisState } = body;

        // Vercel 환경변수 또는 로컬 환경변수에서 키 가져오기
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn('GEMINI_API_KEY is not set in environment variables.');
            return NextResponse.json({
                error: 'API key not configured',
                isDemo: true
            }, { status: 200 }); // 클라이언트에서 데모 데이터로 대체할 수 있게 200 반환
        }

        const briefing = await generateAIBriefing(
            nasdaq as NasdaqData,
            topStock as StockData,
            marketStatus as MarketStatus,
            rateStatus as RateStatus,
            crisisState as CrisisState,
            apiKey
        );

        return NextResponse.json({ briefing });
    } catch (error) {
        console.error('Gemini API Route error:', error);
        return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
    }
}
