'use client';

import React, { useState, useRef } from 'react';
import {
  RecognizedVoter,
  VoterRecord,
  ResidentGroup,
  ApiSettings,
} from '@/lib/types';
import {
  SAMPLE_HANDWRITTEN_IMAGES,
  SampleImageItem,
} from '@/lib/data/sampleHandwrittenImages';
import {
  verifyVoterName,
  batchVerifyVoters,
  parseRawNamesText,
} from '@/lib/voterMatcher';
import {
  parseVoterExcel,
  generateVoterExcelTemplate,
} from '@/lib/excelParser';
import {
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Sliders,
  Settings,
  Sparkles,
  ArrowRight,
  Eye,
  Edit2,
  HelpCircle,
  Check,
  FileSpreadsheet,
  Download,
  Users,
} from 'lucide-react';

interface OcrWorkbenchProps {
  archive: VoterRecord[];
  setArchive: React.Dispatch<React.SetStateAction<VoterRecord[]>>;
  groups: ResidentGroup[];
  setGroups: React.Dispatch<React.SetStateAction<ResidentGroup[]>>;
  recognizedVoters: RecognizedVoter[];
  setRecognizedVoters: React.Dispatch<React.SetStateAction<RecognizedVoter[]>>;
  onGoToPreview: () => void;
  apiSettings: ApiSettings;
  setApiSettings: React.Dispatch<React.SetStateAction<ApiSettings>>;
  excelFileName: string;
  setExcelFileName: (name: string) => void;
}

export function OcrWorkbench({
  archive,
  setArchive,
  groups,
  setGroups,
  recognizedVoters,
  setRecognizedVoters,
  onGoToPreview,
  apiSettings,
  setApiSettings,
  excelFileName,
  setExcelFileName,
}: OcrWorkbenchProps) {
  // Current active image
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string>(
    SAMPLE_HANDWRITTEN_IMAGES[0].dataUrl
  );
  const [currentSampleId, setCurrentSampleId] = useState<string>(
    SAMPLE_HANDWRITTEN_IMAGES[0].id
  );
  const [imageFileName, setImageFileName] = useState<string>(
    SAMPLE_HANDWRITTEN_IMAGES[0].title
  );

  // Inspection Canvas Zoom & Filters
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Recognition States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recognitionEngine, setRecognitionEngine] = useState<string>(
    'Agnes-Image-2.1-flash'
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Manual Add / Batch Text Input State
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchRawText, setBatchRawText] = useState<string>('');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showCandidateModal, setShowCandidateModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Extract candidate names from active archive
  const candidateNames = archive.map((v) => v.name);

  // Perform OCR Recognition (passing candidate roster to vision model)
  const handleRunOcr = async (
    imgDataUrl?: string,
    sampleId?: string,
    customArchive?: VoterRecord[]
  ) => {
    const targetImg = imgDataUrl || currentImageDataUrl;
    const targetSampleId = sampleId !== undefined ? sampleId : currentSampleId;
    const activeArchive = customArchive || archive;

    if (!targetImg) {
      alert('请先选择或上传手写选民名单图片');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(
      `正在调用 ${apiSettings.imageModel} 结合已上传的Excel居民名单进行先验约束手写识别...`
    );

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: targetImg,
          sampleId: targetSampleId,
          baseUrl: apiSettings.baseUrl,
          apiKey: apiSettings.apiKey,
          imageModel: apiSettings.imageModel,
          // Pass the uploaded Excel candidate roster to give the model strict prior knowledge
          candidateNames: activeArchive.map((v) => v.name),
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.names)) {
        setRecognitionEngine(data.engineUsed || apiSettings.imageModel);

        // Determine default group based on sample or first group
        let defaultGroupName = groups[0]?.name || '第一大赵社区居民小组';
        if (targetSampleId === 'sample-group-2') {
          defaultGroupName = '第二大赵社区居民小组';
        }

        // Run verification against village master archive
        const verifiedList = batchVerifyVoters(
          data.names,
          activeArchive,
          defaultGroupName
        );
        setRecognizedVoters(verifiedList);

        // Auto distribute into groups
        syncVotersIntoGroups(verifiedList);

        setStatusMessage(
          `识别完成：成功识别 ${data.names.length} 位选民。已严格根据Excel居民底册先验纠偏核对，所属组别已自动归类。`
        );
      } else {
        // Fallback with graceful message
        setStatusMessage(
          `识别提示: ${
            data.error || '模型调用返回异常，可使用测试样张或手动校核'
          }`
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage(`请求失败: ${error.message || '网络连接异常'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sync recognized voters into their assigned groups
  const syncVotersIntoGroups = (voters: RecognizedVoter[]) => {
    setGroups((prevGroups) => {
      return prevGroups.map((group) => {
        // Eligible voters assigned to this group
        const groupVoters = voters
          .filter(
            (v) =>
              v.assignedGroup === group.name &&
              v.matchStatus !== 'age_ineligible'
          )
          .map((v) => v.name);

        return {
          ...group,
          voterNames: Array.from(new Set(groupVoters)), // unique names
        };
      });
    });
  };

  // Handle uploading custom Excel resident list (.xlsx / .xls)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(`正在解析居民名单Excel表：${file.name}...`);
    const parseResult = await parseVoterExcel(file);

    if (!parseResult.success) {
      alert(parseResult.error || '解析Excel失败，请检查文件格式');
      setStatusMessage(parseResult.error || '解析Excel失败');
      if (excelInputRef.current) excelInputRef.current.value = '';
      return;
    }

    // Successfully parsed
    setExcelFileName(file.name);
    setArchive(parseResult.records);

    // If new groups detected in Excel, update groups
    if (parseResult.groupsFound && parseResult.groupsFound.length > 0) {
      const updatedGroups: ResidentGroup[] = parseResult.groupsFound.map(
        (grpName, idx) => {
          const existing = groups.find((g) => g.name === grpName);
          return {
            id: existing ? existing.id : `group-excel-${idx}`,
            name: grpName,
            description: existing?.description || `源自Excel表【${grpName}】在册选民`,
            voterNames: existing?.voterNames || [],
          };
        }
      );
      setGroups(updatedGroups);
    }

    setStatusMessage(
      `成功加载Excel居民名单：共导入 ${parseResult.candidateNames.length} 位在册居民，已包含“姓名”字段！模型识别已自动将此作为先验候选词库。`
    );

    // Auto-re-verify or re-run current image against the new candidate list
    if (currentImageDataUrl) {
      handleRunOcr(currentImageDataUrl, currentSampleId, parseResult.records);
    }

    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  // Download official Excel template
  const handleDownloadTemplate = () => {
    const blob = generateVoterExcelTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '大赵庄队组人员名单_导入模板(含姓名字段).xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Select a preset sample image
  const handleSelectSample = (sample: SampleImageItem) => {
    setCurrentSampleId(sample.id);
    setCurrentImageDataUrl(sample.dataUrl);
    setImageFileName(sample.title);
    setZoomLevel(1);
    setRotation(0);
    handleRunOcr(sample.dataUrl, sample.id);
  };

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传JPG或PNG格式的图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCurrentImageDataUrl(result);
      setCurrentSampleId('');
      setImageFileName(file.name);
      setZoomLevel(1);
      setRotation(0);
      handleRunOcr(result, '');
    };
    reader.readAsDataURL(file);
  };

  // Update a voter's name inline
  const handleUpdateName = (id: string, newName: string) => {
    const updated = recognizedVoters.map((v) => {
      if (v.id === id) {
        const recheck = verifyVoterName(
          newName,
          archive,
          v.assignedGroup,
          recognizedVoters.map((item) => (item.id === id ? newName : item.name))
        );
        return {
          ...recheck,
          id: v.id,
          isEdited: true,
          assignedGroup: v.assignedGroup,
        };
      }
      return v;
    });
    setRecognizedVoters(updated);
    syncVotersIntoGroups(updated);
  };

  // Accept a fuzzy suggestion (1-click correction for OCR error)
  const handleAcceptSuggestion = (voterId: string, suggestedName: string) => {
    handleUpdateName(voterId, suggestedName);
  };

  // Change voter's assigned group
  const handleChangeGroup = (voterId: string, groupName: string) => {
    const updated = recognizedVoters.map((v) => {
      if (v.id === voterId) {
        return { ...v, assignedGroup: groupName, isEdited: true };
      }
      return v;
    });
    setRecognizedVoters(updated);
    syncVotersIntoGroups(updated);
  };

  // Delete a voter from list
  const handleDeleteVoter = (voterId: string) => {
    const updated = recognizedVoters.filter((v) => v.id !== voterId);
    setRecognizedVoters(updated);
    syncVotersIntoGroups(updated);
  };

  // Add a single voter manually
  const handleAddManualVoter = () => {
    const defaultGroup = groups[0]?.name || '第一大赵社区居民小组';
    const newVoter = verifyVoterName(
      '新登记选民',
      archive,
      defaultGroup,
      recognizedVoters.map((v) => v.name)
    );
    newVoter.isEdited = true;
    const updated = [...recognizedVoters, newVoter];
    setRecognizedVoters(updated);
    syncVotersIntoGroups(updated);
  };

  // Process batch pasted text
  const handleApplyBatchText = () => {
    if (!batchRawText.trim()) return;
    const names = parseRawNamesText(batchRawText);
    if (names.length === 0) {
      alert('未能解析出有效的姓名，请确保每行输入中文姓名。');
      return;
    }
    const defaultGroup = groups[0]?.name || '第一大赵社区居民小组';
    const verified = batchVerifyVoters(names, archive, defaultGroup);
    setRecognizedVoters(verified);
    syncVotersIntoGroups(verified);
    setShowBatchModal(false);
    setStatusMessage(`已手动导入并核验 ${verified.length} 位选民名单。`);
  };

  // Add a new resident group
  const handleAddNewGroup = () => {
    if (!newGroupName.trim()) return;
    const exists = groups.some((g) => g.name === newGroupName.trim());
    if (exists) {
      alert('该居民小组已存在');
      return;
    }
    const newGroup: ResidentGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      voterNames: [],
    };
    setGroups([...groups, newGroup]);
    setNewGroupName('');
  };

  // Remove a resident group
  const handleRemoveGroup = (groupId: string, groupName: string) => {
    if (groups.length <= 1) {
      alert('请至少保留一个居民小组');
      return;
    }
    if (
      confirm(
        `确定删除【${groupName}】吗？删除后该组内人员将被移入默认第一小组。`
      )
    ) {
      const remaining = groups.filter((g) => g.id !== groupId);
      const fallbackGroup = remaining[0].name;
      const updatedVoters = recognizedVoters.map((v) => {
        if (v.assignedGroup === groupName) {
          return { ...v, assignedGroup: fallbackGroup };
        }
        return v;
      });
      setGroups(remaining);
      setRecognizedVoters(updatedVoters);
      syncVotersIntoGroups(updatedVoters);
    }
  };

  // Calculate statistics
  const totalCount = recognizedVoters.length;
  const matchedCount = recognizedVoters.filter(
    (v) => v.matchStatus === 'matched'
  ).length;
  const unmatchedCount = recognizedVoters.filter(
    (v) => v.matchStatus === 'unmatched'
  ).length;
  const ineligibleCount = recognizedVoters.filter(
    (v) => v.matchStatus === 'age_ineligible'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Excel Candidate Roster Management Card (Prior Knowledge Enhancement) */}
      <div className="bg-white border-2 border-slate-300 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  居民名单Excel表（先验识别候选库）
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  先验约束识别已生效 · 手写姓名全部从中匹配
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                当前底册：<strong className="text-slate-800">{excelFileName}</strong> · 已收录{' '}
                <strong className="text-emerald-700">{candidateNames.length}</strong> 位居民姓名（含“姓名”列）
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden file input for Excel */}
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              onClick={() => excelInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>上传居民名单Excel表 (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
              title="下载包含‘姓名’等标准表头的Excel模板"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>下载Excel模板</span>
            </button>

            <button
              onClick={() => setShowCandidateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>查看候选库({candidateNames.length}人)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Banner & Mode Info */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              手写选民名单智能OCR识别与人工校对工作台
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs sm:text-sm text-slate-500">
              <span>视觉识别模型: {apiSettings.imageModel}</span>
              <span aria-hidden="true">·</span>
              <span>
                先验候选库: {excelFileName} ({candidateNames.length}人)
              </span>
              <span aria-hidden="true">·</span>
              <span>选举基准日: 2026年10月28日</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>模型接口配置</span>
            </button>
            <button
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>纯文本批量导入</span>
            </button>
            <button
              onClick={onGoToPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <span>查看公文公告并导出</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preset Sample Selector Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              快速测试手写样张：
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_HANDWRITTEN_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors border ${
                    currentSampleId === sample.id
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sample.title.split(' - ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Custom File */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>上传手写照片 (JPG/PNG)</span>
            </button>

            <button
              onClick={() => handleRunOcr()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`}
              />
              <span>{isProcessing ? '模型识别中...' : '重新识别'}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-700 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <span className="text-slate-400 text-[11px] font-mono">
              引擎: {recognitionEngine}
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Group Management Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              已启用居民小组（支持动态增减）：
            </span>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-800"
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="text-slate-500 tabular-nums">
                    ({group.voterNames.length}人)
                  </span>
                  {groups.length > 1 && (
                    <button
                      onClick={() => handleRemoveGroup(group.id, group.name)}
                      className="ml-1 text-slate-400 hover:text-red-600"
                      title="删除该组"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="新增小组名称(如:第三大赵...)"
              className="px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-red-600 w-48"
            />
            <button
              onClick={handleAddNewGroup}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>添加小组</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Human-in-the-loop Correction View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Inspection Canvas (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 space-y-3 sticky top-20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                {imageFileName}
              </span>
            </div>

            {/* Canvas Inspection Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                title="放大"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                title="缩小"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="顺时针旋转90度"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setHighContrast((c) => !c)}
                title="黑白高对比度模式(便于看清笔画)"
                className={`p-1.5 rounded text-xs font-medium ${
                  highContrast
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                  setHighContrast(false);
                }}
                title="复位"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Image Viewport */}
          <div className="relative w-full h-[540px] bg-slate-100 rounded border border-slate-200 overflow-auto flex items-center justify-center p-2">
            <div
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
                filter: highContrast
                  ? 'contrast(180%) grayscale(100%) brightness(95%)'
                  : 'none',
              }}
              className="max-w-none transition-all shadow-xs"
            >
              {/* Image element */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageDataUrl}
                alt="手写选民名单照片"
                className="rounded border border-slate-300 max-h-[850px] object-contain"
              />
            </div>

            {/* Helper overlay hint */}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[11px] rounded backdrop-blur-xs">
              支持滚轮缩放与拖拽 · 当前倍率: {Math.round(zoomLevel * 100)}%
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Verification & Correction Workbench (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                核验列表与人机协同校正
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                手写姓名已与【{excelFileName}】进行精准对齐，可内联编辑或点击黄色建议替换
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddManualVoter}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>手动补录选民</span>
              </button>
            </div>
          </div>

          {/* Summary Badges */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 text-[11px]">识别总计</div>
              <div className="text-base font-bold text-slate-900 tabular-nums">
                {totalCount} 人
              </div>
            </div>
            <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded">
              <div className="text-emerald-700 text-[11px]">Excel底册匹配</div>
              <div className="text-base font-bold text-emerald-800 tabular-nums">
                {matchedCount} 人
              </div>
            </div>
            <div className="p-2 bg-amber-50/70 border border-amber-200 rounded">
              <div className="text-amber-700 text-[11px]">待人工核验</div>
              <div className="text-base font-bold text-amber-800 tabular-nums">
                {unmatchedCount} 人
              </div>
            </div>
            <div className="p-2 bg-rose-50/70 border border-rose-200 rounded">
              <div className="text-rose-700 text-[11px]">未达法龄预警</div>
              <div className="text-base font-bold text-rose-800 tabular-nums">
                {ineligibleCount} 人
              </div>
            </div>
          </div>

          {/* Voters List Table */}
          {recognizedVoters.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-sm">暂无识别数据</div>
              <button
                onClick={() => handleRunOcr()}
                className="px-4 py-2 text-xs font-medium text-white bg-red-700 rounded-md hover:bg-red-800"
              >
                开始识别当前手写样张
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
              {recognizedVoters.map((voter, index) => {
                const isMatched = voter.matchStatus === 'matched';
                const isIneligible = voter.matchStatus === 'age_ineligible';
                const isUnmatched = voter.matchStatus === 'unmatched';
                const isDuplicate = voter.matchStatus === 'duplicate';

                return (
                  <div
                    key={voter.id}
                    className={`p-3 text-xs transition-colors hover:bg-slate-50/80 ${
                      isIneligible
                        ? 'bg-rose-50/30'
                        : isUnmatched
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Name input and index */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[11px] w-6 text-right tabular-nums">
                          {String(index + 1).padStart(2, '0')}.
                        </span>

                        <input
                          type="text"
                          value={voter.name}
                          onChange={(e) =>
                            handleUpdateName(voter.id, e.target.value)
                          }
                          className="font-bold text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-hidden focus:ring-1 focus:ring-red-600 bg-white w-28 tracking-wide"
                        />

                        {/* Status Label */}
                        {isMatched && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              Excel底册核对通过 · {voter.matchedRecord?.age}岁 ·{' '}
                              {voter.matchedRecord?.gender}
                            </span>
                          </span>
                        )}

                        {isIneligible && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>
                              {voter.notes ||
                                `未满18周岁(当前${voter.matchedRecord?.age}岁)`}
                            </span>
                          </span>
                        )}

                        {isUnmatched && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>未在Excel表中匹配，请人工核实</span>
                          </span>
                        )}

                        {isDuplicate && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>重复登记</span>
                          </span>
                        )}
                      </div>

                      {/* Right: Group selector and delete button */}
                      <div className="flex items-center gap-2 ml-8 sm:ml-0">
                        <select
                          value={voter.assignedGroup}
                          onChange={(e) =>
                            handleChangeGroup(voter.id, e.target.value)
                          }
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-hidden"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDeleteVoter(voter.id)}
                          title="从名单中移除"
                          className="text-slate-400 hover:text-red-600 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Fuzzy Suggestions Row for Unmatched Voter */}
                    {isUnmatched &&
                      voter.suggestedMatches &&
                      voter.suggestedMatches.length > 0 && (
                        <div className="mt-2 ml-8 p-2 bg-amber-50 border border-amber-200 rounded flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-amber-800">
                            Excel底册智能推荐候选人：
                          </span>
                          {voter.suggestedMatches.map((cand) => (
                            <button
                              key={cand.record.id}
                              onClick={() =>
                                handleAcceptSuggestion(
                                  voter.id,
                                  cand.record.name
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded text-xs transition-colors"
                              title={`点击自动修正为：${cand.record.name} (${cand.record.group}, ${cand.record.age}岁)`}
                            >
                              <Check className="w-3 h-3 text-amber-700" />
                              <span className="font-bold">
                                {cand.record.name}
                              </span>
                              <span className="text-[10px] text-amber-600">
                                ({cand.reason})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                    {/* Voter extra details if matched */}
                    {isMatched && voter.matchedRecord && (
                      <div className="mt-1 ml-8 text-[11px] text-slate-400 flex items-center gap-2">
                        <span>身份证: {voter.matchedRecord.idCardMasked}</span>
                        <span>·</span>
                        <span>组别: {voter.matchedRecord.group}</span>
                        <span>·</span>
                        <span>地址: {voter.matchedRecord.address}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Confirmation CTA */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              提示：核验结果已实时与法定选举公告同步
            </span>
            <button
              onClick={onGoToPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded transition-colors shadow-xs"
            >
              <span>确认无误，进入公文导出</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Names Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  当前已绑定居民名单Excel候选库
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  来源文件：{excelFileName} · 共 {candidateNames.length} 人
                </p>
              </div>
              <button
                onClick={() => setShowCandidateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
              识别模型在扫描手写图片时，将以此名单为基准先验字典进行约束匹配，遇到草书或连笔字迹时优先对齐此处标准姓名。
            </div>

            <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {archive.map((v, idx) => (
                  <div
                    key={v.id}
                    className="p-1.5 bg-slate-50 border border-slate-100 rounded flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-800">{v.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {v.group.replace('社区居民小组', '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                可随时在“在册档案”中批量导出或增删
              </span>
              <button
                onClick={() => setShowCandidateModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Manual Paste Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                纯文本选民名单批量录入
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              可直接粘贴队长发来的微信文字或名单记录（支持空格、逗号、顿号或换行分隔），系统将自动进行清洗、提取并与档案比对。
            </p>
            <textarea
              rows={8}
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
              placeholder="例如：&#10;赵建国、赵明华、赵秀英、赵小龙&#10;王桂芝 李德顺 赵振江 张玉梅"
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleApplyBatchText}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded"
              >
                开始解析并核对
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                大模型接口服务配置
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={apiSettings.baseUrl}
                  onChange={(e) =>
                    setApiSettings({ ...apiSettings, baseUrl: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiSettings.apiKey}
                  onChange={(e) =>
                    setApiSettings({ ...apiSettings, apiKey: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  图片手写识别模型 (Image OCR)
                </label>
                <input
                  type="text"
                  value={apiSettings.imageModel}
                  onChange={(e) =>
                    setApiSettings({
                      ...apiSettings,
                      imageModel: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  文本规整处理模型 (Text NLP)
                </label>
                <input
                  type="text"
                  value={apiSettings.textModel}
                  onChange={(e) =>
                    setApiSettings({ ...apiSettings, textModel: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-red-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
