// 시가총액 상위 기업 데이터 API 라우트

import { NextResponse } from 'next/server';

// 시가총액 상위 기업 목록 (정기적으로 업데이트 필요)
const TOP_SYMBOLS = ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'];

interface StockData {
    symbol: string;
    name: string;
    price: number;
    previousClose: number;
    changePercent: number;
    marketCap: number;
    allTimeHigh: number;
    drawdownPercent: number;
}

async function fetchStockData(symbol: string): Promise<StockData | null> {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const result = data.chart.result[0];
        const meta = result.meta;
        const quotes = result.indicators.quote[0];

        const highs = quotes.high.filter((h: number | null) => h !== null);
        const allTimeHigh = Math.max(...highs);

        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const changePercent = ((currentPrice - previousClose) / previousClose) * 100;
        const drawdownPercent = ((allTimeHigh - currentPrice) / allTimeHigh) * 100;

        return {
            symbol,
            name: meta.shortName || meta.longName || symbol,
            price: currentPrice,
            previousClose,
            changePercent,
            marketCap: meta.marketCap || 0,
            allTimeHigh,
            drawdownPercent
        };
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        // 모든 상위 기업 데이터 병렬 조회
        const stockPromises = TOP_SYMBOLS.map(symbol => fetchStockData(symbol));
        const stocks = await Promise.all(stockPromises);

        // null 필터링 및 시가총액 기준 정렬
        const validStocks = stocks
            .filter((s): s is StockData => s !== null)
            .sort((a, b) => b.marketCap - a.marketCap);

        if (validStocks.length >= 4) {
            return NextResponse.json(validStocks.slice(0, 4));
        }

        // 데이터 부족시 데모 데이터 반환
        throw new Error('Insufficient data');
    } catch (error) {
        console.error('Failed to fetch top stocks:', error);

        // 데모 데이터 반환
        return NextResponse.json([
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 248.52,
                previousClose: 250.12,
                changePercent: -0.64,
                marketCap: 3.75e12,
                allTimeHigh: 260.10,
                drawdownPercent: 4.45,
                isDemo: true
            },
            {
                symbol: 'NVDA',
                name: 'NVIDIA Corporation',
                price: 134.25,
                previousClose: 136.52,
                changePercent: -1.66,
                marketCap: 3.30e12,
                allTimeHigh: 152.89,
                drawdownPercent: 12.19,
                isDemo: true
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                price: 428.50,
                previousClose: 430.10,
                changePercent: -0.37,
                marketCap: 3.18e12,
                allTimeHigh: 468.35,
                drawdownPercent: 8.51,
                isDemo: true
            },
            {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                price: 192.45,
                previousClose: 193.20,
                changePercent: -0.39,
                marketCap: 2.37e12,
                allTimeHigh: 201.42,
                drawdownPercent: 4.45,
                isDemo: true
            }
        ]);
    }
}
