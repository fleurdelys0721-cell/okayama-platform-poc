import { serverSupabaseClient } from '#supabase/server'

const categories = [
  { name: '交通・インフラ', keywords: ['駐輪', '道路', '電車', 'バス', '駅', '渋滞', '信号', '交通'] },
  { name: '教育・子育て', keywords: ['保育園', '学校', '子ども', '子供', '教育', '待機児童', '給食', '育児'] },
  { name: '医療・福祉', keywords: ['病院', '医療', '高齢者', '介護', '福祉', '健康', 'クリニック'] },
  { name: '経済・雇用', keywords: ['仕事', '雇用', '企業', '商店街', '産業', '就職', '経済'] },
  { name: '環境・エネルギー', keywords: ['ごみ', '環境', '自然', '公園', 'リサイクル', '再エネ', 'ゴミ'] },
  { name: '文化・観光', keywords: ['観光', '後楽園', '文化', 'イベント', '祭り', '歴史', 'まつり'] },
  { name: '防災・安全', keywords: ['防災', '災害', '地震', '避難', '消防', '治安', '安全'] },
  { name: 'その他', keywords: [] }
]

function classifyOpinion(title: string, content: string) {
  const text = `${title} ${content}`.toLowerCase()
  const scores: Record<string, number> = {}
  const matchedKeywords: string[] = []

  categories.forEach(cat => {
    scores[cat.name] = 0
    cat.keywords.forEach(keyword => {
      if (text.includes(keyword)) {
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

export default defineEventHandler(async (event) => {
  const { opinionId } = await readBody(event)
  const supabase = await serverSupabaseClient(event)

  try {
    const { data: opinion, error: opinionError } = await supabase
      .from('opinions')
      .select('*')
      .eq('id', opinionId)
      .single()

    if (opinionError || !opinion) {
      throw createError({
        statusCode: 404,
        message: 'Opinion not found'
      })
    }

    const result = classifyOpinion(opinion.title, opinion.content)

    const { error: updateError } = await supabase
      .from('opinions')
      .update({
        ai_category: result.category,
        ai_tags: result.tags
      })
      .eq('id', opinionId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        message: 'Failed to update opinion'
      })
    }

    return {
      success: true,
      ...result
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})