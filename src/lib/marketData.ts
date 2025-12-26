// 시장 데이터 가져오기 (Yahoo Finance API)

import { NasdaqData, StockData, TopStocks } from './types';

// 시가총액 기준 상위 기업 목록 (수동 업데이트 필요)
const TOP_COMPANIES = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
];

// Yahoo Finance API를 통해 주식 데이터 가져오기
export async function fetchStockData(symbol: string): Promise<StockData | null> {
    try {
        // Yahoo Finance API (cors-anywhere 프록시 사용 또는 서버 사이드)
        const response = await fetch(
            `/api/stock?symbol=${symbol}`,
            { next: { revalidate: 60 } } // 1분마다 캐시 갱신
        );

        if (!response.ok) throw new Error('Failed to fetch stock data');

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return null;
    }
}

// 나스닥 지수 데이터 가져오기
export async function fetchNasdaqData(): Promise<NasdaqData | null> {
    try {
        const response = await fetch('/api/nasdaq', { next: { revalidate: 60 } });

        if (!response.ok) throw new Error('Failed to fetch nasdaq data');

        const data = await response.json();
        return {
            currentPrice: data.price,
            previousClose: data.previousClose,
            changePercent: data.changePercent,
            is3PercentDrop: data.changePercent <= -3
        };
    } catch (error) {
        console.error('Error fetching nasdaq:', error);
        return null;
    }
}

// 시가총액 상위 4개 기업 데이터 가져오기
export async function fetchTopStocks(): Promise<TopStocks | null> {
    try {
        const response = await fetch('/api/top-stocks', { next: { revalidate: 300 } }); // 5분마다

        if (!response.ok) throw new Error('Failed to fetch top stocks');

        const stocks = await response.json();
        return {
            first: stocks[0],
            second: stocks[1],
            third: stocks[2],
            fourth: stocks[3]
        };
    } catch (error) {
        console.error('Error fetching top stocks:', error);
        return null;
    }
}

// 데모용 더미 데이터 (API 호출 실패 시 또는 개발 중)
export function getDemoNasdaqData(): NasdaqData {
    return {
        currentPrice: 19432.12,
        previousClose: 19678.45,
        changePercent: -1.25,
        is3PercentDrop: false
    };
}

export function getDemoTopStocks(): TopStocks {
    return {
        first: {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 248.52,
            previousClose: 250.12,
            changePercent: -0.64,
            marketCap: 3.75e12,
            allTimeHigh: 260.10,
            drawdownPercent: 4.45
        },
        second: {
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            price: 134.25,
            previousClose: 136.52,
            changePercent: -1.66,
            marketCap: 3.30e12,
            allTimeHigh: 152.89,
            drawdownPercent: 12.19
        },
        third: {
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            price: 428.50,
            previousClose: 430.10,
            changePercent: -0.37,
            marketCap: 3.18e12,
            allTimeHigh: 468.35,
            drawdownPercent: 8.51
        },
        fourth: {
            symbol: 'GOOGL',
            name: 'Alphabet Inc.',
            price: 192.45,
            previousClose: 193.20,
            changePercent: -0.39,
            marketCap: 2.37e12,
            allTimeHigh: 201.42,
            drawdownPercent: 4.45
        }
    };
}

// 시가총액 포맷팅 (조 단위)
export function formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) {
        return `$${(marketCap / 1e12).toFixed(2)}T`;
    }
    if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(2)}B`;
    }
    return `$${(marketCap / 1e6).toFixed(2)}M`;
}

// 가격 변동 포맷팅
export function formatChange(changePercent: number): string {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
}

// 가격 포맷팅
export function formatPrice(price: number): string {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
