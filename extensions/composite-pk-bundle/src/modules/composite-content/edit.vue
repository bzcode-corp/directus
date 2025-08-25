<template>
  <private-view>
    <template #header>{{ isEdit ? 'Edit' : 'Create' }} {{ collection }}</template>
    <form @submit.prevent="save">
      <div v-for="f in fields" :key="f.field">
        <v-input :label="f.field" v-model="item[f.field]" :disabled="isEdit && pkFields.includes(f.field)"></v-input>
      </div>
      <v-button type="submit">Save</v-button>
    </form>
  </private-view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@directus/extensions-sdk';
import { getPKFields } from './utils';

const api = useApi();
const route = useRoute();
const router = useRouter();

const collection = route.params.collection as string;
const keys = route.query as Record<string, any>;
const isEdit = Object.keys(keys).length > 0;

const fields = ref<any[]>([]);
const pkFields = ref<string[]>([]);
const item = ref<Record<string, any>>({});

onMounted(async () => {
  pkFields.value = await getPKFields(collection);
  const fieldRes = await api.get(`/fields/${collection}`);
  fields.value = fieldRes.data.data.filter((f: any) => !f.meta?.special?.includes('alias'));
  if (isEdit) {
    const res = await api.get(`/citems/${collection}/by-keys`, { params: { keys } });
    item.value = res.data.data;
  }
});

async function save() {
  if (isEdit) {
    await api.patch(`/citems/${collection}/by-keys`, item.value, { params: { keys } });
  } else {
    for (const f of pkFields.value) {
      if (item.value[f] === undefined || item.value[f] === null) return;
    }
    await api.post(`/citems/${collection}`, item.value);
  }
  router.back();
}
</script>
