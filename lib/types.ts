export interface VoterRecord {
  id: string;
  name: string;
  gender: '男' | '女';
  age: number;
  birthDate: string; // e.g. 1978-05-12
  idCardMasked: string; // e.g. 34122119780512****
  group: string; // e.g. '第一大赵社区居民小组'
  status: '正常' | '未满18周岁' | '超龄特殊' | '户口迁出';
  isEligible: boolean; // age >= 18 && age <= 99
  address?: string;
  remarks?: string;
}

export type MatchStatus = 'matched' | 'unmatched' | 'age_ineligible' | 'manual_added' | 'duplicate';

export interface RecognizedVoter {
  id: string;
  name: string;
  originalRaw: string;
  matchStatus: MatchStatus;
  matchedRecord?: VoterRecord;
  suggestedMatches?: {
    record: VoterRecord;
    score: number;
    reason: string;
  }[];
  assignedGroup: string;
  isEdited?: boolean;
  notes?: string;
}

export interface ResidentGroup {
  id: string;
  name: string; // e.g. '第一大赵社区居民小组'
  description?: string;
  voterNames: string[];
}

export interface AnnouncementConfig {
  villageName: string; // 古城镇大赵社区居民委员会
  bulletinTitle: string; // 古城镇大赵社区居民委员会换届选举选民名单公告
  docNumber: string; // 大赵社区选字第4号
  legalBasis: string; // 根据《中华人民共和国村民委员会组织法》和《安徽省村民委员会选举办法》的规定，现将本村登记的选民名单公布如下：
  objectionNotice: string; // 如有遗漏，或对公布的选民名单有不同意见，可在名单公布之日起5日内（2026年11月3日前）向村民选举委员会提出。
  deadlineDate: string; // 2026年11月3日
  committeeName: string; // 大赵社区居民选举委员会
  publishDate: string; // 2026年10月28日
  separator: '、' | ' ' | '，';
}

export interface ApiSettings {
  baseUrl: string;
  apiKey: string;
  imageModel: string;
  textModel: string;
  provider: 'agnes' | 'gemini' | 'auto';
}
