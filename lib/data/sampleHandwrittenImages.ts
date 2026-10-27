/**
 * Sample handwritten voter list images generated as realistic SVG-based data URLs.
 * Simulates real Chinese village captain handwriting on lined notebook / grid paper,
 * with natural pen pressure, slight handwriting variations, title headers, and dates.
 */

export interface SampleImageItem {
  id: string;
  title: string;
  description: string;
  groupName: string;
  expectedNames: string[];
  dataUrl: string;
  notes: string;
}

// Generate an authentic notebook paper with handwritten Chinese characters
function createHandwrittenSvgDataUrl(
  title: string,
  lines: string[][],
  date: string,
  note: string = ''
): string {
  const width = 800;
  const height = 980;
  const lineHeight = 52;
  const startY = 160;

  // Generate ruled lines
  let gridLines = '';
  for (let y = 140; y < height - 60; y += lineHeight) {
    gridLines += `<line x1="50" y1="${y}" x2="${width - 50}" y2="${y}" stroke="#bfdbfe" stroke-width="1.2" stroke-dasharray="3,2" />`;
  }

  // Render rows of names with subtle realistic handwriting offsets
  let textElements = '';
  lines.forEach((row, rowIndex) => {
    const yPos = startY + rowIndex * lineHeight;
    let xPos = 80;
    row.forEach((name, colIndex) => {
      // Small jitter to simulate natural handwriting
      const rotate = ((rowIndex * 7 + colIndex * 13) % 7) - 3;
      const dy = ((rowIndex * 5 + colIndex * 11) % 5) - 2;
      textElements += `
        <g transform="rotate(${rotate * 0.4} ${xPos + 25} ${yPos})">
          <text x="${xPos}" y="${yPos + dy}" 
                font-family="'KaiTi', 'STKaiti', 'Ma Shan Zheng', 'FangSong', cursive, serif" 
                font-size="25" 
                font-weight="bold" 
                fill="#1e293b" 
                letter-spacing="3">${name}</text>
        </g>
      `;
      xPos += 165;
    });
  });

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="paper-texture" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feDiffuseLighting in="noise" lighting-color="#fdfbf7" surfaceScale="1.2" result="light">
            <feDistantLight azimuth="65" elevation="55" />
          </feDiffuseLighting>
          <feBlend mode="multiply" in="SourceGraphic" in2="light" />
        </filter>
        <pattern id="subtle-paper" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="#fcf9f2"/>
        </pattern>
      </defs>

      <!-- Paper background with warm paper tint -->
      <rect width="${width}" height="${height}" fill="#faf6ed" />
      <rect width="${width}" height="${height}" fill="url(#subtle-paper)" opacity="0.9" />

      <!-- Red vertical margin line of Chinese notebook -->
      <line x1="68" y1="50" x2="68" y2="${height - 40}" stroke="#fca5a5" stroke-width="2" />
      <line x1="72" y1="50" x2="72" y2="${height - 40}" stroke="#fca5a5" stroke-width="0.8" opacity="0.6" />

      <!-- Horizontal ruled lines -->
      ${gridLines}

      <!-- Header: Title in captain's blue/black fountain pen -->
      <g transform="rotate(-0.5 400 90)">
        <text x="400" y="85" text-anchor="middle" 
              font-family="'KaiTi', 'STKaiti', 'FangSong', cursive, serif" 
              font-size="30" font-weight="900" fill="#0f172a" letter-spacing="4">
          ${title}
        </text>
        <text x="400" y="125" text-anchor="middle" 
              font-family="'KaiTi', 'STKaiti', cursive" 
              font-size="16" fill="#475569">
          （村组摸排队长手书登记表 · 2026年换届选举核验）
        </text>
      </g>

      <!-- Content text -->
      ${textElements}

      <!-- Bottom Signature & Date -->
      <g transform="translate(480, ${height - 110})">
        <text x="240" y="25" text-anchor="end" 
              font-family="'KaiTi', cursive" font-size="20" font-weight="bold" fill="#1e293b">
          登记人（队长）：赵广福
        </text>
        <text x="240" y="58" text-anchor="end" 
              font-family="'KaiTi', cursive" font-size="18" fill="#334155">
          ${date}
        </text>
      </g>

      ${
        note
          ? `
        <text x="80" y="${height - 40}" font-family="'KaiTi', cursive" font-size="15" fill="#dc2626">
          * 附注：${note}
        </text>
      `
          : ''
      }
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_HANDWRITTEN_IMAGES: SampleImageItem[] = [
  {
    id: 'sample-group-1',
    title: '第一大赵居民小组 - 队长手写名单（标准测试）',
    description: '第一大赵庄队长赵广福手书摸排表，共28位选民，字迹工整清晰。',
    groupName: '第一大赵社区居民小组',
    expectedNames: [
      '赵建国', '赵明华', '赵秀英', '赵小龙',
      '王桂芝', '李德顺', '赵振江', '张玉梅',
      '赵德宝', '赵春梅', '赵立新', '赵海燕',
      '刘长发', '赵学文', '赵艳丽', '孙富贵',
      '赵庆丰', '钱素琴', '赵成才', '赵淑琴',
      '赵卫国', '赵秋菊', '赵保平', '赵冬梅',
      '赵宏伟', '赵广福', '赵俊英', '赵向阳'
    ],
    notes: '全员皆在大赵庄18-99岁档案中，可完美自动比对通过。',
    dataUrl: createHandwrittenSvgDataUrl(
      '第一大赵社区居民小组选民初登表',
      [
        ['赵建国', '赵明华', '赵秀英', '赵小龙'],
        ['王桂芝', '李德顺', '赵振江', '张玉梅'],
        ['赵德宝', '赵春梅', '赵立新', '赵海燕'],
        ['刘长发', '赵学文', '赵艳丽', '孙富贵'],
        ['赵庆丰', '钱素琴', '赵成才', '赵淑琴'],
        ['赵卫国', '赵秋菊', '赵保平', '赵冬梅'],
        ['赵宏伟', '赵广福', '赵俊英', '赵向阳']
      ],
      '2026年10月24日'
    ),
  },
  {
    id: 'sample-group-2',
    title: '第二大赵居民小组 - 队长手写名单（标准测试）',
    description: '第二大赵队长手写登记册，共26位选民，笔画流畅自然。',
    groupName: '第二大赵社区居民小组',
    expectedNames: [
      '郭秀兰', '赵永强', '赵美玲', '赵家明',
      '郑淑芬', '赵文博', '赵海峰', '赵巧珍',
      '赵国栋', '冯桂兰', '赵云鹏', '赵彩霞',
      '赵天宇', '赵志强', '赵玉珍', '潘德林',
      '赵元浩', '赵秀琴', '赵福生', '徐翠花',
      '赵长青', '赵金凤', '赵培林', '黄丽娟',
      '赵继业', '赵春华'
    ],
    notes: '包含男女各年龄段选民，完全吻合第二大赵档案。',
    dataUrl: createHandwrittenSvgDataUrl(
      '第二大赵社区居民小组选民初登表',
      [
        ['郭秀兰', '赵永强', '赵美玲', '赵家明'],
        ['郑淑芬', '赵文博', '赵海峰', '赵巧珍'],
        ['赵国栋', '冯桂兰', '赵云鹏', '赵彩霞'],
        ['赵天宇', '赵志强', '赵玉珍', '潘德林'],
        ['赵元浩', '赵秀琴', '赵福生', '徐翠花'],
        ['赵长青', '赵金凤', '赵培林', '黄丽娟'],
        ['赵继业', '赵春华', '', '']
      ],
      '2026年10月25日'
    ),
  },
  {
    id: 'sample-mixed-edge',
    title: '综合测试表（含未建档人员、未达法龄与形近字）',
    description: '用于测试系统智能容错与人工校正工作台：含未建档人员"周建平"、未满18岁人员"赵子轩"及形似字"汪桂芝"。',
    groupName: '第一大赵社区居民小组',
    expectedNames: [
      '赵建国', '赵明华', '汪桂芝', '赵子轩',
      '李德顺', '周建平', '赵振江', '张玉梅',
      '赵德宝', '赵立新', '刘长发', '赵海峰'
    ],
    notes: '包含测试项：汪桂芝（形近字应提示王桂芝）、赵子轩（17岁未满18）、周建平（未建档需人工审核）。',
    dataUrl: createHandwrittenSvgDataUrl(
      '大赵社区摸排名单（人工校正测试样表）',
      [
        ['赵建国', '赵明华', '汪桂芝', '赵子轩'],
        ['李德顺', '周建平', '赵振江', '张玉梅'],
        ['赵德宝', '赵立新', '刘长发', '赵海峰']
      ],
      '2026年10月26日',
      '请系统重点核验周建平档案及赵子轩法定年龄'
    ),
  },
];
