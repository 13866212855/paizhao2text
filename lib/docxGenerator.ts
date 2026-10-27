import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageOrientation,
} from 'docx';
import { AnnouncementConfig, ResidentGroup } from './types';

/**
 * Generate standard Chinese official election bulletin Word document (.docx)
 * conforms to Chinese Government Official Document Format (GB/T 9704-2012)
 * Paper: A4, standard margins
 * Fonts:
 *   - Document Title: 二号 (22pt) 方正小标宋 / 黑体 / 宋体加粗
 *   - Doc Number: 三号 (16pt/14pt) 楷体 / 仿宋
 *   - Group Header: 三号 (14pt) 黑体加粗
 *   - Body Text: 三号 (14pt) 仿宋 / 楷体，行距28磅，首行缩进2字符
 *   - Signature: 三号 (14pt) 仿宋 / 楷体，右对齐
 */
export async function generateElectionAnnouncementDocx(
  config: AnnouncementConfig,
  groups: ResidentGroup[]
): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  // 1. Official Red / Prominent Document Title (居中加粗二号字 22pt = 44 half-points)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 160, line: 400 },
      children: [
        new TextRun({
          text: config.bulletinTitle,
          bold: true,
          size: 44, // 22pt
          font: '方正小标宋_GBK',
          color: '990000', // Official Chinese deep red
        }),
      ],
    })
  );

  // 2. Document Notice Number (居中三号仿宋/楷体 14pt = 28 half-points)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 300, line: 360 },
      children: [
        new TextRun({
          text: config.docNumber,
          size: 28, // 14pt
          font: '仿宋_GB2312',
          color: '333333',
        }),
      ],
    })
  );

  // 3. Legal Basis and Introduction (首行缩进2字符 = 560 twips)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 560 },
      spacing: { before: 120, after: 200, line: 440 }, // ~1.5x line spacing
      children: [
        new TextRun({
          text: config.legalBasis,
          size: 28, // 14pt
          font: '仿宋_GB2312',
        }),
      ],
    })
  );

  // 4. Resident Groups and Voter Names
  groups.forEach((group) => {
    // Group Subheading (e.g. "第一大赵社区居民小组：")
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 120, line: 360 },
        children: [
          new TextRun({
            text: `${group.name}（共 ${group.voterNames.length} 人）：`,
            bold: true,
            size: 28, // 14pt
            font: '黑体',
            color: '111827',
          }),
        ],
      })
    );

    // Group Voter Names list (separated by dunhao or configured separator)
    const formattedNames =
      group.voterNames.length > 0
        ? group.voterNames.join(config.separator)
        : '（暂无已核验通过的选民名单）';

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.BOTH, // Justified for clean printed block look
        indent: { firstLine: 560 }, // 2 character indent
        spacing: { before: 80, after: 200, line: 480 }, // 28pt standard spacing
        children: [
          new TextRun({
            text: formattedNames,
            size: 28, // 14pt
            font: '仿宋_GB2312',
            color: '1f2937',
          }),
        ],
      })
    );
  });

  // 5. Objection and Public Notice Clause (如有遗漏...)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 560 },
      spacing: { before: 280, after: 360, line: 440 },
      children: [
        new TextRun({
          text: config.objectionNotice,
          size: 28, // 14pt
          font: '仿宋_GB2312',
        }),
      ],
    })
  );

  // 6. Committee Signature (Right-aligned, 仿宋)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 80, line: 360 },
      children: [
        new TextRun({
          text: config.committeeName,
          size: 28, // 14pt
          font: '仿宋_GB2312',
          bold: true,
        }),
      ],
    })
  );

  // 7. Date (Right-aligned)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 200, line: 360 },
      children: [
        new TextRun({
          text: config.publishDate,
          size: 28, // 14pt
          font: '仿宋_GB2312',
        }),
      ],
    })
  );

  // Create the official document with standard A4 margins
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 1417, // 25mm in twips
              bottom: 1417,
              left: 1417,
              right: 1417,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Trigger immediate browser download of the generated docx file
 */
export function downloadDocxBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
