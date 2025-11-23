import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const opinionId = getRouterParam(event, 'opinionId')
  const { content, authorName } = await readBody(event)
  
  const headers = getHeaders(event)
  const userIdentifier = headers['x-forwarded-for'] || 'anonymous'
  
  const supabase = await serverSupabaseClient(event)
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        opinion_id: opinionId,
        content,
        author_name: authorName || null,
        user_identifier: userIdentifier
      })
      .select()
      .single()
    
    if (error) throw error
    
    return data
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})