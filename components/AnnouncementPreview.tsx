'use client';

import React, { useState } from 'react';
import { AnnouncementConfig, ResidentGroup } from '@/lib/types';
import {
  generateElectionAnnouncementDocx,
  downloadDocxBlob,
} from '@/lib/docxGenerator';
import {
  Download,
  Printer,
  Copy,
  Check,
  Edit3,
  FileCheck,
  Stamp,
} from 'lucide-react';

interface AnnouncementPreviewProps {
  config: AnnouncementConfig;
  setConfig: React.Dispatch<React.SetStateAction<AnnouncementConfig>>;
  groups: ResidentGroup[];
  isExporting: boolean;
  setIsExporting: (val: boolean) => void;
}

export function AnnouncementPreview({
  config,
  setConfig,
  groups,
  isExporting,
  setIsExporting,
}: AnnouncementPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showOfficialSeal, setShowOfficialSeal] = useState(true);

  // Trigger Word (.docx) export
  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const blob = await generateElectionAnnouncementDocx(config, groups);
      downloadDocxBlob(
        blob,
        `古城镇大赵社区居民委员会换届选举选民名单公告_${config.docNumber}.docx`
      );
    } catch (err: unknown) {
      const error = err as Error;
      alert(`导出Word文档失败: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Browser print
  const handlePrint = () => {
    window.print();
  };

  // Copy plain text
  const handleCopyText = () => {
    let fullText = `${config.bulletinTitle}\n${config.docNumber}\n\n`;
    fullText += `${config.legalBasis}\n\n`;

    groups.forEach((g) => {
      fullText += `${g.name}：\n`;
      fullText +=
        g.voterNames.length > 0
          ? g.voterNames.join(config.separator)
          : '（暂无已核验通过的选民名单）';
      fullText += '\n\n';
    });

    fullText += `${config.objectionNotice}\n\n`;
    fullText += `        ${config.committeeName}\n`;
    fullText += `        ${config.publishDate}\n`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate total voters across all groups
  const totalVotersCount = groups.reduce(
    (acc, cur) => acc + cur.voterNames.length,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Action and Control Bar (Hidden when printing) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-red-700" />
            <span>换届选举法定公告预览与公文导出</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            符合安徽省村委会选举公文规范，支持A4直接打印张贴或导出标准Word (.docx)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Separator selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded text-xs">
            <span className="text-slate-500 px-1">分隔符:</span>
            <button
              onClick={() => setConfig({ ...config, separator: '、' })}
              className={`px-2 py-0.5 rounded transition-colors ${
                config.separator === '、'
                  ? 'bg-white shadow-xs font-bold text-red-700'
                  : 'text-slate-600'
              }`}
            >
              顿号(、)
            </button>
            <button
              onClick={() => setConfig({ ...config, separator: ' ' })}
              className={`px-2 py-0.5 rounded transition-colors ${
                config.separator === ' '
                  ? 'bg-white shadow-xs font-bold text-red-700'
                  : 'text-slate-600'
              }`}
            >
              空格
            </button>
          </div>

          <button
            onClick={() => setShowEditDrawer(!showEditDrawer)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showEditDrawer ? '收起配置' : '修改文号及日期'}</span>
          </button>

          <button
            onClick={() => setShowOfficialSeal(!showOfficialSeal)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${
              showOfficialSeal
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            <Stamp className="w-3.5 h-3.5 text-red-700" />
            <span>{showOfficialSeal ? '公章显示中' : '隐藏公章'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? '已复制公告' : '复制文本'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印 / PDF</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? '生成中...' : '导出标准Word (.docx)'}</span>
          </button>
        </div>
      </div>

      {/* Edit Drawer (Configurable fields) */}
      {showEditDrawer && (
        <div className="no-print bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              公告主标题
            </label>
            <input
              type="text"
              value={config.bulletinTitle}
              onChange={(e) =>
                setConfig({ ...config, bulletinTitle: e.target.value })
              }
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              公告文号
            </label>
            <input
              type="text"
              value={config.docNumber}
              onChange={(e) =>
                setConfig({ ...config, docNumber: e.target.value })
              }
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              选举委员会落款名称
            </label>
            <input
              type="text"
              value={config.committeeName}
              onChange={(e) =>
                setConfig({ ...config, committeeName: e.target.value })
              }
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              公告公布日期
            </label>
            <input
              type="text"
              value={config.publishDate}
              onChange={(e) =>
                setConfig({ ...config, publishDate: e.target.value })
              }
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">
              法定依据说明段
            </label>
            <textarea
              rows={2}
              value={config.legalBasis}
              onChange={(e) =>
                setConfig({ ...config, legalBasis: e.target.value })
              }
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">
              异议提出与截止期限说明
            </label>
            <textarea
              rows={2}
              value={config.objectionNotice}
              onChange={(e) =>
                setConfig({ ...config, objectionNotice: e.target.value })
              }
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            />
          </div>
        </div>
      )}

      {/* Official Document A4 Container */}
      <div className="print-page bg-white border border-slate-300 shadow-md rounded-xs max-w-[820px] mx-auto p-8 sm:p-14 text-slate-900 transition-all font-serif">
        {/* Chinese Official Red Title Bar */}
        <div className="text-center space-y-2 pb-6 border-b-2 border-red-700">
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-wider text-red-700 font-serif"
            style={{
              fontFamily:
                '"FZZYJW", "FZXiaoBiaoSong-B05S", "SimSun", serif, "STSong"',
            }}
          >
            {config.bulletinTitle}
          </h1>
          <div
            className="text-sm sm:text-base font-medium text-slate-800 tracking-wide font-serif"
            style={{ fontFamily: '"FangSong", "STFangsong", "SimSun", serif' }}
          >
            {config.docNumber}
          </div>
        </div>

        {/* Official Double Red Line Accent */}
        <div className="w-full h-1 bg-red-700 mt-1 mb-8" />

        {/* Legal Basis & Intro */}
        <div
          className="text-base sm:text-lg leading-relaxed text-justify mb-6"
          style={{
            textIndent: '2em',
            fontFamily: '"FangSong", "STFangsong", "SimSun", serif',
            lineHeight: '2',
          }}
        >
          {config.legalBasis}
        </div>

        {/* Groups and Voters Listing */}
        <div className="space-y-6 my-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              {/* Group Title in Bold Heiti / Songti */}
              <div
                className="text-base sm:text-lg font-bold text-slate-900 tracking-wide"
                style={{
                  fontFamily: '"SimHei", "STHeiti", sans-serif',
                }}
              >
                {group.name}：
                <span className="text-sm font-normal text-slate-500 font-sans ml-2">
                  (已登记并核验 {group.voterNames.length} 人)
                </span>
              </div>

              {/* Voter Names List */}
              <div
                className="text-base sm:text-lg leading-loose text-justify text-slate-800"
                style={{
                  textIndent: '2em',
                  fontFamily: '"FangSong", "STFangsong", "SimSun", serif',
                  lineHeight: '2.1',
                }}
              >
                {group.voterNames.length > 0 ? (
                  group.voterNames.join(config.separator)
                ) : (
                  <span className="text-slate-400 italic">
                    （暂无已核验通过的选民名单）
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Objection and Deadline Clause */}
        <div
          className="text-base sm:text-lg leading-relaxed text-justify mt-8 mb-12"
          style={{
            textIndent: '2em',
            fontFamily: '"FangSong", "STFangsong", "SimSun", serif',
            lineHeight: '2',
          }}
        >
          {config.objectionNotice}
        </div>

        {/* Bottom Signature & Date Block */}
        <div className="relative flex flex-col items-end pt-4 space-y-2 pr-4 sm:pr-8">
          <div
            className="text-base sm:text-lg font-bold tracking-wide"
            style={{ fontFamily: '"FangSong", "STFangsong", "SimSun", serif' }}
          >
            {config.committeeName}
          </div>
          <div
            className="text-base sm:text-lg tracking-wide"
            style={{ fontFamily: '"FangSong", "STFangsong", "SimSun", serif' }}
          >
            {config.publishDate}
          </div>

          {/* Simulated Official Red Seal Stamp */}
          {showOfficialSeal && (
            <div
              className="absolute -top-6 right-2 sm:right-6 pointer-events-none opacity-85 select-none"
              style={{
                width: '130px',
                height: '130px',
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full text-red-600">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2.8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="0.8"
                  strokeDasharray="2,1"
                />
                <path
                  id="curve"
                  d="M 18,50 A 32,32 0 1,1 82,50"
                  fill="none"
                  stroke="none"
                />
                <text
                  fontSize="7.5"
                  fontWeight="bold"
                  fill="#dc2626"
                  letterSpacing="1"
                >
                  <textPath href="#curve" startOffset="50%" textAnchor="middle">
                    大赵社区居民选举委员会
                  </textPath>
                </text>
                {/* Central Star */}
                <polygon
                  points="50,38 53,46 61,46 55,51 57,59 50,54 43,59 45,51 39,46 47,46"
                  fill="#dc2626"
                />
                <text
                  x="50"
                  y="73"
                  fontSize="6.5"
                  fontWeight="bold"
                  fill="#dc2626"
                  textAnchor="middle"
                >
                  选举专用章
                </text>
              </svg>
            </div>
          )}
        </div>

        {/* Watermark/Footer notes */}
        <div className="mt-14 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between no-print">
          <span>大赵社区选民登记册 · 合计公布选民 {totalVotersCount} 人</span>
          <span>A4标准公文排版 · 打印直接张贴</span>
        </div>
      </div>
    </div>
  );
}
