<template>
  <div>
    <div>
      <video id="local_video" autoplay muted></video>
    </div>
    <div>
      <button id="hangup-button" disabled>
        Hang Up
      </button>
    </div>
    <div class="peers">
      <div v-for="(peer, index) in peers" :key="`peer-${index}`">
        <video :id="peer.remoteStreamHtmlId" autoplay></video>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useStore } from "vuex";
import io from "socket.io-client";
import { WebRTCSDK } from "../webrtc_sdk/puresdk";

export default defineComponent({
  setup() {
    const peers: WebRTCSDK[] = [];

    const store = useStore();

    let localStream = null;

    onMounted(async () => {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      (document.getElementById(
        "local_video"
      ) as HTMLMediaElement).srcObject = localStream;

      const socket = io(
        `http://localhost:3000/test?user=${store.state.userId}`,
        {
          transports: ["websocket"]
        }
      );

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

      // Start WebRTC Signals
      socket.on("offer", () => 0);

      socket.on("answer", () => 0);

      socket.on("ice", () => 0);

      socket.on("hangup", () => 0);
      // End WebRTC Signals
    });

    return { peers };
  }
});
</script>
<style>
#local_video {
  height: calc(48px * 3);
  width: calc(64px * 3);
}
</style>
