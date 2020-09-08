<template>
  <div></div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { useStore } from "vuex";
import io from "socket.io-client";

interface ComponentData {
  socket: SocketIOClientStatic | null;
}

// const userId = mapState(['userId'])

export default defineComponent({
  setup() {
    const store = useStore();
    const socket = io(`http://localhost:3000/test?user=${store.state.userId}`, {
      transports: ["websocket"]
    });

    let userSocketId = null;

    socket.on("new connection", (context: string): void => {
      console.log("new connection", context);
    });

    socket.on("new disconnection", (context: string): void => {
      console.log("new disconnection", context);
    });

    socket.on("my id", (context: string): void => {
      console.log("my id is", context);
      userSocketId = context;
    });
  }
});
</script>
