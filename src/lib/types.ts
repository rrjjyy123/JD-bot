// 시장 데이터 및 포트폴리오 관련 타입 정의

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  marketCap: number;
  allTimeHigh: number;
  drawdownPercent: number; // 전고점 대비 하락률
}

export interface NasdaqData {
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  is3PercentDrop: boolean;
}

export interface TopStocks {
  first: StockData;
  second: StockData;
  third: StockData;
  fourth: StockData;
}

export type MarketStatus = 'normal' | 'crisis';
export type RateStatus = 'zero' | 'rising'; // 제로금리 / 금리인상기

export interface CrisisState {
  isActive: boolean;
  startDate: string | null;
  dropCount: number; // 한 달 내 -3% 발생 횟수
  waitDays: number; // 대기 일수 (31일 또는 61일)
  remainingDays: number;
}

export interface RebalancingZone {
  dropPercent: number;
  cashRatio: number;
  targetPrice: number;
}

export interface MalttukZone {
  dropPercent: number;
  stockRatio: number;
  targetPrice: number;
}

export interface Portfolio {
  totalInvestment: number; // 총 투자금 (USD)
  cashAmount: number; // 현금 보유액 (USD)
  holdings: Holding[];
}

export interface Holding {
  symbol: string;
  name: string;
  averagePrice: number;
  quantity: number;
  currentPrice?: number;
  currentValue?: number;
}

export interface ActionAdvice {
  status: MarketStatus;
  action: 'buy' | 'sell' | 'hold' | 'all-in';
  percentage?: number;
  reason: string;
  aiBriefing?: string;
}

export interface MarketOverview {
  nasdaq: NasdaqData;
  topStocks: TopStocks;
  marketStatus: MarketStatus;
  crisisState: CrisisState;
  rateStatus: RateStatus;
  currentZone: RebalancingZone | MalttukZone | null;
  advice: ActionAdvice;
  lastUpdated: string;
}
