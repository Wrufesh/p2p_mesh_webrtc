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
    const peers: WebRTCSDK[] = [];

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

      const socket = io(
        `http://localhost:3000/test?user=${store.state.userId}`,
        {
          transports: ["websocket"]
        }
      );

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

        peers.push(newWebRTC);
      });

      socket.on("new disconnection", (context: UserSocketInfo): void => {
        console.log("new disconnection", context);
        const deadPeer = peers.find((obj: WebRTCSDK) => {
          return obj.peerId.includes(context.socketId);
        });
        if (deadPeer) {
          peers.splice(peers.indexOf(deadPeer as WebRTCSDK), 1);
        }
      });

      socket.on("my id", (context: string): void => {
        console.log("my id is", context);
        userSocketId = context;
      });

      // Start WebRTC Signals
      socket.on("offer", (data: OfferSignal) => {
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

        peers.push(newWebRTC);
      });

      socket.on("answer", (data: AnswerSignal) => {
        const answeringPeer = peers.find((obj: WebRTCSDK) => {
          return obj.peerId === data.peerId;
        });

        if (answeringPeer) {
          answeringPeer.handleAnswer(data);
        }
      });

      socket.on("ice", (data: ICESignal) => {
        const ICETargetPeer = peers.find((obj: WebRTCSDK) => {
          return obj.peerId === data.peerId;
        });
        if (ICETargetPeer) {
          ICETargetPeer.handleNewIceCandidate(
            data.candidate as RTCIceCandidate
          );
        }
      });

      socket.on("hangup", (data: HangUpSignal) => {
        const toBeDestroyedPeer = peers.find((obj: WebRTCSDK) => {
          return obj.peerId === data.peerId;
        });
        if (toBeDestroyedPeer) {
          toBeDestroyedPeer.closeRTPConnection();
          peers.splice(peers.indexOf(toBeDestroyedPeer as WebRTCSDK), 1);
        }
      });
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
