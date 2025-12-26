// 나스닥 데이터 API 라우트

import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Yahoo Finance API를 통해 나스닥 지수 가져오기
        const symbol = '^IXIC'; // 나스닥 종합지수
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            throw new Error('Yahoo Finance API error');
        }

        const data = await response.json();
        const result = data.chart.result[0];
        const meta = result.meta;
        const quotes = result.indicators.quote[0];

        // 전일 종가와 현재가
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const currentPrice = meta.regularMarketPrice;
        const changePercent = ((currentPrice - previousClose) / previousClose) * 100;

        return NextResponse.json({
            symbol: '^IXIC',
            name: 'NASDAQ Composite',
            price: currentPrice,
            previousClose,
            changePercent,
            is3PercentDrop: changePercent <= -3
        });
    } catch (error) {
        console.error('Failed to fetch NASDAQ data:', error);

        // 데모 데이터 반환
        return NextResponse.json({
            symbol: '^IXIC',
            name: 'NASDAQ Composite',
            price: 19432.12,
            previousClose: 19678.45,
            changePercent: -1.25,
            is3PercentDrop: false,
            isDemo: true
        });
    }
}
