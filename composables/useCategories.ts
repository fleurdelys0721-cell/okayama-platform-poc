import type { Category } from "~/types"

export const useCategories = () => {
  const categories: Category[] = [
    { 
      name: '交通・インフラ', 
      color: '#3B82F6',
      keywords: ['駐輪', '道路', '電車', 'バス', '駅', '渋滞', '信号']
    },
    { 
      name: '教育・子育て', 
      color: '#10B981',
      keywords: ['保育園', '学校', '子ども', '教育', '待機児童', '給食']
    },
    { 
      name: '医療・福祉', 
      color: '#EF4444',
      keywords: ['病院', '医療', '高齢者', '介護', '福祉', '健康']
    },
    { 
      name: '経済・雇用', 
      color: '#F59E0B',
      keywords: ['仕事', '雇用', '企業', '商店街', '産業', '就職']
    },
    { 
      name: '環境・エネルギー', 
      color: '#22C55E',
      keywords: ['ごみ', '環境', '自然', '公園', 'リサイクル', '再エネ']
    },
    { 
      name: '文化・観光', 
      color: '#8B5CF6',
      keywords: ['観光', '後楽園', '文化', 'イベント', '祭り', '歴史']
    },
    { 
      name: '防災・安全', 
      color: '#DC2626',
      keywords: ['防災', '災害', '地震', '避難', '消防', '治安']
    },
    { 
      name: 'その他', 
      color: '#6B7280',
      keywords: []
    }
  ]

  return { categories }
}