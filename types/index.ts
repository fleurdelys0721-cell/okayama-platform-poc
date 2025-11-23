export interface Opinion {
  id: string
  title: string
  content: string
  author_name?: string
  tags?: string[]
  ai_category?: string
  ai_tags?: string[]
  created_at: string
}

export interface Category {
  name: string
  color: string
  keywords: string[]
}