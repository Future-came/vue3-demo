import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      redirect: '/home',
      component: () => import('../views/index.vue'),
      children: [
        {
          path: '/home',
          name: 'home',
          component: () => import('../views/Home.vue')
        },
        {
          path: '/pageA',
          name: 'pageA',
          component: () => import('../views/PageA.vue')
        },
        {
          path: '/welcome',
          name: 'welcome',
          component: () => import('../components/TheWelcome.vue')
        }
      ]
    }
  ]
})

// router.beforeEach((to, from, next) => {
//   // ...
//   next()
// })

router.onError((err, to, from) => {
  console.log(err, to, from)
})

export default router
