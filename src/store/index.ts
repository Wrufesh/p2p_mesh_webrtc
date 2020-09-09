import { createStore } from "vuex";

export default createStore({
  state: {
    userId: null,
    roomId: null
  },
  mutations: {
    SET_USER_AND_ROOM(state, data) {
      state.userId = data.userId;
      state.roomId = data.roomId;
    }
  },
  actions: {
    setUserAndRoom({ commit }, data) {
      commit("SET_USER_AND_ROOM", data);
    }
  },
  modules: {}
});
