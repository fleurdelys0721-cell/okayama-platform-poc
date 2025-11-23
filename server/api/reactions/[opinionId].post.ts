import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const opinionId = getRouterParam(event, 'opinionId')
  const { reactionType } = await readBody(event)
  
  // ユーザー識別（簡易版：IPアドレス）
  const headers = getHeaders(event)
  const userIdentifier = headers['x-forwarded-for'] || 'anonymous'
  
  const supabase = await serverSupabaseClient(event)
  
  try {
    // 既存の反応を削除（トグル動作）
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('opinion_id', opinionId)
      .eq('user_identifier', userIdentifier)
      .eq('reaction_type', reactionType)
      .single()
    
    if (existing) {
      // 既に反応済み → 削除
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)
      
      return { action: 'removed', reactionType }
    } else {
      // 新規反応を追加
      await supabase
        .from('reactions')
        .insert({
          opinion_id: opinionId,
          reaction_type: reactionType,
          user_identifier: userIdentifier
        })
      
      return { action: 'added', reactionType }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})