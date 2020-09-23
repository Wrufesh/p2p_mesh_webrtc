<template>
  <div>
    <div class="local-video-box">
      <div class="video-container">
        <video id="local_video" autoplay muted></video>
        <div class="video-overlay"></div>
      </div>
    </div>
    <div class="control-div">
      <button class="icon-button" style="background-color: red;">
        <icon-base
          class="video-control-icon"
          :path="icons.uniMinusSquare"
        ></icon-base>
      </button>

      <button
        v-if="!state.audioMuted"
        class="icon-button"
        style="background-color: blue;"
      >
        <icon-base
          class="video-control-icon"
          :path="icons.uniMicrophone"
        ></icon-base>
      </button>
      <button v-else class="icon-button" style="background-color: blue;">
        <icon-base
          class="video-control-icon"
          :path="icons.uniMicrophoneSlash"
        ></icon-base>
      </button>
      <button
        v-if="!state.videoMuted"
        class="icon-button"
        style="background-color: blue;"
      >
        <icon-base
          class="video-control-icon"
          :path="icons.uniVideo"
        ></icon-base>
      </button>
      <button v-else class="icon-button" style="background-color: blue;">
        <icon-base
          class="video-control-icon"
          :path="icons.uniVideoSlash"
        ></icon-base>
      </button>

      <button class="icon-button" style="background-color: blue;">
        <icon-base
          class="video-control-icon"
          :path="icons.uniCameraChange"
        ></icon-base>
      </button>

      <drop-down>
        <template v-slot:button="{ handleToggle, hideMenu }">
          <button
            class="devices-button"
            @click="handleToggle"
            @blur="hideMenu"
            style="background-color: green;"
          >
            Sources
          </button>
        </template>
        <template v-slot:content>
          <button>My Content</button>
        </template>
      </drop-down>
    </div>
    <div class="peers" v-if="state.peers.length">
      <div v-for="(peer, index) in state.peers" :key="`peer-${index}`">
        <video :id="peer.remoteStreamHtmlId" autoplay></video>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, onMounted } from "vue";
import { useStore } from "vuex";

import { useRoute } from "vue-router";

import IconBase from "../components/IconBase.vue";

import DropDown from "../components/DropDown.vue";

import {
  uniMicrophone,
  uniMicrophoneSlash,
  uniVideo,
  uniVideoSlash,
  uniCameraChange,
  uniMinusSquare
} from "../assets/icons";

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
  components: {
    IconBase,
    DropDown
  },
  setup() {
    interface LocalState {
      peers: WebRTCSDK[];
      audioMuted: boolean;
      videoMuted: boolean;
    }

    const state = reactive<LocalState>({
      peers: [],
      audioMuted: false,
      videoMuted: false
    });

    const store = useStore();

    const route = useRoute();

    let localStream: MediaStream | null = null;

    onMounted(async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
      } catch (err) {
        alert("Camera is being used by other application");
      }

      (document.getElementById(
        "local_video"
      ) as HTMLMediaElement).srcObject = localStream;

      const socket = io.connect(
        `https://p2psignal.duckdns.org/${route.params.room}?user=${store.state.userId}`,
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

        state.peers.push(newWebRTC);
      });

      socket.on("new disconnection", (context: UserSocketInfo): void => {
        console.log("new disconnection", context);
        const deadPeer = state.peers.find((obj: WebRTCSDK) => {
          return obj.peerId.includes(context.socketId);
        });
        if (deadPeer) {
          // TODO also call hangup or close connection
          // Think about signal disconnected and peer active
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
          // TODO also call hangup or close connection
          toBeDestroyedPeer.closeRTPConnection();
          state.peers.splice(
            state.peers.indexOf(toBeDestroyedPeer as WebRTCSDK),
            1
          );
        }
      });
      // End WebRTC Signals
    });

    const icons = {
      uniMicrophone,
      uniMicrophoneSlash,
      uniVideo,
      uniVideoSlash,
      uniCameraChange,
      uniMinusSquare
    };

    return { state, icons };
  }
});
</script>
<style>
/* #local_video {
  height: calc(48px * 3);
  width: calc(64px * 3);
} */

video {
  height: calc(48px * 3);
  width: calc(64px * 3);
}

.peers {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 15px;
  padding-top: 10px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  background-color: rgb(231, 223, 223);
}

.local-video-box,
.control-div {
  display: flex;
  justify-content: center;
  margin: 5px;
}

.video-container {
  position: relative;
  height: calc(48px * 3);
  width: calc(64px * 3);
}

.video-overlay {
  position: absolute;
  display: flex;
  flex-direction: column-reverse;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  buttom: 0;
  left: 0;
}

.video-control-buttons {
  display: flex;
  background-color: rgb(97, 88, 88);
  width: calc(64px * 6);
  margin: 5px;
  padding: 5px;
}

.video-control-icon {
  height: 20px;
  width: 20px;
  color: #fff;
}

.devices-button {
  font-size: 20px;
  color: #fff;
}

.icon-button {
  padding-left: 10px;
  padding-right: 10px;
}
</style>
