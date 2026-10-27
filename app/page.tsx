'use client';

import React, { useState, useEffect } from 'react';
import {
  VoterRecord,
  RecognizedVoter,
  ResidentGroup,
  AnnouncementConfig,
  ApiSettings,
} from '@/lib/types';
import { INITIAL_VOTER_ARCHIVE } from '@/lib/data/sampleVillageVoters';
import { SAMPLE_HANDWRITTEN_IMAGES } from '@/lib/data/sampleHandwrittenImages';
import { batchVerifyVoters } from '@/lib/voterMatcher';
import { Navbar } from '@/components/Navbar';
import { OcrWorkbench } from '@/components/OcrWorkbench';
import { ArchiveManager } from '@/components/ArchiveManager';
import { AnnouncementPreview } from '@/components/AnnouncementPreview';
import { TechnicalDocsModal } from '@/components/TechnicalDocsModal';
import {
  generateElectionAnnouncementDocx,
  downloadDocxBlob,
} from '@/lib/docxGenerator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    'workbench' | 'archive' | 'preview' | 'technical'
  >('workbench');

  // Master Village Voter Archive: 大赵庄队组人员名单v2_18-99岁（筛选表）
  const [archive, setArchive] = useState<VoterRecord[]>(INITIAL_VOTER_ARCHIVE);

  // Dynamic Resident Groups
  const [groups, setGroups] = useState<ResidentGroup[]>(() => [
    {
      id: 'g-1',
      name: '第一大赵社区居民小组',
      description: '大赵庄东街、前塘路、南排在册选民',
      voterNames: SAMPLE_HANDWRITTEN_IMAGES[0].expectedNames,
    },
    {
      id: 'g-2',
      name: '第二大赵社区居民小组',
      description: '大赵庄西街、中心排、水塘边在册选民',
      voterNames: SAMPLE_HANDWRITTEN_IMAGES[1].expectedNames,
    },
    {
      id: 'g-3',
      name: '第三大赵社区居民小组',
      description: '大赵庄前街、后街在册选民',
      voterNames: ['赵兴汉', '吴秀珍', '赵文奎', '赵丽娜', '赵建平'],
    },
  ]);

  // Current recognized voters in workbench
  const [recognizedVoters, setRecognizedVoters] = useState<RecognizedVoter[]>(
    () =>
      batchVerifyVoters(
        SAMPLE_HANDWRITTEN_IMAGES[0].expectedNames,
        INITIAL_VOTER_ARCHIVE,
        '第一大赵社区居民小组'
      )
  );

  // Official Election Announcement Configuration
  const [announcementConfig, setAnnouncementConfig] =
    useState<AnnouncementConfig>({
      villageName: '古城镇大赵社区居民委员会',
      bulletinTitle: '古城镇大赵社区居民委员会换届选举选民名单公告',
      docNumber: '大赵社区选字第4号',
      legalBasis:
        '根据《中华人民共和国村民委员会组织法》和《安徽省村民委员会选举办法》的规定，现将本村登记的选民名单公布如下：',
      objectionNotice:
        '如有遗漏，或对公布的选民名单有不同意见，可在名单公布之日起5日内（2026年11月3日前）向村民选举委员会提出。',
      deadlineDate: '2026年11月3日前',
      committeeName: '大赵社区居民选举委员会',
      publishDate: '2026年10月28日',
      separator: '、',
    });

  // Agnes Model API Configuration
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    apiKey: 'sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9',
    imageModel: 'Agnes-Image-2.1-flash',
    textModel: 'Agnes-2.5-flash',
    provider: 'agnes',
  });

  const [excelFileName, setExcelFileName] = useState<string>(
    '大赵庄队组人员名单v2_18-99岁（筛选表）.xlsx'
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Global Export Word Action
  const handleGlobalExportWord = async () => {
    setIsExporting(true);
    try {
      const blob = await generateElectionAnnouncementDocx(
        announcementConfig,
        groups
      );
      downloadDocxBlob(
        blob,
        `古城镇大赵社区换届选举选民名单公告_${announcementConfig.docNumber}.docx`
      );
    } catch (err: unknown) {
      const error = err as Error;
      alert(`导出Word文档时发生错误: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetArchive = () => {
    if (confirm('确认恢复为初始预置的大赵庄在册选民底册数据吗？')) {
      setArchive(INITIAL_VOTER_ARCHIVE);
      setExcelFileName('大赵庄队组人员名单v2_18-99岁（筛选表）.xlsx');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar with Single-Row 3-Zone Contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportWord={handleGlobalExportWord}
        isExporting={isExporting}
      />

      {/* Main Content Areas */}
      <main className="flex-1 pb-16">
        {activeTab === 'workbench' && (
          <OcrWorkbench
            archive={archive}
            setArchive={setArchive}
            groups={groups}
            setGroups={setGroups}
            recognizedVoters={recognizedVoters}
            setRecognizedVoters={setRecognizedVoters}
            onGoToPreview={() => setActiveTab('preview')}
            apiSettings={apiSettings}
            setApiSettings={setApiSettings}
            excelFileName={excelFileName}
            setExcelFileName={setExcelFileName}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveManager
            archive={archive}
            setArchive={setArchive}
            onResetArchive={handleResetArchive}
            excelFileName={excelFileName}
            setExcelFileName={setExcelFileName}
          />
        )}

        {activeTab === 'preview' && (
          <AnnouncementPreview
            config={announcementConfig}
            setConfig={setAnnouncementConfig}
            groups={groups}
            isExporting={isExporting}
            setIsExporting={setIsExporting}
          />
        )}

        {activeTab === 'technical' && <TechnicalDocsModal />}
      </main>

      {/* Clean Footer (No fake telemetry tickers or pseudo-code) */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>古城镇大赵社区居民选举委员会</span>
            <span className="mx-2">·</span>
            <span>2026年换届选举选民登记公示专档</span>
          </div>
          <div>
            <span>
              法定依据：《中华人民共和国村民委员会组织法》《安徽省村民委员会选举办法》
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
