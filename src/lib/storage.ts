// 포트폴리오 로컬스토리지 저장/불러오기

import { Portfolio, CrisisState, RateStatus } from './types';
import { initialCrisisState } from './ruleEngine';

const STORAGE_KEYS = {
    PORTFOLIO: 'jd-bot-portfolio',
    CRISIS_STATE: 'jd-bot-crisis-state',
    RATE_STATUS: 'jd-bot-rate-status',
    ALL_TIME_HIGH: 'jd-bot-ath',
    GEMINI_API_KEY: 'jd-bot-gemini-key',
};

// 포트폴리오 초기값
export const defaultPortfolio: Portfolio = {
    totalInvestment: 0,
    cashAmount: 0,
    holdings: []
};

// 포트폴리오 저장
export function savePortfolio(portfolio: Portfolio): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
}

// 포트폴리오 불러오기
export function loadPortfolio(): Portfolio {
    if (typeof window === 'undefined') return defaultPortfolio;
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    return saved ? JSON.parse(saved) : defaultPortfolio;
}

// 공황 상태 저장
export function saveCrisisState(state: CrisisState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CRISIS_STATE, JSON.stringify(state));
}

// 공황 상태 불러오기
export function loadCrisisState(): CrisisState {
    if (typeof window === 'undefined') return initialCrisisState;
    const saved = localStorage.getItem(STORAGE_KEYS.CRISIS_STATE);
    return saved ? JSON.parse(saved) : initialCrisisState;
}

// 금리 상태 저장
export function saveRateStatus(status: RateStatus): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.RATE_STATUS, status);
}

// 금리 상태 불러오기
export function loadRateStatus(): RateStatus {
    if (typeof window === 'undefined') return 'rising'; // 기본값: 금리인상기
    return (localStorage.getItem(STORAGE_KEYS.RATE_STATUS) as RateStatus) || 'rising';
}

// 전고점 저장
export function saveAllTimeHigh(symbol: string, ath: number): void {
    if (typeof window === 'undefined') return;
    const athMap = loadAllTimeHighMap();
    athMap[symbol] = ath;
    localStorage.setItem(STORAGE_KEYS.ALL_TIME_HIGH, JSON.stringify(athMap));
}

// 전고점 맵 불러오기
export function loadAllTimeHighMap(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(STORAGE_KEYS.ALL_TIME_HIGH);
    return saved ? JSON.parse(saved) : {};
}

// Gemini API 키 저장
export function saveGeminiApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
}

// Gemini API 키 불러오기
export function loadGeminiApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
}

// 모든 데이터 초기화
export function clearAllData(): void {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}
