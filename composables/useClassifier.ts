import { useCategories } from "./useCategories"

export const useClassifier = () => {
  const { categories } = useCategories()

  const classifyOpinion = (title: string, content: string) => {
    const text = `${title} ${content}`.toLowerCase()
    const scores: Record<string, number> = {}
    const matchedKeywords: string[] = []

    categories.forEach(cat => {
      scores[cat.name] = 0
      cat.keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          scores[cat.name] += 1
          matchedKeywords.push(keyword)
        }
      })
    })

    let maxScore = 0
    let selectedCategory = 'その他'

    Object.entries(scores).forEach(([name, score]) => {
      if (score > maxScore) {
        maxScore = score
        selectedCategory = name
      }
    })

    const tags = [...new Set(matchedKeywords)].slice(0, 3)

    return {
      category: selectedCategory,
      tags: tags.length > 0 ? tags : ['一般提案']
    }
  }

  const generateSummary = (opinions: Opinion[]) => {
    const categoryGroups: Record<string, Opinion[]> = {}

    opinions.forEach(op => {
      const cat = op.ai_category || 'その他'
      if (!categoryGroups[cat]) categoryGroups[cat] = []
      categoryGroups[cat].push(op)
    })

    let summary = '【最新意見の論点要約】\n\n'

    Object.entries(categoryGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([category, ops]) => {
        if (ops.length > 0) {
          summary += `■ ${category}（${ops.length}件）\n`
          ops.slice(0, 3).forEach((op, i) => {
            summary += `  ${i + 1}. ${op.title}\n`
          })
          summary += '\n'
        }
      })

    const topCategory = Object.entries(categoryGroups)
      .sort((a, b) => b[1].length - a[1].length)[0]

    summary += '【分析結果】\n'
    summary += `合計${opinions.length}件の市民意見が寄せられています。\n`
    if (topCategory) {
      summary += `最も多いカテゴリは「${topCategory[0]}」(${topCategory[1].length}件)で、`
      summary += `地域の関心が高いテーマであることがわかります。`
    }

    return summary
  }

  return {
    classifyOpinion,
    generateSummary
  }
}