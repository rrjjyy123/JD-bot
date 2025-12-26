// JD 매뉴얼 규칙 엔진 - 리밸런싱, 말뚝박기, V자 반등 로직

import {
    StockData,
    MarketStatus,
    RateStatus,
    CrisisState,
    RebalancingZone,
    MalttukZone,
    ActionAdvice
} from './types';

// 리밸런싱 -25% 표 (평시, 종가 기준)
// 2.5% 떨어질 때마다 10%씩 매도하여 현금 확보
export function generateRebalancingTable(allTimeHigh: number): RebalancingZone[] {
    const zones: RebalancingZone[] = [];
    for (let i = 1; i <= 10; i++) {
        const dropPercent = i * 2.5;
        zones.push({
            dropPercent,
            cashRatio: i * 10, // 10%, 20%, ... 100%
            targetPrice: allTimeHigh * (1 - dropPercent / 100)
        });
    }
    return zones;
}

// 말뚝박기 -25% 표 (제로금리 시, 장중 기준)
// 2.5% 떨어질 때마다 10%씩 매수
export function generateMalttuk25Table(allTimeHigh: number): MalttukZone[] {
    const zones: MalttukZone[] = [];
    for (let i = 1; i <= 10; i++) {
        const dropPercent = i * 2.5;
        zones.push({
            dropPercent,
            stockRatio: i * 10, // 10%, 20%, ... 100%
            targetPrice: allTimeHigh * (1 - dropPercent / 100)
        });
    }
    return zones;
}

// 말뚝박기 -50% 표 (금리인상기, 장중 기준)
// 5% 떨어질 때마다 10%씩 매수
export function generateMalttuk50Table(allTimeHigh: number): MalttukZone[] {
    const zones: MalttukZone[] = [];
    // -5%에서는 0% (모두 현금)
    zones.push({
        dropPercent: 5,
        stockRatio: 0,
        targetPrice: allTimeHigh * 0.95
    });
    // -10%부터 10%씩 증가
    for (let i = 1; i <= 10; i++) {
        const dropPercent = 5 + i * 5; // 10%, 15%, ... 55%
        zones.push({
            dropPercent,
            stockRatio: i * 10, // 10%, 20%, ... 100%
            targetPrice: allTimeHigh * (1 - dropPercent / 100)
        });
    }
    return zones;
}

// 현재 주가가 어느 구간에 있는지 찾기 (리밸런싱)
export function findCurrentRebalancingZone(
    currentPrice: number,
    allTimeHigh: number
): RebalancingZone | null {
    const table = generateRebalancingTable(allTimeHigh);
    const drawdown = ((allTimeHigh - currentPrice) / allTimeHigh) * 100;

    if (drawdown < 2.5) return null; // 아직 구간 진입 안함

    // 가장 가까운 구간 찾기
    for (let i = table.length - 1; i >= 0; i--) {
        if (drawdown >= table[i].dropPercent) {
            return table[i];
        }
    }
    return table[0];
}

// 현재 주가가 어느 구간에 있는지 찾기 (말뚝박기)
export function findCurrentMalttukZone(
    currentPrice: number,
    allTimeHigh: number,
    rateStatus: RateStatus
): MalttukZone | null {
    const table = rateStatus === 'zero'
        ? generateMalttuk25Table(allTimeHigh)
        : generateMalttuk50Table(allTimeHigh);

    const drawdown = ((allTimeHigh - currentPrice) / allTimeHigh) * 100;
    const threshold = rateStatus === 'zero' ? 2.5 : 5;

    if (drawdown < threshold) return null;

    for (let i = table.length - 1; i >= 0; i--) {
        if (drawdown >= table[i].dropPercent) {
            return table[i];
        }
    }
    return table[0];
}

// 나스닥 -3% 감지
export function detectCrisis(nasdaqChangePercent: number): boolean {
    return nasdaqChangePercent <= -3;
}

// 공황 상태 업데이트
export function updateCrisisState(
    currentState: CrisisState,
    is3PercentDrop: boolean,
    currentDate: Date
): CrisisState {
    if (!is3PercentDrop && !currentState.isActive) {
        return currentState;
    }

    if (is3PercentDrop) {
        const newDropCount = currentState.isActive ? currentState.dropCount + 1 : 1;
        const waitDays = newDropCount >= 4 ? 62 : 32; // 4번 이상이면 2달+1일

        return {
            isActive: true,
            startDate: currentState.startDate || currentDate.toISOString(),
            dropCount: newDropCount,
            waitDays,
            remainingDays: waitDays
        };
    }

    // 공황 진행 중 - 남은 일수 계산
    if (currentState.isActive && currentState.startDate) {
        const startDate = new Date(currentState.startDate);
        const daysPassed = Math.floor(
            (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const remainingDays = Math.max(0, currentState.waitDays - daysPassed);

        if (remainingDays <= 0) {
            // 공황 종료
            return {
                isActive: false,
                startDate: null,
                dropCount: 0,
                waitDays: 0,
                remainingDays: 0
            };
        }

        return {
            ...currentState,
            remainingDays
        };
    }

    return currentState;
}

// V자 반등 감지 (2구간 상승)
export function detectVShapeRebound(
    currentPrice: number,
    lowestPrice: number,
    allTimeHigh: number,
    rateStatus: RateStatus
): boolean {
    const zoneSize = rateStatus === 'zero' ? 2.5 : 5;
    const twoZonesUp = allTimeHigh * (zoneSize * 2) / 100;

    return currentPrice >= lowestPrice + twoZonesUp;
}

// 1등 교체 가능성 감지
export function detectTopChangeRisk(
    firstMarketCap: number,
    secondMarketCap: number
): { isRisky: boolean; difference: number } {
    const difference = ((firstMarketCap - secondMarketCap) / firstMarketCap) * 100;
    return {
        isRisky: difference <= 10,
        difference
    };
}

// 행동 지침 생성
export function generateActionAdvice(
    stock: StockData,
    marketStatus: MarketStatus,
    crisisState: CrisisState,
    rateStatus: RateStatus
): ActionAdvice {
    const drawdown = stock.drawdownPercent;

    // 평시 상태 - 리밸런싱
    if (marketStatus === 'normal') {
        const zone = findCurrentRebalancingZone(stock.price, stock.allTimeHigh);

        if (!zone) {
            return {
                status: 'normal',
                action: 'hold',
                reason: '전고점 대비 하락률이 2.5% 미만입니다. 현재 포지션 유지.'
            };
        }

        return {
            status: 'normal',
            action: 'sell',
            percentage: zone.cashRatio,
            reason: `전고점 대비 ${zone.dropPercent.toFixed(1)}% 하락 구간입니다. 리밸런싱에 따라 현금 비율을 ${zone.cashRatio}%로 맞추세요.`
        };
    }

    // 공황 상태 - 말뚝박기
    const zone = findCurrentMalttukZone(stock.price, stock.allTimeHigh, rateStatus);

    if (!zone) {
        const threshold = rateStatus === 'zero' ? 2.5 : 5;
        return {
            status: 'crisis',
            action: 'hold',
            reason: `공황 상태이지만 아직 ${threshold}% 하락하지 않았습니다. 대기.`
        };
    }

    return {
        status: 'crisis',
        action: 'buy',
        percentage: zone.stockRatio,
        reason: `공황 중 ${zone.dropPercent.toFixed(1)}% 하락 구간입니다. 말뚝박기에 따라 주식 비율을 ${zone.stockRatio}%로 맞추세요.`
    };
}

// 초기 공황 상태
export const initialCrisisState: CrisisState = {
    isActive: false,
    startDate: null,
    dropCount: 0,
    waitDays: 0,
    remainingDays: 0
};
