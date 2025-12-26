'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Portfolio, Holding, RateStatus, MarketStatus } from '@/lib/types';
import { loadPortfolio, savePortfolio, loadRateStatus } from '@/lib/storage';
import { formatPrice } from '@/lib/marketData';
import { generateRebalancingTable, generateMalttuk25Table, generateMalttuk50Table } from '@/lib/ruleEngine';

export default function PortfolioPage() {
    const [portfolio, setPortfolio] = useState<Portfolio>({
        totalInvestment: 0,
        cashAmount: 0,
        holdings: []
    });
    const [rateStatus, setRateStatus] = useState<RateStatus>('rising');
    const [topStockATH, setTopStockATH] = useState<number>(260); // 기본값
    const [showTable, setShowTable] = useState<'rebalancing' | 'malttuk' | null>(null);

    useEffect(() => {
        setPortfolio(loadPortfolio());
        setRateStatus(loadRateStatus());

        // 1등 주식의 전고점 가져오기
        fetch('/api/top-stocks')
            .then(res => res.json())
            .then(data => {
                if (data[0]?.allTimeHigh) {
                    setTopStockATH(data[0].allTimeHigh);
                }
            })
            .catch(console.error);
    }, []);

    const handleSave = () => {
        savePortfolio(portfolio);
        alert('포트폴리오가 저장되었습니다.');
    };

    const updatePortfolio = (updates: Partial<Portfolio>) => {
        setPortfolio(prev => ({ ...prev, ...updates }));
    };

    const addHolding = () => {
        setPortfolio(prev => ({
            ...prev,
            holdings: [...prev.holdings, { symbol: '', name: '', averagePrice: 0, quantity: 0 }]
        }));
    };

    const updateHolding = (index: number, updates: Partial<Holding>) => {
        setPortfolio(prev => ({
            ...prev,
            holdings: prev.holdings.map((h, i) => i === index ? { ...h, ...updates } : h)
        }));
    };

    const removeHolding = (index: number) => {
        setPortfolio(prev => ({
            ...prev,
            holdings: prev.holdings.filter((_, i) => i !== index)
        }));
    };

    // 총 주식 가치 계산
    const totalStockValue = portfolio.holdings.reduce((sum, h) => {
        return sum + (h.averagePrice * h.quantity);
    }, 0);

    // 총 자산
    const totalAssets = totalStockValue + portfolio.cashAmount;

    // 현재 비율
    const stockRatio = totalAssets > 0 ? (totalStockValue / totalAssets) * 100 : 0;
    const cashRatio = totalAssets > 0 ? (portfolio.cashAmount / totalAssets) * 100 : 0;

    // 리밸런싱/말뚝박기 테이블
    const rebalancingTable = generateRebalancingTable(topStockATH);
    const malttukTable = rateStatus === 'zero'
        ? generateMalttuk25Table(topStockATH)
        : generateMalttuk50Table(topStockATH);

    return (
        <main className="min-h-screen p-4 md:p-6 lg:p-8">
            {/* 헤더 */}
            <header className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-2 inline-block">
                            ← 대시보드로 돌아가기
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold">💼 내 포트폴리오</h1>
                    </div>
                    <button onClick={handleSave} className="btn btn-primary">
                        💾 저장
                    </button>
                </div>
            </header>

            {/* 자산 요약 */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">자산 요약</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-[var(--text-secondary)]">총 투자금</p>
                        <p className="text-xl font-bold">{formatPrice(portfolio.totalInvestment)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-secondary)]">주식 가치</p>
                        <p className="text-xl font-bold text-[var(--color-primary)]">{formatPrice(totalStockValue)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-secondary)]">현금 보유</p>
                        <p className="text-xl font-bold text-[var(--color-safe)]">{formatPrice(portfolio.cashAmount)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-secondary)]">총 자산</p>
                        <p className="text-xl font-bold">{formatPrice(totalAssets)}</p>
                    </div>
                </div>

                {/* 비율 차트 */}
                <div className="mt-6">
                    <p className="text-sm text-[var(--text-secondary)] mb-2">자산 배분</p>
                    <div className="h-8 rounded-lg overflow-hidden flex">
                        <div
                            className="bg-[var(--color-primary)] flex items-center justify-center text-sm font-semibold"
                            style={{ width: `${stockRatio}%` }}
                        >
                            {stockRatio > 10 && `주식 ${stockRatio.toFixed(1)}%`}
                        </div>
                        <div
                            className="bg-[var(--color-safe)] flex items-center justify-center text-sm font-semibold"
                            style={{ width: `${cashRatio}%` }}
                        >
                            {cashRatio > 10 && `현금 ${cashRatio.toFixed(1)}%`}
                        </div>
                    </div>
                </div>
            </div>

            {/* 입력 폼 */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* 기본 정보 */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                총 투자금 (USD)
                            </label>
                            <input
                                type="number"
                                className="input"
                                value={portfolio.totalInvestment || ''}
                                onChange={(e) => updatePortfolio({ totalInvestment: Number(e.target.value) })}
                                placeholder="예: 100000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                현금 보유액 (USD)
                            </label>
                            <input
                                type="number"
                                className="input"
                                value={portfolio.cashAmount || ''}
                                onChange={(e) => updatePortfolio({ cashAmount: Number(e.target.value) })}
                                placeholder="예: 20000"
                            />
                        </div>
                    </div>
                </div>

                {/* 보유 종목 */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">보유 종목</h3>
                        <button onClick={addHolding} className="btn btn-secondary text-sm">
                            + 종목 추가
                        </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {portfolio.holdings.length === 0 && (
                            <p className="text-[var(--text-secondary)] text-center py-4">
                                보유 종목이 없습니다
                            </p>
                        )}
                        {portfolio.holdings.map((holding, index) => (
                            <div key={index} className="p-3 bg-[var(--bg-primary)] rounded-lg">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input
                                        type="text"
                                        className="input text-sm"
                                        value={holding.symbol}
                                        onChange={(e) => updateHolding(index, { symbol: e.target.value.toUpperCase() })}
                                        placeholder="티커 (예: AAPL)"
                                    />
                                    <input
                                        type="text"
                                        className="input text-sm"
                                        value={holding.name}
                                        onChange={(e) => updateHolding(index, { name: e.target.value })}
                                        placeholder="종목명"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="number"
                                        className="input text-sm"
                                        value={holding.averagePrice || ''}
                                        onChange={(e) => updateHolding(index, { averagePrice: Number(e.target.value) })}
                                        placeholder="평균 단가"
                                    />
                                    <input
                                        type="number"
                                        className="input text-sm"
                                        value={holding.quantity || ''}
                                        onChange={(e) => updateHolding(index, { quantity: Number(e.target.value) })}
                                        placeholder="수량"
                                    />
                                    <button
                                        onClick={() => removeHolding(index)}
                                        className="btn btn-danger text-sm"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 매뉴얼 표 보기 */}
            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">JD 매뉴얼 표</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    1등 주식 전고점 기준: {formatPrice(topStockATH)}
                </p>
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setShowTable(showTable === 'rebalancing' ? null : 'rebalancing')}
                        className={`btn ${showTable === 'rebalancing' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        📤 리밸런싱 -25% 표
                    </button>
                    <button
                        onClick={() => setShowTable(showTable === 'malttuk' ? null : 'malttuk')}
                        className={`btn ${showTable === 'malttuk' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        📥 말뚝박기 {rateStatus === 'zero' ? '-25%' : '-50%'} 표
                    </button>
                </div>

                {showTable === 'rebalancing' && (
                    <div className="overflow-x-auto animate-slide-up">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                            ※ 평시 상태에서 사용. 종가 기준으로 매도.
                        </p>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>하락률</th>
                                    <th>목표가</th>
                                    <th>현금 비율</th>
                                    <th>주식 비율</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rebalancingTable.map((zone) => (
                                    <tr key={zone.dropPercent}>
                                        <td className="price-down">-{zone.dropPercent.toFixed(1)}%</td>
                                        <td>{formatPrice(zone.targetPrice)}</td>
                                        <td className="text-[var(--color-safe)]">{zone.cashRatio}%</td>
                                        <td>{100 - zone.cashRatio}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showTable === 'malttuk' && (
                    <div className="overflow-x-auto animate-slide-up">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                            ※ 공황 상태(-3% 발생)에서 사용. 장중 기준으로 매수.
                        </p>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>하락률</th>
                                    <th>목표가</th>
                                    <th>주식 비율</th>
                                    <th>현금 비율</th>
                                </tr>
                            </thead>
                            <tbody>
                                {malttukTable.map((zone) => (
                                    <tr key={zone.dropPercent}>
                                        <td className="price-down">-{zone.dropPercent.toFixed(1)}%</td>
                                        <td>{formatPrice(zone.targetPrice)}</td>
                                        <td className="text-[var(--color-primary)]">{zone.stockRatio}%</td>
                                        <td>{100 - zone.stockRatio}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 권장 배분 */}
            {totalAssets > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">📊 매뉴얼 기준 권장 배분</h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                        현재 상황에 맞는 자산 배분을 확인하세요. 정확한 배분은 대시보드에서 확인한 구간을 참고하세요.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--bg-primary)] rounded-lg">
                            <p className="text-sm text-[var(--text-secondary)] mb-2">현재 배분</p>
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="text-lg font-bold text-[var(--color-primary)]">{stockRatio.toFixed(1)}%</span>
                                    <p className="text-xs text-[var(--text-secondary)]">주식</p>
                                </div>
                                <div className="text-2xl text-[var(--text-secondary)]">:</div>
                                <div>
                                    <span className="text-lg font-bold text-[var(--color-safe)]">{cashRatio.toFixed(1)}%</span>
                                    <p className="text-xs text-[var(--text-secondary)]">현금</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-[var(--bg-primary)] rounded-lg">
                            <p className="text-sm text-[var(--text-secondary)] mb-2">조정 필요 시</p>
                            <p className="text-sm">
                                대시보드에서 현재 구간을 확인하고, 해당 구간의 비율에 맞게 조정하세요.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 푸터 */}
            <footer className="mt-12 text-center text-sm text-[var(--text-secondary)]">
                <p>JD 부자연구소 매뉴얼 기반 · 투자의 책임은 본인에게 있습니다</p>
            </footer>
        </main>
    );
}
