'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: 'workbench' | 'archive' | 'preview' | 'technical';
  setActiveTab: (tab: 'workbench' | 'archive' | 'preview' | 'technical') => void;
  onExportWord: () => void;
  isExporting?: boolean;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onExportWord,
  isExporting = false,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-red-700 text-white flex items-center justify-center font-bold text-sm tracking-tighter">
            赵
          </div>
          <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            大赵社区选民名单识别与公告系统
          </span>
        </div>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === 'workbench'
                ? 'text-red-700 border-red-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            智能识别与工作台
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === 'archive'
                ? 'text-red-700 border-red-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            大赵庄在册档案(18-99岁)
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === 'preview'
                ? 'text-red-700 border-red-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            公文排版与Word导出
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === 'technical'
                ? 'text-red-700 border-red-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            实施方案与Python代码
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onExportWord}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-700 hover:bg-red-800 active:bg-red-900 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? '正在生成Word...' : '导出Word公告'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 bg-slate-50 px-2 py-1 text-xs">
        <button
          onClick={() => setActiveTab('workbench')}
          className={`py-1.5 px-2 font-medium ${
            activeTab === 'workbench' ? 'text-red-700' : 'text-slate-600'
          }`}
        >
          识别工作台
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`py-1.5 px-2 font-medium ${
            activeTab === 'archive' ? 'text-red-700' : 'text-slate-600'
          }`}
        >
          在册档案
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-1.5 px-2 font-medium ${
            activeTab === 'preview' ? 'text-red-700' : 'text-slate-600'
          }`}
        >
          公告与导出
        </button>
        <button
          onClick={() => setActiveTab('technical')}
          className={`py-1.5 px-2 font-medium ${
            activeTab === 'technical' ? 'text-red-700' : 'text-slate-600'
          }`}
        >
          技术方案
        </button>
      </div>
    </header>
  );
}
