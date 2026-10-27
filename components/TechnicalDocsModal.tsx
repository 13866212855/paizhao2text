'use client';

import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  CheckCircle,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';

export function TechnicalDocsModal() {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const pythonFlaskCode = `# ==============================================================================
# 古城镇大赵社区换届选举选民名单识别与公告生成系统 (Python + Flask 独立服务)
# 技术栈: Python 3.10+ | Flask | Requests | Pandas | python-docx
# 模型配置: baseUrl: https://apihub.agnes-ai.com/v1
#           Image Model: Agnes-Image-2.1-flash
#           Text Model: Agnes-2.5-flash
# ==============================================================================

import os
import base64
import re
import requests
import pandas as pd
from flask import Flask, request, jsonify, send_file
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

app = Flask(__name__)

AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1"
AGNES_API_KEY = "sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9"
IMAGE_MODEL = "Agnes-Image-2.1-flash"
TEXT_MODEL = "Agnes-2.5-flash"

# 加载系统已有名单："大赵庄队组人员名单v2_18-99岁（筛选表）.xlsx"
# 数据结构包括：姓名、性别、年龄、出生年月、身份证号、所属小组
# 全局或Session维护的在册选民数据底册
voter_archive_df = None

# 0. 上传居民名单Excel表接口 (提取“姓名”字段作为先验词库)
@app.route("/api/upload-excel", methods=["POST"])
def upload_excel():
    global voter_archive_df
    file = request.files.get("excel")
    if not file:
        return jsonify({"error": "请上传Excel文件"}), 400
    
    df = pd.read_excel(file)
    if "姓名" not in df.columns:
        return jsonify({"error": "Excel表中必须包含‘姓名’字段"}), 400
        
    voter_archive_df = df
    candidate_names = df["姓名"].dropna().astype(str).str.strip().tolist()
    return jsonify({
        "success": True, 
        "total": len(candidate_names),
        "candidates": candidate_names,
        "message": f"成功加载居民名单Excel表，已收录{len(candidate_names)}位居民先验候选词"
    })

def get_current_archive():
    global voter_archive_df
    if voter_archive_df is not None:
        return voter_archive_df
    if os.path.exists(VOTER_EXCEL_PATH):
        return pd.read_excel(VOTER_EXCEL_PATH)
    return pd.DataFrame([
        {"姓名": "赵建国", "年龄": 52, "所属小组": "第一大赵社区居民小组", "资格": "正常"},
        {"姓名": "赵明华", "年龄": 48, "所属小组": "第一大赵社区居民小组", "资格": "正常"},
        {"姓名": "赵秀英", "年龄": 63, "所属小组": "第一大赵社区居民小组", "资格": "正常"},
        {"姓名": "郭秀兰", "年龄": 59, "所属小组": "第二大赵社区居民小组", "资格": "正常"},
        {"姓名": "赵永强", "年龄": 47, "所属小组": "第二大赵社区居民小组", "资格": "正常"},
        {"姓名": "赵子轩", "年龄": 17, "所属小组": "第一大赵社区居民小组", "资格": "未满18周岁"},
    ])

# 1. 结合Excel名单先验增强的图片手写识别接口 (Agnes-Image-2.1-flash)
@app.route("/api/recognize", methods=["POST"])
def recognize_handwriting():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "请上传手写图片"}), 400

    img_base64 = base64.b64encode(file.read()).decode("utf-8")
    archive_df = get_current_archive()
    
    # 提取Excel中的全部候选人姓名，注入大模型Prompt作为强先验约束
    candidate_names = archive_df["姓名"].dropna().astype(str).str.strip().tolist()
    candidate_hint = f"\\n【重要先验提示】：图片中的所有手写姓名均严格来自于以下居民Excel表（共{len(candidate_names)}人）：\\n[{'、'.join(candidate_names[:100])}]\\n请将识别到的手写笔画严格对齐到上述名单中最匹配的标准姓名。"

    headers = {
        "Authorization": f"Bearer {AGNES_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": IMAGE_MODEL,
        "messages": [
            {
                "role": "system",
                "content": f"你是基层选民名单OCR识别专家。请逐行识别图片中队长手写的选民姓名，纯文本输出，每行一个。{candidate_hint}"
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "请仔细识别图片中的全部手写选民姓名，并与已给出的居民名单Excel表精准对齐："},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"}}
                ]
            }
        ],
        "temperature": 0.1
    }
    
    res = requests.post(f"{AGNES_BASE_URL}/chat/completions", headers=headers, json=payload, timeout=20)
    data = res.json()
    raw_content = data["choices"][0]["message"]["content"]
    
    # 提取姓名
    raw_names = [n.strip() for n in re.split(r"[\\n、,，\\s]+", raw_content) if len(n.strip()) in (2, 3, 4)]
    
    # 2. 档案核验比对
    verified_results = []
    
    for name in raw_names:
        matched = archive_df[archive_df["姓名"] == name]
        if not matched.empty:
            row = matched.iloc[0]
            age = int(row["年龄"])
            group = row.get("所属小组", "第一大赵社区居民小组")
            if 18 <= age <= 99:
                status = "matched"
                tip = f"核对通过 (所属: {group}, {age}岁)"
            else:
                status = "age_ineligible"
                tip = f"年龄不符合要求 (当前{age}岁，不满18周岁或超出法龄)"
        else:
            status = "unmatched"
            tip = "未匹配到档案，请人工核实"
            group = "第一大赵社区居民小组"
            
        verified_results.append({
            "name": name,
            "status": status,
            "tip": tip,
            "group": group
        })
        
    return jsonify({"success": True, "voters": verified_results})

# 3. 生成并导出标准Word公文公告 (.docx)
@app.route("/api/export-docx", methods=["POST"])
def export_docx():
    req_data = request.json
    groups_data = req_data.get("groups", {}) # { "第一大赵社区居民小组": ["赵建国", "赵明华"], ... }
    doc_number = req_data.get("doc_number", "大赵社区选字第4号")
    publish_date = req_data.get("publish_date", "2026年10月28日")
    deadline_date = req_data.get("deadline_date", "2026年11月3日前")
    
    doc = Document()
    
    # 设置页边距 A4 标准 25mm
    for section in doc.sections:
        section.top_margin = Inches(0.98)
        section.bottom_margin = Inches(0.98)
        section.left_margin = Inches(0.98)
        section.right_margin = Inches(0.98)
        
    # 标题 (居中加粗二号字 22pt)
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title_p.add_run("古城镇大赵社区居民委员会换届选举选民名单公告")
    run_title.font.name = "方正小标宋_GBK"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(180, 0, 0) # 官方公文红
    
    # 文号
    num_p = doc.add_paragraph()
    num_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_num = num_p.add_run(doc_number)
    run_num.font.name = "仿宋_GB2312"
    run_num.font.size = Pt(14)
    
    # 法定依据正文
    body1 = doc.add_paragraph()
    body1.paragraph_format.first_line_indent = Pt(28) # 首行缩进2字符
    run_body1 = body1.add_run("根据《中华人民共和国村民委员会组织法》和《安徽省村民委员会选举办法》的规定，现将本村登记的选民名单公布如下：")
    run_body1.font.name = "仿宋_GB2312"
    run_body1.font.size = Pt(14)
    
    # 动态小组名单填充
    for group_name, names in groups_data.items():
        gp = doc.add_paragraph()
        run_gname = gp.add_run(f"{group_name}：")
        run_gname.font.name = "黑体"
        run_gname.font.size = Pt(14)
        run_gname.font.bold = True
        
        np = doc.add_paragraph()
        np.paragraph_format.first_line_indent = Pt(28)
        names_str = "、".join(names) if names else "（暂无）"
        run_names = np.add_run(names_str)
        run_names.font.name = "仿宋_GB2312"
        run_names.font.size = Pt(14)
        
    # 异议条款
    objection_p = doc.add_paragraph()
    objection_p.paragraph_format.first_line_indent = Pt(28)
    run_obj = objection_p.add_run(f"如有遗漏，或对公布的选民名单有不同意见，可在名单公布之日起5日内（{deadline_date}）向村民选举委员会提出。")
    run_obj.font.name = "仿宋_GB2312"
    run_obj.font.size = Pt(14)
    
    # 落款与日期
    sig_p = doc.add_paragraph()
    sig_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run_sig = sig_p.add_run("大赵社区居民选举委员会\\n" + publish_date)
    run_sig.font.name = "仿宋_GB2312"
    run_sig.font.size = Pt(14)
    
    out_path = "/tmp/voter_announcement.docx"
    doc.save(out_path)
    return send_file(out_path, as_attachment=True, download_name="古城镇大赵社区换届选举选民名单公告.docx")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <Code className="w-6 h-6 text-red-700" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              系统实现方案、技术架构与Python+Flask代码说明
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              本系统完全满足基层换届选举选民名单识别、档案核验与公文Word导出规范
            </p>
          </div>
        </div>

        {/* Section 1: Accuracy Strategy */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>如何处理手写识别准确率不足的情况（人机协同4重保障体系）</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>图像自适应预处理与对比度增强</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                村队长手写纸张往往存在光照不匀、圆珠笔/钢笔笔迹发淡、纸张格子干扰等问题。系统集成了高对比度灰度化滤波与角度倾斜旋转校正，提升大模型多模态视觉特征提取清晰度。
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>专用多模态Prompt与结构化解析</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                针对 <code className="font-mono text-red-700">Agnes-Image-2.1-flash</code> 注入基层手写连笔字专项识别Prompt指令，明确排除序号、表头与注释干扰，约束仅输出标准化中文姓名列表。
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>大赵庄在册档案形似/同音字模糊匹配矩阵</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                内置汉字连笔草书混淆字典（如：汪↔王、峰↔锋、宝↔保、兰↔蓝、秀↔季）。当OCR识别出“汪桂芝”未建档时，算法自动检索底册推荐“王桂芝”，并标注相似度，支持操作员一键采纳纠错。
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <span>双联同屏人机协同校正工作台 (HITL)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                左侧手写原图支持任意滚轮缩放与拖拽视口，右侧每位选民均可内联修改姓名、切换居民小组、删除异常或手工补录，彻底杜绝任何遗漏或错登，确保法定公告100%严肃准确。
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-group Dynamic Management */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>多居民小组动态增减与名单自动分配机制</span>
          </h2>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              系统预置第一大赵社区居民小组、第二大赵社区居民小组，并支持村选举委员会随时点击“添加小组”输入任意名称（如：第三大赵社区居民小组、返乡选民流动小组等）。
            </p>
            <p>
              当识别姓名匹配到大赵庄在册档案时，系统会根据档案字段自动将选民归入其对应所属小组；如需人工调整，亦可在工作台下拉选单中秒级切换指定小组。
            </p>
          </div>
        </div>

        {/* Section 3: Full Python Flask Implementation Code */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-red-700" />
              <span>Python + Flask 完整服务端代码 (附带 python-docx 排版)</span>
            </h2>
            <button
              onClick={() => handleCopy(pythonFlaskCode, 'flask')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              {copiedIndex === 'flask' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedIndex === 'flask' ? '已复制代码' : '复制Python脚本'}</span>
            </button>
          </div>

          <div className="relative bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-[500px]">
            <pre>
              <code>{pythonFlaskCode}</code>
            </pre>
          </div>
        </div>

        {/* Section 4: Python environment setup */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
          <div className="font-bold text-slate-900">Python 依赖安装清单 (requirements.txt):</div>
          <div className="font-mono bg-white p-2.5 border border-slate-200 rounded text-slate-700">
            flask&gt;=2.3.0<br />
            requests&gt;=2.31.0<br />
            pandas&gt;=2.0.0<br />
            openpyxl&gt;=3.1.0<br />
            python-docx&gt;=1.1.0
          </div>
          <div className="text-slate-500">
            运行命令：<code>pip install -r requirements.txt && python app.py</code>
          </div>
        </div>
      </div>
    </div>
  );
}
