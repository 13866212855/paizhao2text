import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '古城镇大赵社区换届选举选民名单识别与公告生成系统',
  description: '基层换届选举选民名单智能OCR识别、档案比对核验与公文Word一键导出系统',
  openGraph: {
    title: '古城镇大赵社区换届选举选民名单识别与公告生成系统',
    description: '基层换届选举选民名单智能OCR识别、档案比对核验与公文Word一键导出系统',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '古城镇大赵社区换届选举选民名单识别与公告生成系统',
    description: '基层换届选举选民名单智能OCR识别、档案比对核验与公文Word一键导出系统',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans selection:bg-red-100 selection:text-red-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
