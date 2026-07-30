/**
 * 宿友 - API 服务层
 * AI房源分析 + 房源推荐 + 室友匹配
 *
 * 架构设计：
 * - 本地规则引擎：核心分析（可靠、稳定、毫秒级）
 * - SiliconFlow API：增强总结（有API时输出更智能的总结文案）
 *
 * 免费注册：https://cloud.siliconflow.cn
 */

// ============================================================
// 第一部分：SiliconFlow API 调用（AI总结增强）
// ============================================================

async function callSiliconFlow(systemPrompt, userPrompt, options = {}) {
  const cfg = typeof SILICONFLOW_CONFIG !== 'undefined' ? SILICONFLOW_CONFIG : {};
  const API_KEY = cfg.API_KEY;
  const DIRECT_URL = cfg.BASE_URL || 'https://api.siliconflow.cn/v1/chat/completions';
  const PROXY_URL = (cfg.PROXY_URL || '').replace(/\/$/, '') + '/v1/chat/completions';
  const MODEL = options.model || cfg.MODEL || 'Qwen/Qwen2.5-7B-Instruct';
  const USE_PROXY = cfg.USE_PROXY === true;

  if (!cfg.USE_REAL_API) return null;

  // 直连模式需要 API Key
  if (!USE_PROXY && (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE')) return null;

  // 代理模式需要 PROXY_URL
  if (USE_PROXY && !cfg.PROXY_URL) return null;

  const API_URL = USE_PROXY ? PROXY_URL : DIRECT_URL;
  const headers = { 'Content-Type': 'application/json' };
  if (!USE_PROXY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  // 代理模式不需要 Authorization 头，Key 在服务端环境变量里

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 600
      })
    });

    if (!resp.ok) {
      console.warn('[宿友] API 请求失败:', resp.status);
      return null;
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn('[宿友] API 调用失败:', e.message);
    return null;
  }
}


// ============================================================
// 第二部分：AI 房源分析（规则引擎 + API增强）
// ============================================================

// 风险关键词库
const RISK_KEYWORDS = {
  agentSignals: ['中介', '经纪人', '连锁品牌', '品牌公寓', '托管', '房源有限', '手慢无', '错过不再', '限时优惠', '仅此一套'],
  fakeSignals: ['精装修', '豪华装修', '拎包入住', '随时入住', '房东出国', '低于市场价', '亏本甩租', '超低价', '急租'],
  depositTraps: ['押二付一', '押三付一', '押一付三', '半年付', '年付', '物业费另算', '服务费另算', '管理费另算'],
  hiddenIssues: ['仅限女生', '仅限男生', '谢绝宠物', '不租给情侣', '无中介费', '个人房源']
};

/**
 * 主入口：先用规则引擎分析，再用API增强总结
 */
async function analyzeWithAI(description, houseInfo = null) {
  // 1. 规则引擎核心分析（100%可靠）
  const result = localAnalyze(description, houseInfo);

  // 2. API 增强总结（有则更智能，无则用规则引擎的结果）
  try {
    const enhancedSummary = await enhanceWithAI(description, houseInfo, result);
    if (enhancedSummary) {
      result.aiSummary = enhancedSummary;
      result.source = 'enhanced';
    }
  } catch (e) {
    // API 失败完全不影响结果
  }

  result.analyzedAt = new Date().toLocaleString();
  return result;
}

/**
 * API 增强：生成更智能的总结文案
 */
async function enhanceWithAI(description, houseInfo, localResult) {
  const riskCount = localResult.risks.length;
  const safeCount = localResult.safeSignals.length;

  const prompt = `你是一个租房顾问。给学生的租房建议，简短、实用、说人话。

房源描述：${description}
风险数：${riskCount}项
靠谱信号数：${safeCount}项
综合评分：${localResult.score}分
推荐结论：${localResult.recommendation}

请用1-2句话给出建议，口语化一点，像朋友在给建议。
不要评价"描述清晰"之类，直接说重点。`;

  const result = await callSiliconFlow(
    '你是一个懂租房的朋友，说话简洁直接。',
    prompt,
    { temperature: 0.5, maxTokens: 200 }
  );

  if (result && result.length > 5 && result.length < 200) {
    return result;
  }
  return null;
}


// ============================================================
// 本地规则引擎（核心分析逻辑）
// ============================================================

function localAnalyze(description, houseInfo = null) {
  const text = (description || '').toLowerCase();
  const tags = (houseInfo?.tags || []).join(' ');
  const combined = (text + ' ' + tags).toLowerCase();

  const risks = [];
  const safes = [];

  // --- 风险检测 ---
  if ((combined.includes('精装修') || combined.includes('豪华装修')) &&
      !combined.includes('实拍') && !combined.includes('视频')) {
    risks.push({ type: 'fake', content: '"精装修/豪华装修"描述未配实拍证据，建议实地确认装修情况，谨防"照骗"' });
  }
  if (combined.includes('急租') || combined.includes('低价甩租') || combined.includes('低于市场价')) {
    risks.push({ type: 'price', content: '"急租/低于市场价"可能是吸引眼球的营销话术，建议对比同地段房源均价' });
  }
  if ((combined.includes('押二付一') || combined.includes('押三付一') ||
       combined.includes('押一付三') || combined.includes('半年付') || combined.includes('年付')) &&
      !combined.includes('押一付一')) {
    risks.push({ type: 'deposit', content: '押金/付款方式高于市场常规（押一付一），建议协商降低押金门槛' });
  }
  if (combined.includes('仅限女生')) {
    risks.push({ type: 'discrimination', content: '"仅限女生"可能隐含安全隐患或房东对租客的过度筛选，建议了解具体原因' });
  }
  if (combined.includes('中介') && !combined.includes('免中介费') && !combined.includes('免佣')) {
    risks.push({ type: 'agent', content: '该房源由中介发布，注意确认是否含中介费（通常为月租金的30%-100%）' });
  }
  if (combined.includes('品牌公寓') || combined.includes('托管')) {
    risks.push({ type: 'brand', content: '品牌公寓/托管房源注意检查是否有额外服务费和管理费' });
  }
  if (!combined.includes('水电') && !combined.includes('燃气') && !combined.includes('物业') &&
      !combined.includes('全包') && !combined.includes('包水') && !combined.includes('包电')) {
    risks.push({ type: 'missing', content: '房源描述未提及水电燃气费用情况，建议签约前确认清楚' });
  }

  // --- 靠谱信号 ---
  if (houseInfo?.landlord && (houseInfo.landlord.includes('个人') ||
      houseInfo.landlord.includes('直租') || houseInfo.landlord.includes('现室友'))) {
    safes.push({ content: '个人房东/现室友直招，无中介费，信息更可信' });
  }
  if (houseInfo?.verified) {
    safes.push({ content: `房源已通过平台验证（${houseInfo.source}），真实性有保障` });
  }
  if (houseInfo?.rating >= 4.0) {
    safes.push({ content: `房源评分较高（${houseInfo.rating}分），历史租客反馈良好` });
  }
  if (combined.includes('实拍') || combined.includes('视频')) {
    safes.push({ content: '有实拍照片或视频，所见即所得' });
  }
  if ((houseInfo?.deposit && houseInfo.deposit.includes('押一付一')) || combined.includes('押一付一')) {
    safes.push({ content: '押一付一，付款方式合理，押金压力小' });
  }
  if (tags.includes('近地铁') || combined.includes('近地铁')) {
    safes.push({ content: '近地铁房源，通勤便利，推荐优先考虑' });
  }

  // --- 评分 ---
  const finalRating = Math.round(Math.min(100, Math.max(20,
    60 - risks.length * 15 + safes.length * 12 + (houseInfo?.rating || 0) * 5
  )));

  let recommendation;
  if (finalRating >= 75) recommendation = '推荐考虑 🟢';
  else if (finalRating >= 50) recommendation = '建议谨慎 🟡';
  else recommendation = '不推荐 🔴';

  // 生成总结
  let aiSummary;
  if (risks.length === 0 && safes.length >= 3) {
    aiSummary = '该房源信息比较透明，各方面表现良好，建议优先考虑。建议实地看房后做最终决定。';
  } else if (risks.length >= 3) {
    aiSummary = '该房源存在较多风险信号，建议实地看房并仔细核查合同条款后再做决定。';
  } else if (risks.length > 0 && safes.length > risks.length) {
    aiSummary = '该房源整体靠谱，但仍有一些需要注意的地方。建议实地看房后做最终决定。';
  } else {
    aiSummary = '该房源信息有限，建议进一步了解后再判断。建议实地看房后做最终决定。';
  }

  return { score: finalRating, recommendation, risks, safeSignals: safes, aiSummary, source: 'local' };
}


// ============================================================
// 第三部分：公开 API（各页面调用入口）
// ============================================================

async function getHouseAnalysis(houseId) {
  const house = HOUSES_DATA?.find(h => h.id === houseId);
  if (!house) return { error: '未找到房源' };
  const analysis = await analyzeWithAI(
    house.description + '\n' + house.title,
    { landlord: house.landlord, source: house.source, tags: house.tags,
      rating: house.rating, deposit: house.deposit, verified: house.verified }
  );
  return { house, analysis };
}

async function analyzeCustomText(text) {
  if (!text?.trim()) return { error: '请输入房源描述' };
  return await analyzeWithAI(text);
}


// ============================================================
// 第四部分：房源推荐引擎
// ============================================================

async function recommendHouses(prefs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...(HOUSES_DATA || [])];
      if (prefs.maxPrice && prefs.maxPrice < 99999) filtered = filtered.filter(h => h.price <= prefs.maxPrice);
      if (prefs.minPrice) filtered = filtered.filter(h => h.price >= prefs.minPrice);
      if (prefs.location) {
        const l = prefs.location.toLowerCase();
        filtered = filtered.filter(h => h.location.toLowerCase().includes(l) || h.title.toLowerCase().includes(l));
      }
      if (prefs.roomType && prefs.roomType !== 'all') filtered = filtered.filter(h => h.roomType.includes(prefs.roomType));

      const scored = filtered.map(h => {
        const r = localAnalyze(h.description, { landlord: h.landlord, source: h.source, tags: h.tags, rating: h.rating, deposit: h.deposit, verified: h.verified });
        let bonus = 0;
        if (prefs.nearSubway && h.tags.includes('近地铁')) bonus += 10;
        if (prefs.noAgent && h.landlord?.includes('个人')) bonus += 15;
        return { ...h, aiScore: Math.min(100, r.score + bonus) };
      });

      scored.sort((a, b) => b.aiScore - a.aiScore);

      resolve({
        results: scored.slice(0, 10).map(h => {
          let r = [];
          if (h.aiScore >= 80) r.push('综合评分优秀');
          if (h.price <= 1200) r.push('价格实惠');
          if (h.rating >= 4.0) r.push('租客评价好');
          if (h.tags.includes('近地铁')) r.push('交通便利');
          if (h.landlord?.includes('个人')) r.push('个人房东无中介');
          if (!r.length) r.push('符合筛选条件');
          return { ...h, reason: r.slice(0, 2).join(' · ') };
        }),
        total: scored.length
      });
    }, 400);
  });
}


// ============================================================
// 第五部分：室友匹配引擎
// ============================================================

async function matchRoommates(myProfile) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const users = (typeof MOCK_USERS !== 'undefined' ? MOCK_USERS : []).map(u => {
        let s = 0, d = [];
        if (u.zodiac === myProfile.zodiac) { s += 25; d.push('作息一致'); }
        else if (u.zodiac === '自由型' || myProfile.zodiac === '自由型') { s += 10; d.push('作息基本兼容'); }
        else d.push('作息可能有冲突');

        const hl = { '洁癖': 3, '一般': 2, '随意': 1 };
        const diff = Math.abs((hl[myProfile.hygiene]||2) - (hl[u.hygiene]||2));
        if (diff === 0) { s += 25; d.push('卫生习惯一致'); }
        else if (diff === 1) { s += 15; d.push('卫生习惯相近'); }
        else d.push('卫生习惯差异较大');

        if (u.personality === myProfile.personality) { s += 20; d.push('性格合拍'); }
        else if (myProfile.personality === '都可' || u.personality === '都可') { s += 10; d.push('性格可兼容'); }
        else { s += 5; d.push('性格不同'); }

        const mb = parseBudget(myProfile.budget), ub = parseBudget(u.budget);
        if (mb.max >= ub.min && ub.max >= mb.min) { s += 20; d.push('预算匹配'); }
        else d.push('预算差异较大');

        if (myProfile.pets === u.pets) { s += 10; d.push('宠物一致'); }
        else d.push('宠物态度不同');

        if (!(myProfile.genderPrefer !== '不限' && u.genderPrefer !== '不限' && myProfile.genderPrefer !== u.gender));
        else { s -= 20; d.push('性别偏好不匹配'); }

        s = Math.max(0, Math.min(100, s));
        return { ...u, matchScore: s, matchDetails: d, matchLevel: s >= 75 ? 'high' : s >= 50 ? 'medium' : 'low' };
      });

      users.sort((a, b) => b.matchScore - a.matchScore);
      resolve({ results: users.filter(u => u.matchScore >= 50 && u.id !== myProfile.userId).slice(0, 10), total: users.length });
    }, 500);
  });
}

function parseBudget(b) {
  const p = b.split('-');
  return { min: parseInt(p[0])||0, max: parseInt(p[1])||99999 };
}
