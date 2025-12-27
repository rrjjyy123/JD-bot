'use client';

import { useEffect, useState } from 'react';
import { NasdaqData, StockData, MarketStatus, RateStatus, CrisisState, TopStocks, RebalancingZone, MalttukZone } from '@/lib/types';
import {
  detectTopChangeRisk,
  initialCrisisState,
  updateCrisisState,
  findCurrentRebalancingZone,
  findCurrentMalttukZone
} from '@/lib/ruleEngine';
import { getDemoBriefing } from '@/lib/geminiAI';
import {
  loadCrisisState,
  saveCrisisState,
  loadRateStatus,
  saveRateStatus,
  loadGeminiApiKey
} from '@/lib/storage';
import { formatPrice, formatChange, formatMarketCap } from '@/lib/marketData';

export default function Dashboard() {
  const [nasdaq, setNasdaq] = useState<NasdaqData | null>(null);
  const [topStocks, setTopStocks] = useState<TopStocks | null>(null);
  const [crisisState, setCrisisState] = useState<CrisisState>(initialCrisisState);
  const [rateStatus, setRateStatus] = useState<RateStatus>('rising');
  const [aiBriefing, setAiBriefing] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showTopTable, setShowTopTable] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    setCrisisState(loadCrisisState());
    setRateStatus(loadRateStatus());
  }, []);

  // 시장 데이터 가져오기
  useEffect(() => {
    async function fetchData() {
      try {
        const [nasdaqRes, topStocksRes] = await Promise.all([
          fetch('/api/nasdaq'),
          fetch('/api/top-stocks')
        ]);

        const nasdaqData = await nasdaqRes.json();
        const topStocksData = await topStocksRes.json();

        setNasdaq(nasdaqData);
        setTopStocks({
          first: topStocksData[0],
          second: topStocksData[1],
          third: topStocksData[2],
          fourth: topStocksData[3]
        });

        // 공황 상태 업데이트
        if (nasdaqData.is3PercentDrop) {
          const newCrisisState = updateCrisisState(crisisState, true, new Date());
          setCrisisState(newCrisisState);
          saveCrisisState(newCrisisState);
        }

        // AI 브리핑 생성 (서버 API 호출)
        const marketStatus: MarketStatus = nasdaqData.is3PercentDrop || crisisState.isActive ? 'crisis' : 'normal';

        try {
          const briefingRes = await fetch('/api/briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nasdaq: nasdaqData,
              topStock: topStocksData[0],
              marketStatus,
              rateStatus,
              crisisState
            })
          });

          const briefingData = await briefingRes.json();

          if (briefingData.briefing) {
            setAiBriefing(briefingData.briefing);
          } else {
            const fallback = getDemoBriefing(marketStatus, topStocksData[0].drawdownPercent, rateStatus);
            setAiBriefing(fallback);
          }
        } catch (err) {
          console.error('Final briefing fetch error:', err);
          const fallback = getDemoBriefing(marketStatus, topStocksData[0].drawdownPercent, rateStatus);
          setAiBriefing(fallback);
        }

      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, [crisisState, rateStatus]);

  // 금리 상태 변경
  const handleRateStatusChange = (status: RateStatus) => {
    setRateStatus(status);
    saveRateStatus(status);
  };

  // 공황 상태 수동 리셋
  const resetCrisis = () => {
    setCrisisState(initialCrisisState);
    saveCrisisState(initialCrisisState);
  };

  const marketStatus: MarketStatus = nasdaq?.is3PercentDrop || crisisState.isActive ? 'crisis' : 'normal';
  const topStock = topStocks?.first;
  const zone = topStock && marketStatus === 'normal'
    ? findCurrentRebalancingZone(topStock.price, topStock.allTimeHigh)
    : topStock
      ? findCurrentMalttukZone(topStock.price, topStock.allTimeHigh, rateStatus)
      : null;

  const topChangeRisk = topStocks
    ? detectTopChangeRisk(topStocks.first.marketCap, topStocks.second.marketCap)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">시장 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* 헤더 */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              JD-Bot
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">JD 매뉴얼 자동화 투자 비서</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-secondary"
            >
              ⚙️ 설정
            </button>
          </div>
        </div>
      </header>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="card mb-6 animate-slide-up">
          <h3 className="text-lg font-semibold mb-4">설정</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">금리 상태</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRateStatusChange('zero')}
                  className={`btn ${rateStatus === 'zero' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  제로금리 (-25% 표)
                </button>
                <button
                  onClick={() => handleRateStatusChange('rising')}
                  className={`btn ${rateStatus === 'rising' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  금리인상기 (-50% 표)
                </button>
              </div>
            </div>
            {crisisState.isActive && (
              <div>
                <button onClick={resetCrisis} className="btn btn-secondary">
                  ⚠️ 공황 상태 수동 리셋
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 상태 배지 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <span className={`badge ${marketStatus === 'normal' ? 'badge-safe' : 'badge-danger'}`}>
          {marketStatus === 'normal' ? '🟢 평시' : '🔴 공황'}
        </span>
        <span className="badge badge-neutral">
          {rateStatus === 'zero' ? '💰 제로금리' : '📈 금리인상기'}
        </span>
        {crisisState.isActive && crisisState.remainingDays > 0 && (
          <span className="badge badge-warning">
            ⏱️ 대기: {crisisState.remainingDays}일 남음
          </span>
        )}
        {topChangeRisk?.isRisky && (
          <span className="badge badge-warning">
            ⚠️ 1등 교체 가능성 ({topChangeRisk.difference.toFixed(1)}% 차이)
          </span>
        )}
      </div>

      {/* 대시보드 그리드 */}
      <div className="grid-dashboard">
        {/* 나스닥 카드 */}
        <div className={`card ${nasdaq?.is3PercentDrop ? 'border-[var(--color-danger)]' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">나스닥 종합</h3>
            {nasdaq?.is3PercentDrop && (
              <span className="badge badge-danger">🚨 -3% 발생!</span>
            )}
          </div>
          {nasdaq && (
            <>
              <div className="text-3xl font-bold mb-2">
                {formatPrice(nasdaq.currentPrice)}
              </div>
              <div className={`text-lg ${nasdaq.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                {formatChange(nasdaq.changePercent)}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                전일 종가: {formatPrice(nasdaq.previousClose)}
              </p>
            </>
          )}
        </div>

        {/* 1등 주식 카드 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">세계 1등 주식</h3>
            <button
              onClick={() => setShowTopTable(!showTopTable)}
              className="text-sm text-[var(--color-primary)]"
            >
              {showTopTable ? '닫기' : '상위 4개 보기'}
            </button>
          </div>
          {topStock && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">{topStock.symbol}</span>
                <span className="text-[var(--text-secondary)]">{topStock.name}</span>
              </div>
              <div className="text-3xl font-bold mb-2">
                {formatPrice(topStock.price)}
              </div>
              <div className={`text-lg ${topStock.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                {formatChange(topStock.changePercent)}
              </div>
              <div className="mt-4 p-3 bg-[var(--bg-primary)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)] mb-1">전고점 대비</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-semibold price-down">
                    -{topStock.drawdownPercent.toFixed(2)}%
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    ATH: {formatPrice(topStock.allTimeHigh)}
                  </span>
                </div>
                {/* 프로그레스 바 */}
                <div className="progress-bar mt-2">
                  <div
                    className={`progress-bar-fill ${topStock.drawdownPercent < 10 ? 'progress-safe' :
                      topStock.drawdownPercent < 20 ? 'progress-warning' : 'progress-danger'
                      }`}
                    style={{ width: `${Math.min(topStock.drawdownPercent * 2, 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 행동 지침 카드 */}
        <div className="card md:col-span-2 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">📋 오늘의 행동 지침</h3>
          {topStock && (
            <>
              {zone && (
                <div className={`p-4 rounded-lg mb-4 ${marketStatus === 'normal'
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                  <p className="font-semibold mb-2">
                    {marketStatus === 'normal' ? '📤 리밸런싱' : '📥 말뚝박기'}
                    구간: -{zone.dropPercent.toFixed(1)}%
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    {marketStatus === 'normal'
                      ? `현금 비율을 ${(zone as RebalancingZone).cashRatio}%로 맞추세요 (매도)`
                      : `주식 비율을 ${(zone as MalttukZone).stockRatio}%로 맞추세요 (매수)`
                    }
                  </p>
                </div>
              )}
              {!zone && (
                <div className="p-4 rounded-lg mb-4 bg-green-500/10 border border-green-500/30">
                  <p className="font-semibold">✅ 현재 포지션 유지</p>
                  <p className="text-[var(--text-secondary)]">
                    전고점 대비 하락률이 첫 구간 진입 전입니다.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 상위 4개 기업 테이블 */}
      {showTopTable && topStocks && (
        <div className="card mt-6 animate-slide-up">
          <h3 className="text-lg font-semibold mb-4">시가총액 상위 4개 기업</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>종목</th>
                  <th>현재가</th>
                  <th>변동률</th>
                  <th>시가총액</th>
                  <th>전고점 대비</th>
                </tr>
              </thead>
              <tbody>
                {[topStocks.first, topStocks.second, topStocks.third, topStocks.fourth].map((stock, idx) => (
                  <tr key={stock.symbol}>
                    <td className="font-semibold">{idx + 1}</td>
                    <td>
                      <div>
                        <span className="font-semibold">{stock.symbol}</span>
                        <p className="text-xs text-[var(--text-secondary)]">{stock.name}</p>
                      </div>
                    </td>
                    <td>{formatPrice(stock.price)}</td>
                    <td className={stock.changePercent >= 0 ? 'price-up' : 'price-down'}>
                      {formatChange(stock.changePercent)}
                    </td>
                    <td>{formatMarketCap(stock.marketCap)}</td>
                    <td className="price-down">-{stock.drawdownPercent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI 브리핑 */}
      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg font-semibold">AI 투자 비서 브리핑</h3>
        </div>
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
          <div className="whitespace-pre-line leading-relaxed">
            {aiBriefing}
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3">
          ⚠️ 이 AI 브리핑은 JD 매뉴얼을 참고한 것이며, 실제 투자 결정에 대한 책임은 본인에게 있습니다.
        </p>
      </div>

      {/* 포트폴리오 버튼 */}
      <div className="mt-6 text-center">
        <a href="/portfolio" className="btn btn-primary">
          💼 내 포트폴리오 관리
        </a>
      </div>

      {/* 푸터 */}
      <footer className="mt-12 text-center text-sm text-[var(--text-secondary)]">
        <p>JD 부자연구소 매뉴얼 기반 · 투자의 책임은 본인에게 있습니다</p>
        <p className="mt-1">
          마지막 업데이트: {new Date().toLocaleString('ko-KR')}
        </p>
      </footer>
    </main>
  );
}
