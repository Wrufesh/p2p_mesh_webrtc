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
      <div v-for="(peer, index) in state.peers" :key="`peer-${index}`">
        <video :id="peer.remoteStreamHtmlId" autoplay></video>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, onMounted } from "vue";
import { useStore } from "vuex";
import io from "socket.io-client";
import {
  WebRTCSDK,
  OfferSignal,
  AnswerSignal,
  ICESignal,
  HangUpSignal
} from "../webrtc_sdk/puresdk";

interface UserSocketInfo {
  userId: string;
  socketId: string;
}

export default defineComponent({
  setup() {
    interface LocalState {
      peers: WebRTCSDK[];
    }

    const state = reactive<LocalState>({
      peers: []
    });

    const store = useStore();

    let localStream: MediaStream | null = null;

    onMounted(async () => {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      (document.getElementById(
        "local_video"
      ) as HTMLMediaElement).srcObject = localStream;

      const socket = io.connect(
        `http://p2psignal.duckdns.org/test?user=${store.state.userId}`,
        {
          transports: ["websocket"]
        }
      );

      // const socket = io(
      //   `http://192.168.1.129:3000/test?user=${store.state.userId}`,
      //   {
      //     transports: ["websocket"]
      //   }
      // );

      let userSocketId: string | null = null;

      socket.on("new connection", (context: UserSocketInfo): void => {
        console.log("new connection", context);
        const newWebRTC = new WebRTCSDK(
          store.state.userId,
          context.userId,
          userSocketId as string,
          context.socketId,
          localStream as MediaStream,
          socket
        );

        newWebRTC.startCall({
          audio: true,
          video: true
        });

        state.peers.push(newWebRTC);
      });

      socket.on("new disconnection", (context: UserSocketInfo): void => {
        console.log("new disconnection", context);
        const deadPeer = state.peers.find((obj: WebRTCSDK) => {
          return obj.peerId.includes(context.socketId);
        });
        if (deadPeer) {
          state.peers.splice(state.peers.indexOf(deadPeer as WebRTCSDK), 1);
        }
      });

      socket.on("my id", (context: UserSocketInfo): void => {
        console.log("my id is", context);
        userSocketId = context.socketId;
      });

      // Start WebRTC Signals
      socket.on("offer", (data: OfferSignal) => {
        console.log("offer", data);
        const newWebRTC = new WebRTCSDK(
          data.callerUserId,
          data.calleeUserId,
          data.callerSocketId,
          data.calleeSocketId,
          localStream as MediaStream,
          socket
        );

        newWebRTC.handleOffer(data, {
          audio: true,
          video: true
        });

        state.peers.push(newWebRTC);
      });

      socket.on("answer", (data: AnswerSignal) => {
        console.log("answer", data);
        const answeringPeer = state.peers.find((obj: WebRTCSDK) => {
          return obj.peerId === data.peerId;
        });

        if (answeringPeer) {
          answeringPeer.handleAnswer(data);
        }
      });

      socket.on("ice", (data: ICESignal) => {
        console.log("ice", data);
        const ICETargetPeer = state.peers.find((obj: WebRTCSDK) => {
          return obj.peerId === data.peerId;
        });
        if (ICETargetPeer) {
          ICETargetPeer.handleNewIceCandidate(
            data.candidate as RTCIceCandidate
          );
        }
      });

      socket.on("hangup", (data: HangUpSignal) => {
        console.log("hangup", data);
        const toBeDestroyedPeer = state.peers.find((obj: WebRTCSDK) => {
          return obj.peerId === data.peerId;
        });
        if (toBeDestroyedPeer) {
          toBeDestroyedPeer.closeRTPConnection();
          state.peers.splice(
            state.peers.indexOf(toBeDestroyedPeer as WebRTCSDK),
            1
          );
        }
      });
      // End WebRTC Signals
    });

    return { state };
  }
});
</script>
<style>
#local_video {
  height: calc(48px * 3);
  width: calc(64px * 3);
}

.peers > div > video {
  height: calc(48px * 3);
  width: calc(64px * 3);
}
</style>
