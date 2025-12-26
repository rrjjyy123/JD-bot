// Gemini 2.5 Flash를 활용한 AI 투자 비서

import { StockData, NasdaqData, MarketStatus, RateStatus, CrisisState } from './types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
}

// JD 매뉴얼 기반 프롬프트 생성
function buildPrompt(
    nasdaq: NasdaqData,
    topStock: StockData,
    marketStatus: MarketStatus,
    rateStatus: RateStatus,
    crisisState: CrisisState
): string {
    const statusKorean = marketStatus === 'normal' ? '평시' : '공황';
    const rateKorean = rateStatus === 'zero' ? '제로금리' : '금리인상기';

    let contextInfo = `현재 나스닥은 전일 대비 ${nasdaq.changePercent.toFixed(2)}% ${nasdaq.changePercent >= 0 ? '상승' : '하락'}했고, `;

    if (nasdaq.is3PercentDrop) {
        contextInfo += `-3% 룰이 발생하여 공황 상태입니다. `;
    } else {
        contextInfo += `-3% 룰은 적용되지 않는 ${statusKorean} 상황입니다. `;
    }

    contextInfo += `세계 1등 주식(${topStock.name})은 전고점 대비 ${topStock.drawdownPercent.toFixed(1)}% 하락했습니다. `;
    contextInfo += `현재 금리 상황은 ${rateKorean}입니다. `;

    if (crisisState.isActive && crisisState.remainingDays > 0) {
        contextInfo += `공황 대기 기간이 ${crisisState.remainingDays}일 남았습니다. `;
        contextInfo += `지난 한 달간 -3%가 ${crisisState.dropCount}회 발생했습니다. `;
    }

    const tableReference = marketStatus === 'normal'
        ? '리밸런싱 -2.5% 표 (2.5% 떨어질 때마다 10%씩 매도)'
        : rateStatus === 'zero'
            ? '말뚝박기 -25% 표 (2.5% 떨어질 때마다 10%씩 매수)'
            : '말뚝박기 -50% 표 (5% 떨어질 때마다 10%씩 매수)';

    return `당신은 JD 부자연구소의 투자 매뉴얼을 완벽히 숙지한 AI 투자 비서입니다.
감정을 배제하고 매뉴얼에 따라 기계적으로 행동 지침을 제시해야 합니다.

${contextInfo}

JD 매뉴얼 '${tableReference}'에 따르면 지금 사용자는 어떤 행동을 취해야 하는지 
명확하고 간결하게 3줄로 요약해주세요.

형식:
1. [현재 상황 한 줄 요약]
2. [오늘 취해야 할 행동]
3. [주의사항 또는 다음 관찰 포인트]

존댓말로 답변하고, 구체적인 비율이나 숫자를 포함해주세요.`;
}

// Gemini API 호출
export async function generateAIBriefing(
    nasdaq: NasdaqData,
    topStock: StockData,
    marketStatus: MarketStatus,
    rateStatus: RateStatus,
    crisisState: CrisisState,
    apiKey: string
): Promise<string> {
    const prompt = buildPrompt(nasdaq, topStock, marketStatus, rateStatus, crisisState);

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3, // 낮은 창의성으로 일관된 답변
                    maxOutputTokens: 500,
                    topP: 0.8,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || '브리핑 생성에 실패했습니다.';
    } catch (error) {
        console.error('Gemini API error:', error);
        return '브리핑 생성 중 오류가 발생했습니다.';
    }
}

// 데모용 AI 브리핑 (API 키 없을 때)
export function getDemoBriefing(
    marketStatus: MarketStatus,
    drawdownPercent: number,
    rateStatus: RateStatus
): string {
    if (marketStatus === 'normal') {
        if (drawdownPercent < 2.5) {
            return `1. 현재 평시 상태이며, 1등 주식은 전고점 근처에 있습니다.
2. 별도의 매매 행동 없이 현재 포지션을 유지하세요.
3. 나스닥 -3% 또는 2.5% 하락 시 다음 행동을 준비하세요.`;
        }
        const cashRatio = Math.min(Math.ceil(drawdownPercent / 2.5) * 10, 100);
        return `1. 평시 상태에서 1등 주식이 전고점 대비 ${drawdownPercent.toFixed(1)}% 하락했습니다.
2. 리밸런싱 매뉴얼에 따라 현금 비율을 ${cashRatio}%로 맞추세요.
3. 추가 하락 시 다음 구간 매도를 준비하고, 2구간 상승 시 재매수하세요.`;
    }

    // 공황 상태
    const buyRatio = rateStatus === 'zero'
        ? Math.min(Math.ceil(drawdownPercent / 2.5) * 10, 100)
        : Math.min(Math.ceil((drawdownPercent - 5) / 5) * 10, 100);

    return `1. 공황 상태입니다. 나스닥 -3%가 발생했습니다.
2. 말뚝박기 매뉴얼에 따라 주식 비율을 ${Math.max(0, buyRatio)}%로 맞추세요.
3. 장중 기준으로 자동매수를 설정하고, 2구간 상승 시 V자 반등 리밸런싱을 준비하세요.`;
}
