import { VoterRecord, RecognizedVoter, MatchStatus } from './types';

// Common Chinese OCR handwritten confusion pairs
const CONFUSION_PAIRS: Record<string, string[]> = {
  汪: ['王', '汪'],
  王: ['汪', '玉'],
  玉: ['王', '玉'],
  峰: ['锋', '峰'],
  锋: ['峰', '锋'],
  宝: ['保', '宝'],
  保: ['宝', '保'],
  兰: ['蓝', '兰'],
  蓝: ['兰', '蓝'],
  华: ['桦', '华'],
  桦: ['华', '桦'],
  玲: ['铃', '玲'],
  铃: ['玲', '铃'],
  秀: ['季', '秀'],
  季: ['秀', '季'],
  德: ['得', '德'],
  得: ['德', '得'],
  朋: ['明', '朋'],
  明: ['朋', '明'],
  云: ['运', '云'],
  运: ['云', '运'],
  国: ['固', '国'],
  娟: ['娟', '娥'],
  青: ['清', '青'],
  清: ['青', '清'],
  龙: ['尤', '龙'],
  尤: ['龙', '尤'],
};

// Calculate Levenshtein similarity between two strings (0 to 1)
export function calculateSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let cost = 1;
      const c1 = s1[i - 1];
      const c2 = s2[j - 1];

      if (c1 === c2) {
        cost = 0;
      } else if (
        CONFUSION_PAIRS[c1]?.includes(c2) ||
        CONFUSION_PAIRS[c2]?.includes(c1)
      ) {
        // Reduced penalty for common handwritten OCR confusion pairs
        cost = 0.4;
      }

      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLength = Math.max(m, n);
  const distance = d[m][n];
  return Math.max(0, 1 - distance / maxLength);
}

// Extract names list from raw text
export function parseRawNamesText(rawText: string): string[] {
  if (!rawText) return [];

  // Filter out common header, title, and form keywords
  const stopWords = [
    '选民名单',
    '居民小组',
    '第一大赵',
    '第二大赵',
    '第三大赵',
    '摸排名单',
    '选民初登表',
    '登记人',
    '队长',
    '换届选举',
    '核验',
    '附注',
    '赵广福', // only if it appears as signature; we'll handle standard parsing
  ];

  // Split by newlines, Chinese commas, dunhao, whitespace, tabs
  const rawLines = rawText.split(/[\r\n]+/);
  const resultNames: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip entire line if it contains title or disclaimer
    if (
      (trimmed.includes('选民名单') ||
        trimmed.includes('换届选举') ||
        trimmed.includes('大赵社区') ||
        trimmed.includes('登记表')) &&
      trimmed.length > 6
    ) {
      continue;
    }

    // Split line by separators
    const tokens = trimmed.split(/[、,，\s\t|/·;；]+/);

    for (const token of tokens) {
      // Remove leading index like "1.", "1、", "(1)", "一、"
      let cleaned = token.replace(
        /^([0-9]{1,3}[.、\s\-_：:]+|[(（][0-9]{1,3}[)）]|(?:[一二三四五六七八九十百]+[、.：:]))/,
        ''
      );
      // Strip any punctuation
      cleaned = cleaned.replace(/[^\u4e00-\u9fa5]/g, '').trim();

      // Chinese names are typically 2 to 4 characters
      if (cleaned.length >= 2 && cleaned.length <= 4) {
        if (!stopWords.includes(cleaned)) {
          resultNames.push(cleaned);
        }
      }
    }
  }

  return resultNames;
}

// Verify a recognized name against the archive
export function verifyVoterName(
  rawName: string,
  archive: VoterRecord[],
  defaultGroup: string = '第一大赵社区居民小组',
  existingNamesInBatch: string[] = []
): RecognizedVoter {
  const trimmed = rawName.trim();
  const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Check duplicate in current batch
  const countInBatch = existingNamesInBatch.filter((n) => n === trimmed).length;
  const isDuplicate = countInBatch > 1;

  // 1. Try Exact match
  const matched = archive.find((v) => v.name === trimmed);

  if (matched) {
    // Check age eligibility: 18 - 99
    if (matched.age < 18) {
      return {
        id,
        name: trimmed,
        originalRaw: rawName,
        matchStatus: 'age_ineligible',
        matchedRecord: matched,
        assignedGroup: matched.group || defaultGroup,
        notes: `未达法定选举年龄：当前${matched.age}周岁（未满18周岁无选民资格）`,
      };
    }

    if (matched.age > 99) {
      return {
        id,
        name: trimmed,
        originalRaw: rawName,
        matchStatus: 'matched',
        matchedRecord: matched,
        assignedGroup: matched.group || defaultGroup,
        notes: `超龄长者（${matched.age}岁）：档案已匹配，已安排上门核对投票意愿`,
      };
    }

    return {
      id,
      name: trimmed,
      originalRaw: rawName,
      matchStatus: isDuplicate ? 'duplicate' : 'matched',
      matchedRecord: matched,
      assignedGroup: matched.group || defaultGroup,
      notes: isDuplicate
        ? '重复登记：本批次中已存在同名记录'
        : `档案核对通过：所属【${matched.group}】，${matched.age}岁`,
    };
  }

  // 2. Not matched: Calculate fuzzy candidates from archive
  const suggestions = archive
    .map((record) => {
      const score = calculateSimilarity(trimmed, record.name);
      let reason = `文字相似度 ${(score * 100).toFixed(0)}%`;
      if (trimmed.length === record.name.length) {
        for (let i = 0; i < trimmed.length; i++) {
          const c1 = trimmed[i];
          const c2 = record.name[i];
          if (c1 !== c2 && CONFUSION_PAIRS[c1]?.includes(c2)) {
            reason = `形近字/同音笔误：${c1} → ${c2}`;
            break;
          }
        }
      }
      return {
        record,
        score,
        reason,
      };
    })
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // If candidate auto-snapping is enabled and the top candidate has high confidence (>= 0.70 or confusion pair match)
  const topCandidate = suggestions[0];
  const shouldAutoSnap =
    topCandidate &&
    (topCandidate.score >= 0.7 ||
      topCandidate.reason.includes('形近字') ||
      topCandidate.reason.includes('同音笔误'));

  if (shouldAutoSnap) {
    const rec = topCandidate.record;
    if (rec.age < 18) {
      return {
        id,
        name: rec.name,
        originalRaw: rawName,
        matchStatus: 'age_ineligible',
        matchedRecord: rec,
        suggestedMatches: suggestions,
        assignedGroup: rec.group || defaultGroup,
        isEdited: true,
        notes: `根据Excel名单自动校正【${trimmed} ➔ ${rec.name}】，但未满18周岁(当前${rec.age}岁)`,
      };
    }

    return {
      id,
      name: rec.name,
      originalRaw: rawName,
      matchStatus: 'matched',
      matchedRecord: rec,
      suggestedMatches: suggestions,
      assignedGroup: rec.group || defaultGroup,
      isEdited: true,
      notes: `已根据上传的Excel底册自动校正对齐：${trimmed} ➔ ${rec.name} (${topCandidate.reason})`,
    };
  }

  return {
    id,
    name: trimmed,
    originalRaw: rawName,
    matchStatus: 'unmatched',
    suggestedMatches: suggestions,
    assignedGroup: defaultGroup,
    notes: '未在Excel名单中直接匹配，请人工核实（可选用推荐候选人或手动调整）',
  };
}

// Batch verify all recognized names
export function batchVerifyVoters(
  names: string[],
  archive: VoterRecord[],
  defaultGroup: string = '第一大赵社区居民小组'
): RecognizedVoter[] {
  const result: RecognizedVoter[] = [];
  names.forEach((name) => {
    const verified = verifyVoterName(name, archive, defaultGroup, names);
    result.push(verified);
  });
  return result;
}
