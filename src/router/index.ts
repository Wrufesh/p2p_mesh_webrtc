import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import store from "../store";
import Login from "../views/Login.vue";
import Room from "../views/Room.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "Login",
    component: Login
  },
  {
    path: "/room/:room",
    name: "Room",
    component: Room
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  if (!store.state.userId && to.name !== "Login") {
    next("/login");
  } else {
    next();
  }
});

export default router;
