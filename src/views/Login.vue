<template>
  <form @submit="login">
    <div>
      <div>
        <label><small>USER ID</small></label>
      </div>
      <input v-model="userId" required />
    </div>
    <br />
    <div>
      <div>
        <label><small>ROOM ID</small></label>
      </div>
      <input v-model="roomId" required />
    </div>
    <br />
    <div>
      <button type="submit">PROCEED</button>
    </div>
  </form>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapActions } from "vuex";

export default defineComponent({
  name: "Home",
  data() {
    return {
      userId: "",
      roomId: ""
    };
  },
  methods: {
    ...mapActions(["setUserAndRoom"]),
    login() {
      if (this.userId && this.roomId) {
        this.setUserAndRoom({ userId: this.userId, roomId: this.roomId });
        this.$router.push({
          name: "Room",
          params: {
            room: this.roomId
          }
        });
      }
    }
  }
});
</script>
