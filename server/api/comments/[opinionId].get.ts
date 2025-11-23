import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const opinionId = getRouterParam(event, 'opinionId')
  const supabase = await serverSupabaseClient(event)
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('opinion_id', opinionId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return data || []
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})