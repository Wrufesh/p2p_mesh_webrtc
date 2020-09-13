<template>
  <form @submit="login">
    <div>
      <div>
        <label><small>DISPLAY NAME</small></label>
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
    <div>
      <h3>Instruction</h3>
      <p>Think of any <b>ROOM ID</b>.</p>
      <p>
        Enter you <b>DISPLAY NAME</b> and the <b>ROOM ID</b> you thought of.
      </p>
      <p>Ask your friends to join with the same <b>ROOM ID</b>.</p>
      <p>You will be connected with your friends in full peer-to-peer room.</p>
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
        this.setUserAndRoom({
          userId: this.userId,
          roomId: this.roomId.replace(/\s/g, "")
        });
        this.$router.push({
          name: "Room",
          params: {
            room: this.roomId.replace(/\s/g, "")
          }
        });
      }
    }
  }
});
</script>
