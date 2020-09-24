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
    },
    CLEAR_USER_AND_ROOM(state) {
      state.userId = null;
      state.roomId = null;
    }
  },
  actions: {
    setUserAndRoom({ commit }, data) {
      commit("SET_USER_AND_ROOM", data);
    },
    clearUserAndRoom({ commit }) {
      commit("CLEAR_USER_AND_ROOM");
    }
  },
  modules: {}
});
