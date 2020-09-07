<template>
  <div></div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import io from "socket.io-client";

export default defineComponent({
  data() {
    return {
      io: io("http://localhost:3000/test", { transports: ["websocket"] })
    };
  },
  mounted() {
    // this.socket.addEventListener("message", function(event) {
    //   console.log("Message from server ", event.data);
    // });
  },
  computed: {
    ...mapState({
      userId: "userId"
    })
  }
});
</script>
