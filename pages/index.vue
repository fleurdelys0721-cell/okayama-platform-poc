<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const supabase = useSupabaseClient()

interface Opinion {
  id: string
  title: string
  content: string
  author_name?: string
  tags?: string[]
  ai_category?: string
  ai_tags?: string[]
  created_at: string
  reaction_counts?: {
    agree: number
    disagree: number
    important: number
  }
}

interface Comment {
  id: string
  opinion_id: string
  content: string
  author_name?: string
  created_at: string
}

const categories = [
  { name: '交通・インフラ', color: '#3B82F6' },
  { name: '教育・子育て', color: '#10B981' },
  { name: '医療・福祉', color: '#EF4444' },
  { name: '経済・雇用', color: '#F59E0B' },
  { name: '環境・エネルギー', color: '#22C55E' },
  { name: '文化・観光', color: '#8B5CF6' },
  { name: '防災・安全', color: '#DC2626' },
  { name: 'その他', color: '#6B7280' }
]

// State
const opinions = ref<Opinion[]>([])
const showForm = ref(false)
const selectedCategory = ref('全て')
const sortBy = ref('newest')
const searchTerm = ref('')
const summary = ref('')
const loading = ref(false)

// 合意形成機能用
const selectedOpinion = ref<Opinion | null>(null)
const showComments = ref(false)
const comments = ref<Comment[]>([])
const newComment = ref('')

const formData = ref({
  title: '',
  content: '',
  author_name: '',
  tags: ''
})

// Computed
const filteredOpinions = computed(() => {
  let filtered = [...opinions.value]

  if (selectedCategory.value !== '全て') {
    filtered = filtered.filter(op => op.ai_category === selectedCategory.value)
  }

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(op =>
      op.title.toLowerCase().includes(term) ||
      op.content.toLowerCase().includes(term)
    )
  }

  // ソート
  if (sortBy.value === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (sortBy.value === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  } else if (sortBy.value === 'consensus') {
    filtered.sort((a, b) => calculateConsensus(b.reaction_counts) - calculateConsensus(a.reaction_counts))
  }

  return filtered
})

const categoryStats = computed(() => {
  const stats: Record<string, number> = {}
  categories.forEach(cat => {
    stats[cat.name] = opinions.value.filter(op => op.ai_category === cat.name).length
  })
  return stats
})

// Methods
const loadOpinions = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('opinions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (data) opinions.value = data
  } catch (error: any) {
    console.error('Error loading opinions:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formData.value.title.trim() || !formData.value.content.trim()) {
    alert('タイトルと内容を入力してください')
    return
  }

  loading.value = true

  try {
    const { data, error } = await supabase
      .from('opinions')
      .insert([{
        title: formData.value.title,
        content: formData.value.content,
        author_name: formData.value.author_name || null,
        tags: formData.value.tags 
          ? formData.value.tags.split(',').map(t => t.trim()) 
          : []
      }])
      .select()
      .single()

    if (error) throw error

    if (data) {
      const result = await $fetch('/api/classify', {
        method: 'POST',
        body: { opinionId: data.id }
      })

      if (result) {
        alert(`✅ 投稿完了！\n分類: ${result.category}\nタグ: ${result.tags.join(', ')}`)
      }

      await loadOpinions()
    }

    formData.value = { title: '', content: '', author_name: '', tags: '' }
    showForm.value = false
  } catch (error: any) {
    console.error('Error submitting opinion:', error)
    alert('投稿に失敗しました: ' + error.message)
  } finally {
    loading.value = false
  }
}

const generateSummary = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/summarize')
    if (data?.summary) {
      summary.value = data.summary
    }
  } catch (error) {
    console.error('Error generating summary:', error)
    alert('要約の生成に失敗しました')
  } finally {
    loading.value = false
  }
}

// 合意形成機能
const handleReaction = async (opinionId: string, reactionType: string) => {
  try {
    await $fetch(`/api/reactions/${opinionId}`, {
      method: 'POST',
      body: { reactionType }
    })
    
    await loadOpinions()
  } catch (error) {
    console.error('Reaction error:', error)
    alert('反応の送信に失敗しました')
  }
}

const openComments = async (opinion: Opinion) => {
  selectedOpinion.value = opinion
  showComments.value = true
  await loadComments(opinion.id)
}

const loadComments = async (opinionId: string) => {
  try {
    const data = await $fetch(`/api/comments/${opinionId}`)
    comments.value = data || []
  } catch (error) {
    console.error('Error loading comments:', error)
  }
}

const submitComment = async () => {
  if (!newComment.value.trim() || !selectedOpinion.value) return
  
  try {
    await $fetch(`/api/comments/${selectedOpinion.value.id}`, {
      method: 'POST',
      body: {
        content: newComment.value,
        authorName: formData.value.author_name
      }
    })
    
    newComment.value = ''
    await loadComments(selectedOpinion.value.id)
  } catch (error) {
    console.error('Comment error:', error)
    alert('コメントの投稿に失敗しました')
  }
}

const closeComments = () => {
  showComments.value = false
  selectedOpinion.value = null
  comments.value = []
  newComment.value = ''
}

// Helper functions
const calculateConsensus = (counts: any) => {
  if (!counts) return 0
  const total = (counts.agree || 0) + (counts.disagree || 0)
  if (total === 0) return 0
  return Math.round(((counts.agree || 0) / total) * 100)
}

const getAgreePercentage = (counts: any) => {
  if (!counts) return 0
  const total = (counts.agree || 0) + (counts.disagree || 0)
  if (total === 0) return 0
  return ((counts.agree || 0) / total) * 100
}

const getDisagreePercentage = (counts: any) => {
  if (!counts) return 0
  const total = (counts.agree || 0) + (counts.disagree || 0)
  if (total === 0) return 0
  return ((counts.disagree || 0) / total) * 100
}

// Lifecycle
onMounted(() => {
  loadOpinions()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm border-b-2 border-blue-500">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
              岡山県民の声プラットフォーム
            </h1>
            <p class="text-xs md:text-sm text-gray-600 mt-1">
              地域課題をみんなで考える デジタル合意形成システム
            </p>
          </div>
          <button
            @click="showForm = !showForm"
            class="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            ➕ 意見を投稿
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- 統計ダッシュボード -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">総意見数</p>
              <p class="text-3xl font-bold text-gray-900">{{ opinions.length }}</p>
            </div>
            <span class="text-4xl">📈</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">カテゴリ数</p>
              <p class="text-3xl font-bold text-gray-900">{{ categories.length }}</p>
            </div>
            <span class="text-4xl">📊</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">自動分類済み</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ opinions.filter(op => op.ai_category).length }}
              </p>
            </div>
            <span class="text-4xl">✨</span>
          </div>
        </div>
      </div>

      <!-- カテゴリ別可視化 -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">🥧</span>
          カテゴリ別意見分布
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="cat in categories"
            :key="cat.name"
            class="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            @click="selectedCategory = cat.name"
          >
            <div
              class="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
              :style="{ backgroundColor: cat.color }"
            >
              {{ categoryStats[cat.name] || 0 }}
            </div>
            <p class="text-sm text-gray-700 font-medium">{{ cat.name }}</p>
          </div>
        </div>
      </div>

      <!-- AI要約セクション -->
      <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-md p-6 mb-8 border-2 border-purple-200">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span class="text-2xl">✨</span>
            論点自動要約
          </h2>
          <button
            @click="generateSummary"
            :disabled="loading"
            class="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            🔄 {{ loading ? '生成中...' : '要約を生成' }}
          </button>
        </div>
        <div v-if="summary" class="bg-white rounded-lg p-4 whitespace-pre-line text-sm text-gray-700">
          {{ summary }}
        </div>
      </div>

      <!-- 投稿フォーム -->
      <div v-if="showForm" class="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-300">
        <h2 class="text-xl font-bold text-gray-900 mb-4">新しい意見を投稿</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例：岡山駅前の駐輪場を増やしてほしい"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
            <textarea
              v-model="formData.content"
              rows="5"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="具体的な課題や提案を記入してください"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">お名前（任意）</label>
              <input
                v-model="formData.author_name"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="匿名でも投稿可能"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タグ（カンマ区切り）</label>
              <input
                v-model="formData.tags"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例：駐輪場, 岡山駅"
              />
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="handleSubmit"
              :disabled="loading"
              class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              投稿する（自動分類されます）
            </button>
            <button
              @click="showForm = false"
              class="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>

      <!-- フィルタ・検索バー -->
      <div class="bg-white rounded-xl shadow-md p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1 relative">
            <span class="absolute left-3 top-3 text-gray-400">🔍</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="意見を検索..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            v-model="selectedCategory"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="全て">全カテゴリ</option>
            <option v-for="cat in categories" :key="cat.name" :value="cat.name">
              {{ cat.name }}
            </option>
          </select>

          <select
            v-model="sortBy"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">新着順</option>
            <option value="oldest">古い順</option>
            <option value="consensus">合意度順</option>
          </select>
        </div>
      </div>

      <!-- 意見一覧 -->
      <div class="space-y-4">
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          意見一覧 ({{ filteredOpinions.length }}件)
        </h2>

        <div
          v-for="opinion in filteredOpinions"
          :key="opinion.id"
          class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
        >
          <div class="flex items-start justify-between mb-3 gap-3">
            <h3 class="text-lg font-bold text-gray-900 flex-1">{{ opinion.title }}</h3>
            <span
              class="px-3 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
              :style="{ backgroundColor: categories.find(c => c.name === opinion.ai_category)?.color || '#6B7280' }"
            >
              {{ opinion.ai_category || 'その他' }}
            </span>
          </div>

          <p class="text-gray-700 mb-4">{{ opinion.content }}</p>

          <!-- 反応ボタン -->
          <div class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 flex-wrap">
            <button
              @click="handleReaction(opinion.id, 'agree')"
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 transition text-sm"
              :class="{ 'bg-green-200': (opinion.reaction_counts?.agree || 0) > 0 }"
            >
              👍 賛成
              <span class="font-bold text-green-700">
                {{ opinion.reaction_counts?.agree || 0 }}
              </span>
            </button>

            <button
              @click="handleReaction(opinion.id, 'disagree')"
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 transition text-sm"
              :class="{ 'bg-red-200': (opinion.reaction_counts?.disagree || 0) > 0 }"
            >
              👎 反対
              <span class="font-bold text-red-700">
                {{ opinion.reaction_counts?.disagree || 0 }}
              </span>
            </button>

            <button
              @click="handleReaction(opinion.id, 'important')"
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition text-sm"
              :class="{ 'bg-yellow-200': (opinion.reaction_counts?.important || 0) > 0 }"
            >
              💡 重要
              <span class="font-bold text-yellow-700">
                {{ opinion.reaction_counts?.important || 0 }}
              </span>
            </button>

            <button
              @click="openComments(opinion)"
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-sm"
            >
              💬 議論する
            </button>
          </div>

          <!-- 合意度バー -->
          <div class="mb-3" v-if="(opinion.reaction_counts?.agree || 0) + (opinion.reaction_counts?.disagree || 0) > 0">
            <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>合意度</span>
              <span class="font-bold">
                {{ calculateConsensus(opinion.reaction_counts) }}%
              </span>
            </div>
            <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
              <div
                class="bg-green-500 transition-all duration-300"
                :style="{ width: `${getAgreePercentage(opinion.reaction_counts)}%` }"
              ></div>
              <div
                class="bg-red-500 transition-all duration-300"
                :style="{ width: `${getDisagreePercentage(opinion.reaction_counts)}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>賛成 {{ opinion.reaction_counts?.agree || 0 }}</span>
              <span>反対 {{ opinion.reaction_counts?.disagree || 0 }}</span>
            </div>
          </div>

          <!-- メタ情報 -->
          <div class="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            <div class="flex items-center gap-1">
              📅 {{ new Date(opinion.created_at).toLocaleDateString('ja-JP') }}
            </div>

            <span v-if="opinion.author_name" class="font-medium">
              投稿者: {{ opinion.author_name }}
            </span>

            <div v-if="opinion.ai_tags && opinion.ai_tags.length > 0" class="flex items-center gap-2 flex-wrap">
              🏷️
              <span
                v-for="(tag, i) in opinion.ai_tags"
                :key="i"
                class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="filteredOpinions.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg">{{ opinions.length === 0 ? 'まだ意見が投稿されていません' : '該当する意見が見つかりません' }}</p>
          <button
            v-if="opinions.length === 0"
            @click="showForm = true"
            class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            最初の意見を投稿する
          </button>
        </div>
      </div>
    </div>

    <!-- コメントモーダル -->
    <div
      v-if="showComments && selectedOpinion"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeComments"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <!-- モーダルヘッダー -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 mb-2">{{ selectedOpinion.title }}</h3>
              <p class="text-sm text-gray-600">{{ selectedOpinion.content }}</p>
            </div>
            <button
              @click="closeComments"
              class="text-gray-400 hover:text-gray-600 text-2xl ml-4"
            >
              ×
            </button>
          </div>
        </div>

        <!-- コメント一覧 -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div v-if="comments.length === 0" class="text-center text-gray-500 py-8">
            <p>まだコメントがありません</p>
            <p class="text-sm mt-2">最初のコメントを投稿しましょう！</p>
          </div>

          <div
            v-for="comment in comments"
            :key="comment.id"
            class="bg-gray-50 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-900">
                {{ comment.author_name || '匿名' }}
              </span>
              <span class="text-xs text-gray-500">
                {{ new Date(comment.created_at).toLocaleDateString('ja-JP') }}
              </span>
            </div>
            <p class="text-gray-700">{{ comment.content }}</p>
          </div>
        </div>

        <!-- コメント入力 -->
        <div class="p-6 border-t border-gray-200">
          <textarea
            v-model="newComment"
            rows="3"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="コメントを入力..."
          />
          <div class="flex justify-end mt-3">
            <button
              @click="submitComment"
              :disabled="!newComment.trim()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              コメントを投稿
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- フッター -->
    <footer class="bg-gray-900 text-white mt-16 py-8">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <p class="text-sm">© 2025 岡山県デジタル合意形成プラットフォーム PoC</p>
      </div>
    </footer>
  </div>
</template>
