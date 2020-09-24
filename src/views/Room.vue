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
        @click="methods.toggleMute('audio')"
      >
        <icon-base
          class="video-control-icon"
          :path="icons.uniMicrophone"
        ></icon-base>
      </button>
      <button
        v-else
        class="icon-button"
        style="background-color: blue;"
        @click="methods.toggleMute('audio')"
      >
        <icon-base
          class="video-control-icon"
          :path="icons.uniMicrophoneSlash"
        ></icon-base>
      </button>
      <button
        v-if="!state.videoMuted"
        class="icon-button"
        style="background-color: blue;"
        @click="methods.toggleMute('video')"
      >
        <icon-base
          class="video-control-icon"
          :path="icons.uniVideo"
        ></icon-base>
      </button>
      <button
        v-else
        class="icon-button"
        style="background-color: blue;"
        @click="methods.toggleMute('video')"
      >
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
        <template v-slot:button="{ handleToggle }">
          <button
            class="icon-button"
            style="background-color: green;"
            @click="handleToggle(), methods.updateDevices()"
          >
            <icon-base
              class="video-control-icon"
              :path="icons.uniSlidersV"
            ></icon-base>
          </button>
        </template>
        <template v-slot:content="{ hideMenu }">
          <div @blur="hideMenu">
            <div class="setting-menu-title">Device Settings</div>
            <div class="list-title">Audio Input</div>
            <ul class="device-list">
              <li
                v-for="(audioInputDevice, index) in state.devices.audioinput"
                :key="`audio-in-dev-${index}`"
                @click="
                  methods.setDevice(audioInputDevice.deviceId, 'audioinput')
                "
                :class="{
                  'selected-device':
                    audioInputDevice.deviceId ===
                    state.selectedDevices['audioinput']
                }"
              >
                {{ audioInputDevice.label }}
              </li>
            </ul>
            <div class="list-title">Video Input</div>
            <ul class="device-list">
              <li
                v-for="(videoInputDevice, index) in state.devices.videoinput"
                :key="`video-in-dev-${index}`"
                @click="
                  methods.setDevice(videoInputDevice.deviceId, 'videoinput')
                "
                :class="{
                  'selected-device':
                    videoInputDevice.deviceId ===
                    state.selectedDevices['videoinput']
                }"
              >
                {{ videoInputDevice.label }}
              </li>
            </ul>
            <div class="list-title">Audio Output</div>
            <ul class="device-list">
              <li
                v-for="(audioOutputDevice, index) in state.devices.audiooutput"
                :key="`audio-out-dev-${index}`"
                @click="
                  methods.setDevice(audioOutputDevice.deviceId, 'audiooutput')
                "
                :class="{
                  'selected-device':
                    audioOutputDevice.deviceId ===
                    state.selectedDevices['audiooutput']
                }"
              >
                {{ audioOutputDevice.label }}
              </li>
            </ul>
          </div>
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
  uniMinusSquare,
  uniSlidersV
} from "../assets/icons";

import io from "socket.io-client";
import {
  WebRTCSDK,
  OfferSignal,
  AnswerSignal,
  ICESignal,
  HangUpSignal,
  IODeviceCollection,
  SelectedIODevice
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
      devices: IODeviceCollection;
      selectedDevices: SelectedIODevice;
    }

    const state = reactive<LocalState>({
      peers: [],
      audioMuted: false,
      videoMuted: false,
      devices: {
        audioinput: [],
        audiooutput: [],
        videoinput: []
      },
      selectedDevices: {
        audioinput: "default",
        audiooutput: "default",
        videoinput: "default"
      }
    });

    // const audioContext = new AudioContext();

    const store = useStore();

    const route = useRoute();

    const icons = {
      uniMicrophone,
      uniMicrophoneSlash,
      uniVideo,
      uniVideoSlash,
      uniCameraChange,
      uniMinusSquare,
      uniSlidersV
    };

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

    // START Methods

    const methods = {
      updateDevices: async function() {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const sortedDevices: IODeviceCollection = {
          audioinput: [],
          audiooutput: [],
          videoinput: []
        };

        for (let i = 0; i < devices.length; i++) {
          sortedDevices[devices[i].kind].push({
            label: devices[i].label,
            deviceId: devices[i].deviceId
          });
        }

        state.devices = sortedDevices;
      },

      getDeviceIdStream: async (
        audioDeviceId: string | boolean,
        videoDeviceId: string | boolean
      ) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioDeviceId
              ? ({ deviceId: audioDeviceId } as MediaTrackConstraints)
              : true,
            video: videoDeviceId
              ? ({ deviceId: videoDeviceId } as MediaTrackConstraints)
              : true
          });

          return {
            stream,
            hasVideo: true
          };
        } catch {
          try {
            console.log("Error: video device not found");
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: audioDeviceId
                ? ({ deviceId: audioDeviceId } as MediaTrackConstraints)
                : true,
              video: false
            });

            return {
              stream,
              hasVideo: false
            };
          } catch {
            console.log("Error: media devices could not be found.");
          }
        }
      },

      setDevice: async (deviceId: string, kind: string) => {
        if (kind === "audiooutput") {
          // try {
          //   state.peers.forEach(peer => {
          //     const remoteVideoElement = document.getElementById(
          //       peer.remoteStreamHtmlId
          //     );
          //     (remoteVideoElement as HTMLAudioElement).setSinkId(deviceId);
          //   });

          //   state.selectedDevices.audiooutput = deviceId;
          // } catch (err) {
          //   console.log("Cannot sink audio output", err);
          alert("Unable to change device");
          // }
        } else {
          const data = await methods.getDeviceIdStream(
            kind === "audioinput" ? deviceId : false,
            kind === "videoinput" ? deviceId : false
          );

          if (!data) {
            alert("Unable to change device");
            return;
          }

          // if (!data.hasVideo) {
          //   (document.getElementById(
          //     "local_video"
          //   ) as HTMLMediaElement).poster = noVideo;
          // }

          localStream = data.stream;

          if (kind === "videoinput") {
            state.peers.forEach(async peer => {
              const sender = peer.connection.getSenders().find(obj => {
                return obj.track ? obj.track.kind === "video" : false;
              });
              if (sender) {
                sender.replaceTrack(data.stream.getVideoTracks()[0]);
              }
            });

            state.selectedDevices.videoinput = deviceId;
          } else if (kind === "audioinput") {
            state.peers.forEach(async peer => {
              const sender = peer.connection.getSenders().find(obj => {
                return obj.track ? obj.track.kind === "audio" : false;
              });
              if (sender) {
                sender.replaceTrack(data.stream.getAudioTracks()[0]);
              }
            });

            state.selectedDevices.audioinput = deviceId;
          }
        }
      },

      toggleMute: (type: string) => {
        if (type == "audio") {
          state.audioMuted = !state[`${type}Muted` as keyof LocalState];
        } else {
          state.videoMuted = !state[`${type}Muted` as keyof LocalState];
        }

        if (localStream) {
          localStream.getTracks().forEach(track => {
            if (track.kind === type) {
              track.enabled = !state[
                `${type}Muted` as keyof LocalState
              ] as boolean;
            }
          });
        }
      }
    };

    // End Methods

    return { state, icons, methods };
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

.list-title {
  font-size: 1.25em;
  padding: 4px 3px;
  background-color: rgb(26, 114, 70);
  color: #fff;
}

.selected-device {
  background-color: rgb(194, 185, 185);
}

.device-list {
  list-style-type: none;
  padding: 3px;
  margin: 5px 0px;
}

.device-list > li {
  padding: 4px 3px;
  cursor: pointer;
}

.device-list > li:hover {
  background-color: rgb(214, 210, 210);
}

.setting-menu-title {
  border: 1px solid gray;
  padding: 4px 3px;
  font-size: 1.5rem;
}
</style>
