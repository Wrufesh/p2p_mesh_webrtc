<template>
  <form @submit="login">
    <label>User Id => </label>
    <input v-model="userId" required />
    <button type="submit">Proceed</button>
  </form>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapActions } from "vuex";

export default defineComponent({
  name: "Home",
  data() {
    return {
      userId: ""
    };
  },
  methods: {
    ...mapActions(["setUser"]),
    login() {
      if (this.userId) {
        this.setUser(this.userId);
        this.$router.push("/room/test");
      }
    }
  }
});
</script>
