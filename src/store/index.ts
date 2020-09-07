import { createStore } from "vuex";

export default createStore({
  state: {
    userId: null
  },
  mutations: {
    SET_USER(state, userId) {
      state.userId = userId;
    }
  },
  actions: {
    setUser({ commit }, userId) {
      commit("SET_USER", userId);
    }
  },
  modules: {}
});
