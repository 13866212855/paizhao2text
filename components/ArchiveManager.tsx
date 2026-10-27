'use client';

import React, { useState, useRef } from 'react';
import { VoterRecord } from '@/lib/types';
import {
  parseVoterExcel,
  generateVoterExcelTemplate,
} from '@/lib/excelParser';
import {
  Search,
  Plus,
  RotateCcw,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Download,
} from 'lucide-react';

interface ArchiveManagerProps {
  archive: VoterRecord[];
  setArchive: React.Dispatch<React.SetStateAction<VoterRecord[]>>;
  onResetArchive: () => void;
  excelFileName: string;
  setExcelFileName: (name: string) => void;
}

export function ArchiveManager({
  archive,
  setArchive,
  onResetArchive,
  excelFileName,
  setExcelFileName,
}: ArchiveManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);

  // New Voter Form state
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'男' | '女'>('男');
  const [newAge, setNewAge] = useState<number>(35);
  const [newGroup, setNewGroup] = useState('第一大赵社区居民小组');
  const [newAddress, setNewAddress] = useState('大赵庄东路');

  // Filter voters
  const filteredVoters = archive.filter((voter) => {
    const matchesSearch =
      voter.name.includes(searchQuery.trim()) ||
      voter.idCardMasked.includes(searchQuery.trim()) ||
      voter.group.includes(searchQuery.trim()) ||
      voter.address?.includes(searchQuery.trim());

    const matchesGroup =
      selectedGroup === 'ALL' || voter.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  // Calculate statistics
  const totalCount = archive.length;
  const eligibleCount = archive.filter((v) => v.isEligible).length;
  const underAgeCount = archive.filter((v) => v.age < 18).length;
  const elderlyCount = archive.filter((v) => v.age >= 80).length;

  // Handle uploading Excel file
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadNotice(`正在读取并解析Excel: ${file.name}...`);
    const parseResult = await parseVoterExcel(file);

    if (!parseResult.success) {
      alert(parseResult.error || '解析Excel表失败');
      setUploadNotice(parseResult.error || '解析失败');
      if (excelInputRef.current) excelInputRef.current.value = '';
      return;
    }

    setExcelFileName(file.name);
    setArchive(parseResult.records);
    setUploadNotice(
      `成功导入【${file.name}】：提取 ${parseResult.candidateNames.length} 位在册居民，已作为当前先验底册！`
    );

    if (excelInputRef.current) excelInputRef.current.value = '';
    setTimeout(() => setUploadNotice(null), 5000);
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

  // Add voter handler
  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const birthYear = 2026 - newAge;
    const isEligible = newAge >= 18 && newAge <= 99;

    const newRecord: VoterRecord = {
      id: `DZ-NEW-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      gender: newGender,
      age: Number(newAge),
      birthDate: `${birthYear}-01-01`,
      idCardMasked: `341221${birthYear}0101****`,
      group: newGroup,
      status: isEligible ? '正常' : newAge < 18 ? '未满18周岁' : '超龄特殊',
      isEligible,
      address: newAddress,
    };

    setArchive([newRecord, ...archive]);
    setShowAddModal(false);
    setNewName('');
  };

  // Export Archive to CSV
  const handleExportCsv = () => {
    const headers =
      '编号,姓名,性别,年龄,出生日期,掩码身份证号,所属小组,参选资格,户籍地址\n';
    const rows = archive
      .map(
        (v) =>
          `"${v.id}","${v.name}","${v.gender}",${v.age},"${v.birthDate}","${
            v.idCardMasked
          }","${v.group}","${v.isEligible ? '符合(18-99岁)' : '不符合'}","${
            v.address || ''
          }"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '大赵庄队组人员名单v2_18-99岁（筛选表）.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title & Stats Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-700" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                居民名单Excel在册底册（{excelFileName}）
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              上传手写图片中出现的姓名全部从中提取匹配 · 包含户籍档案与法定选举年龄(18-99周岁)核验
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden Excel input */}
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
              <span>上传居民名单Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>下载Excel模板</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
            >
              <span>导出CSV</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>补录在册选民</span>
            </button>

            <button
              onClick={onResetArchive}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 rounded transition-colors"
              title="重置为初始标准名单"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置预置底册</span>
            </button>
          </div>
        </div>

        {uploadNotice && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center justify-between">
            <span>{uploadNotice}</span>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <div className="text-xs text-slate-500">底册总登记人数</div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              {totalCount} 人
            </div>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded">
            <div className="text-xs text-emerald-800">
              法定有效选民 (18-99岁)
            </div>
            <div className="text-lg font-bold text-emerald-800 tabular-nums">
              {eligibleCount} 人
            </div>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded">
            <div className="text-xs text-amber-800">80岁及以上高龄长者</div>
            <div className="text-lg font-bold text-amber-800 tabular-nums">
              {elderlyCount} 人
            </div>
          </div>
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded">
            <div className="text-xs text-rose-800">未达法龄限制 (不满18岁)</div>
            <div className="text-lg font-bold text-rose-800 tabular-nums">
              {underAgeCount} 人
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索姓名、身份证前缀、地址..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-red-600"
            />
          </div>
        </div>

        {/* Group tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedGroup('ALL')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              selectedGroup === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            全部小组 ({totalCount})
          </button>
          <button
            onClick={() => setSelectedGroup('第一大赵社区居民小组')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              selectedGroup === '第一大赵社区居民小组'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            第一小组
          </button>
          <button
            onClick={() => setSelectedGroup('第二大赵社区居民小组')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              selectedGroup === '第二大赵社区居民小组'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            第二小组
          </button>
          <button
            onClick={() => setSelectedGroup('第三大赵社区居民小组')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              selectedGroup === '第三大赵社区居民小组'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            第三小组
          </button>
        </div>
      </div>

      {/* Voter Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">档案编号</th>
                <th className="py-2.5 px-3">选民姓名</th>
                <th className="py-2.5 px-3">性别</th>
                <th className="py-2.5 px-3">年龄(周岁)</th>
                <th className="py-2.5 px-3">出生日期</th>
                <th className="py-2.5 px-3">身份证号码(脱敏)</th>
                <th className="py-2.5 px-3">所属居民小组</th>
                <th className="py-2.5 px-3">法定参选状态</th>
                <th className="py-2.5 px-3">户籍居住地</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVoters.map((voter) => {
                const isUnderage = voter.age < 18;
                return (
                  <tr
                    key={voter.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isUnderage ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {voter.id}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                      {voter.name}
                    </td>
                    <td className="py-2.5 px-3">{voter.gender}</td>
                    <td className="py-2.5 px-3 tabular-nums font-mono font-semibold">
                      {voter.age} 岁
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {voter.birthDate}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {voter.idCardMasked}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {voter.group}
                    </td>
                    <td className="py-2.5 px-3">
                      {voter.isEligible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>符合法定资格(18-99岁)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{voter.remarks || '未满18周岁(不可参选)'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-[160px]">
                      {voter.address || '大赵庄村'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Voter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                向档案底册补录选民信息
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVoter} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  选民姓名
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="如：赵建军"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    性别
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) =>
                      setNewGender(e.target.value as '男' | '女')
                    }
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    年龄（周岁）
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  所属居民小组
                </label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                >
                  <option value="第一大赵社区居民小组">
                    第一大赵社区居民小组
                  </option>
                  <option value="第二大赵社区居民小组">
                    第二大赵社区居民小组
                  </option>
                  <option value="第三大赵社区居民小组">
                    第三大赵社区居民小组
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  户籍住址
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded"
                >
                  保存录入档案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
