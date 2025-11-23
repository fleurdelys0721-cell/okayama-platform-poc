import { serverSupabaseClient } from '#supabase/server'

interface Opinion {
  id: string
  title: string
  content: string
  author_name?: string
  tags?: string[]
  ai_category?: string
  ai_tags?: string[]
  created_at: string
}

function generateSummary(opinions: Opinion[]) {
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

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  try {
    const { data: opinions, error } = await supabase
      .from('opinions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch opinions'
      })
    }

    const summary = generateSummary(opinions || [])

    return { summary }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})