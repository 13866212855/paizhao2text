import * as XLSX from 'xlsx';
import { VoterRecord } from './types';

export interface ExcelParseResult {
  success: boolean;
  records: VoterRecord[];
  candidateNames: string[];
  totalRows: number;
  detectedColumns: string[];
  fileName: string;
  error?: string;
  groupsFound: string[];
}

/**
 * Parse uploaded Excel (.xlsx, .xls) or CSV file into VoterRecords
 * Must include a '姓名' column.
 */
export async function parseVoterExcel(
  file: File
): Promise<ExcelParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        records: [],
        candidateNames: [],
        totalRows: 0,
        detectedColumns: [],
        fileName: file.name,
        groupsFound: [],
        error: 'Excel文件中未找到有效工作表(Sheet)',
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Read sheet as JSON with header row
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet,
      { defval: '' }
    );

    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        records: [],
        candidateNames: [],
        totalRows: 0,
        detectedColumns: [],
        fileName: file.name,
        groupsFound: [],
        error: 'Excel工作表内容为空，请确保第一行为表头并包含“姓名”字段',
      };
    }

    // Inspect first row keys to detect columns
    const firstRow = rawData[0];
    const detectedColumns = Object.keys(firstRow).map((k) => k.trim());

    // Identify Name column (support various common synonyms)
    const nameColKey = Object.keys(firstRow).find((key) => {
      const cleanKey = key.trim();
      return (
        cleanKey === '姓名' ||
        cleanKey === '选民姓名' ||
        cleanKey === '居民姓名' ||
        cleanKey === '名字' ||
        cleanKey.toLowerCase() === 'name'
      );
    });

    if (!nameColKey) {
      return {
        success: false,
        records: [],
        candidateNames: [],
        totalRows: rawData.length,
        detectedColumns,
        fileName: file.name,
        groupsFound: [],
        error: `Excel表中未找到“姓名”字段。检测到的表头为：【${detectedColumns.join(
          '、'
        )}】。请在Excel中至少添加“姓名”列。`,
      };
    }

    // Optional column finders
    const ageColKey = Object.keys(firstRow).find((k) =>
      ['年龄', '周岁', '实岁', 'age'].includes(k.trim().toLowerCase())
    );
    const genderColKey = Object.keys(firstRow).find((k) =>
      ['性别', '男女', 'gender', 'sex'].includes(k.trim().toLowerCase())
    );
    const groupColKey = Object.keys(firstRow).find((k) =>
      [
        '所属小组',
        '小组',
        '居民小组',
        '队组',
        '社区小组',
        '组别',
        'group',
      ].includes(k.trim().toLowerCase())
    );
    const idCardColKey = Object.keys(firstRow).find((k) =>
      ['身份证号', '身份证', '证件号', 'idcard', 'id_card'].includes(
        k.trim().toLowerCase()
      )
    );
    const addressColKey = Object.keys(firstRow).find((k) =>
      ['住址', '户籍地址', '居住地', '地址', 'address'].includes(
        k.trim().toLowerCase()
      )
    );
    const birthColKey = Object.keys(firstRow).find((k) =>
      ['出生日期', '出生年月', '生日', 'birth', 'birthday'].includes(
        k.trim().toLowerCase()
      )
    );

    const records: VoterRecord[] = [];
    const candidateNamesSet = new Set<string>();
    const groupsSet = new Set<string>();

    rawData.forEach((row, index) => {
      const rawName = String(row[nameColKey] || '').trim();
      // Clean up whitespace or numbers
      const cleanedName = rawName.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').trim();

      if (!cleanedName || cleanedName.length < 2) {
        return; // skip invalid or empty names
      }

      candidateNamesSet.add(cleanedName);

      // Extract or compute age
      let age = 38;
      if (ageColKey && row[ageColKey]) {
        const parsedAge = parseInt(String(row[ageColKey]).replace(/\D/g, ''), 10);
        if (!isNaN(parsedAge) && parsedAge > 0) {
          age = parsedAge;
        }
      }

      // Gender
      let gender: '男' | '女' = '男';
      if (genderColKey && row[genderColKey]) {
        const gStr = String(row[genderColKey]).trim();
        if (gStr === '女' || gStr.toLowerCase() === 'f' || gStr === 'female') {
          gender = '女';
        }
      }

      // Group
      let groupName = '第一大赵社区居民小组';
      if (groupColKey && row[groupColKey]) {
        const grp = String(row[groupColKey]).trim();
        if (grp) {
          groupName = grp;
          groupsSet.add(grp);
        }
      } else {
        groupsSet.add(groupName);
      }

      // Birth date & ID card
      const birthYear = 2026 - age;
      const birthDate =
        birthColKey && row[birthColKey]
          ? String(row[birthColKey]).trim()
          : `${birthYear}-05-15`;

      const idCardMasked =
        idCardColKey && row[idCardColKey]
          ? String(row[idCardColKey]).trim()
          : `341221${birthYear}0515****`;

      const address =
        addressColKey && row[addressColKey]
          ? String(row[addressColKey]).trim()
          : `${groupName}大赵庄`;

      const isEligible = age >= 18 && age <= 99;

      records.push({
        id: `EXCEL-${String(index + 1).padStart(3, '0')}`,
        name: cleanedName,
        gender,
        age,
        birthDate,
        idCardMasked,
        group: groupName,
        status: isEligible ? '正常' : age < 18 ? '未满18周岁' : '超龄特殊',
        isEligible,
        address,
      });
    });

    if (records.length === 0) {
      return {
        success: false,
        records: [],
        candidateNames: [],
        totalRows: rawData.length,
        detectedColumns,
        fileName: file.name,
        groupsFound: [],
        error: '未能从“姓名”列中提取到有效中文姓名，请检查Excel文件内容。',
      };
    }

    return {
      success: true,
      records,
      candidateNames: Array.from(candidateNamesSet),
      totalRows: records.length,
      detectedColumns,
      fileName: file.name,
      groupsFound: Array.from(groupsSet),
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      records: [],
      candidateNames: [],
      totalRows: 0,
      detectedColumns: [],
      fileName: file.name,
      groupsFound: [],
      error: `解析Excel文件失败: ${error.message || '文件格式不正确'}`,
    };
  }
}

/**
 * Generate a standard downloadable Excel template (.xlsx) with Chinese headers
 */
export function generateVoterExcelTemplate(): Blob {
  const sampleData = [
    {
      姓名: '赵建国',
      性别: '男',
      年龄: 52,
      所属小组: '第一大赵社区居民小组',
      出生日期: '1974-04-12',
      身份证号: '34122119740412****',
      户籍住址: '大赵庄东街12号',
    },
    {
      姓名: '赵明华',
      性别: '男',
      年龄: 48,
      所属小组: '第一大赵社区居民小组',
      出生日期: '1978-08-25',
      身份证号: '34122119780825****',
      户籍住址: '大赵庄东街15号',
    },
    {
      姓名: '赵秀英',
      性别: '女',
      年龄: 63,
      所属小组: '第一大赵社区居民小组',
      出生日期: '1963-02-18',
      身份证号: '34122119630218****',
      户籍住址: '大赵庄东街18号',
    },
    {
      姓名: '郭秀兰',
      性别: '女',
      年龄: 59,
      所属小组: '第二大赵社区居民小组',
      出生日期: '1967-06-11',
      身份证号: '34122119670611****',
      户籍住址: '第二大赵西街2号',
    },
    {
      姓名: '赵永强',
      性别: '男',
      年龄: 47,
      所属小组: '第二大赵社区居民小组',
      出生日期: '1979-09-03',
      身份证号: '34122119790903****',
      户籍住址: '第二大赵西街5号',
    },
    {
      姓名: '赵文博',
      性别: '男',
      年龄: 24,
      所属小组: '第二大赵社区居民小组',
      出生日期: '2002-03-27',
      身份证号: '34122120020327****',
      户籍住址: '第二大赵中心排6号',
    },
    {
      姓名: '赵兴汉',
      性别: '男',
      年龄: 58,
      所属小组: '第三大赵社区居民小组',
      出生日期: '1968-01-15',
      身份证号: '34122119680115****',
      户籍住址: '第三大赵前街1号',
    },
    {
      姓名: '赵子轩',
      性别: '男',
      年龄: 17,
      所属小组: '第一大赵社区居民小组',
      出生日期: '2009-03-15',
      身份证号: '34122120090315****',
      户籍住址: '大赵庄东街33号(未满18岁测试)',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    '大赵庄居民名单(筛选表)'
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
