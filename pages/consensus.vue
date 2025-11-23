<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4">
      <h1 class="text-3xl font-bold mb-8">合意形成の状況</h1>
      
      <!-- 合意度の高い意見トップ5 -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 class="text-xl font-bold mb-4">最も合意が得られている意見</h2>
        <div class="space-y-4">
          <div
            v-for="opinion in topConsensusOpinions"
            :key="opinion.id"
            class="flex items-center justify-between p-4 bg-green-50 rounded-lg"
          >
            <div class="flex-1">
              <h3 class="font-bold">{{ opinion.title }}</h3>
              <p class="text-sm text-gray-600">{{ opinion.ai_category }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-green-600">
                {{ calculateConsensus(opinion.reaction_counts) }}%
              </p>
              <p class="text-xs text-gray-500">合意度</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 議論が活発な意見 -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-xl font-bold mb-4">議論が活発な意見</h2>
        <!-- コメント数の多い順に表示 -->
      </div>
    </div>
  </div>
</template>