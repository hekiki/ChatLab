import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/index.vue'),
    },
    {
      path: '/chat/:id',
      name: 'chat',
      component: () => import('@/pages/chat.vue'),
    },
    {
      path: '/tools',
      name: 'tools',
      component: () => import('@/pages/tools.vue'),
    },
  ],
  history: createWebHashHistory(),
})

router.beforeEach((to, from, next) => {
  next()
})

router.afterEach((to) => {
  document.body.id = `page-${to.name as string}`
})
