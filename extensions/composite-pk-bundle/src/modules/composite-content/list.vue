<template>
  <private-view>
    <template #header>{{ collection }}</template>
    <v-button v-if="canCreate" @click="create">Create</v-button>
    <table>
      <thead>
        <tr>
          <th v-for="f in fields" :key="f.field">{{ f.field }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="JSON.stringify(buildKeyParams(pkFields, item))" @click="open(item)">
          <td v-for="f in fields" :key="f.field">{{ item[f.field] }}</td>
          <td>
            <v-button v-if="canDelete" @click.stop="remove(item)">Delete</v-button>
          </td>
        </tr>
      </tbody>
    </table>
  </private-view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi, useStores } from '@directus/extensions-sdk';
import { getPKFields, buildKeyParams } from './utils';

const api = useApi();
const route = useRoute();
const router = useRouter();
const { usePermissionsStore } = useStores();
const permissions = usePermissionsStore();

const collection = route.params.collection as string;
const items = ref<any[]>([]);
const fields = ref<any[]>([]);
const pkFields = ref<string[]>([]);

const canCreate = permissions.hasPermission(collection, 'create');
const canDelete = permissions.hasPermission(collection, 'delete');

async function load() {
  const res = await api.get(`/citems/${collection}`);
  items.value = res.data.data;
}

onMounted(async () => {
  pkFields.value = await getPKFields(collection);
  const fieldRes = await api.get(`/fields/${collection}`);
  fields.value = fieldRes.data.data.filter((f: any) => !f.meta?.special?.includes('alias'));
  await load();
});

function open(item: any) {
  const query: any = {};
  pkFields.value.forEach((f) => (query[f] = item[f]));
  router.push({ path: `/${collection}/edit`, query });
}

async function remove(item: any) {
  const params = buildKeyParams(pkFields.value, item);
  await api.delete(`/citems/${collection}/by-keys`, { params });
  load();
}

function create() {
  router.push({ path: `/${collection}/edit` });
}
</script>
