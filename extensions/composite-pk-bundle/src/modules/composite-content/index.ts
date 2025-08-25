import { defineModule } from '@directus/extensions-sdk';

export default defineModule({
  id: 'composite',
  name: 'Composite',
  icon: 'view_list',
  routes: [
    {
      path: '',
      component: () => import('./module.vue'),
    },
    {
      path: ':collection',
      component: () => import('./list.vue'),
    },
    {
      path: ':collection/edit',
      component: () => import('./edit.vue'),
    },
  ],
});
