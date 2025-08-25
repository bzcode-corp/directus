<template>
  <private-view>
    <template #header>Composite Collections</template>
    <ul v-if="collections.length">
      <li v-for="c in collections" :key="c.collection">
        <router-link :to="`/${c.collection}`">{{ c.collection }}</router-link>
      </li>
    </ul>
    <div v-else>Нет доступных коллекций</div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const collections = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await api.get('/citems/_introspect');
    collections.value = res.data.data;
  } catch (e) {
    collections.value = [];
  }
});
</script>
