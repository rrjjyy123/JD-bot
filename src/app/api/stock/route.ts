// 개별 주식 데이터 API 라우트

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        // Yahoo Finance API를 통해 주식 데이터 가져오기
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;

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

        // 전고점(52주 최고가) 계산
        const highs = quotes.high.filter((h: number | null) => h !== null);
        const allTimeHigh = Math.max(...highs);

        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const changePercent = ((currentPrice - previousClose) / previousClose) * 100;
        const drawdownPercent = ((allTimeHigh - currentPrice) / allTimeHigh) * 100;

        return NextResponse.json({
            symbol: symbol.toUpperCase(),
            name: meta.shortName || meta.longName || symbol,
            price: currentPrice,
            previousClose,
            changePercent,
            marketCap: meta.marketCap || 0,
            allTimeHigh,
            drawdownPercent
        });
    } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);

        return NextResponse.json({
            error: 'Failed to fetch stock data',
            symbol
        }, { status: 500 });
    }
}
