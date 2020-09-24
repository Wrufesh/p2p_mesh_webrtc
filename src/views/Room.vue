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
          @click="methods.hangupCall()"
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
          @click="methods.toggleCamera()"
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
          <div class="device-setting">
            <div class="toolbar">
              <div class="toolbar-title">
                Device Settings
              </div>
              <div>
                <icon-base
                  class="close-icon"
                  :path="icons.uniTimesSquare"
                  @click="hideMenu"
                ></icon-base>
              </div>
            </div>
            <div class="list-title">Audio Input</div>
            <ul class="device-list">
              <li
                v-for="(audioInputDevice, index) in state.devices.audioinput"
                :key="`audio-in-dev-${index}`"
                @click="
                  methods
                    .changeStream({
                      ...state.mediaConstraints,
                      audio: {
                        deviceId: audioInputDevice.deviceId
                      }
                    })
                    .then(() => {
                      methods.replaceTrack('audio');
                      state.selectedDevices.audioinput =
                        audioInputDevice.deviceId;
                      hideMenu();
                    })
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
                  methods
                    .changeStream({
                      ...state.selectedDevices,
                      video: {
                        deviceId: videoInputDevice.deviceId
                      }
                    })
                    .then(() => {
                      methods.replaceTrack('video');
                      state.selectedDevices.videoinput =
                        videoInputDevice.deviceId;
                      hideMenu();
                    })
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
                  methods.changeAudioOutput(audioOutputDevice.deviceId),
                    hideMenu()
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

import { useRoute, useRouter } from "vue-router";

import IconBase from "../components/IconBase.vue";

import DropDown from "../components/DropDown.vue";

import {
  uniMicrophone,
  uniMicrophoneSlash,
  uniVideo,
  uniVideoSlash,
  uniCameraChange,
  uniMinusSquare,
  uniSlidersV,
  uniTimesSquare
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
      mediaConstraints: MediaStreamConstraints;
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
        audioinput: null,
        audiooutput: "default",
        videoinput: null
      },
      mediaConstraints: {
        audio: true,
        video: true
      }
    });

    // const audioContext = new AudioContext();

    const store = useStore();

    const route = useRoute();

    const router = useRouter();

    const icons = {
      uniMicrophone,
      uniMicrophoneSlash,
      uniVideo,
      uniVideoSlash,
      uniCameraChange,
      uniMinusSquare,
      uniSlidersV,
      uniTimesSquare
    };

    let localStream: MediaStream | null = null;

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
          if (devices[i].kind === "audiooutput") {
            sortedDevices[devices[i].kind].push({
              label: devices[i].label,
              deviceId: devices[i].deviceId
            });
          } else {
            // Avoid default device id

            if (devices[i].deviceId !== "default") {
              sortedDevices[devices[i].kind].push({
                label: devices[i].label,
                deviceId: devices[i].deviceId
              });
            }
          }
        }

        state.devices = sortedDevices;
      },

      getUserMedia: async (constraints: MediaStreamConstraints) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          return {
            stream,
            hasVideo: true,
            appliedContrains: constraints
          };
        } catch {
          try {
            console.log("Error: video device not found");
            const stream = await navigator.mediaDevices.getUserMedia({
              ...constraints,
              video: false
            } as MediaStreamConstraints);

            return {
              stream,
              hasVideo: false,
              appliedContrains: {
                ...constraints,
                video: false
              }
            };
          } catch {
            console.log("Error: media devices could not be found.");
          }
        }
      },

      replaceTrack: async (kind: string) => {
        state.peers.forEach(async peer => {
          const sender = peer.connection.getSenders().find(obj => {
            return obj.track ? obj.track.kind === kind : false;
          });
          if (sender) {
            if (kind === "audio") {
              sender.replaceTrack(
                (localStream as MediaStream).getAudioTracks()[0]
              );
            } else {
              sender.replaceTrack(
                (localStream as MediaStream).getVideoTracks()[0]
              );
            }
          }
        });
      },

      changeAudioOutput: async (deviceId: string) => {
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
        console.log("Unable to change device", deviceId);
        // }
      },

      changeStream: async (constraints: MediaStreamConstraints) => {
        const data = await methods.getUserMedia(constraints);

        if (!data) {
          console.log("Cannot get any stream");
          return;
        }

        localStream = data.stream;

        // Apply user mute settings to the new stream
        localStream.getTracks().forEach(track => {
          track.enabled = !state[
            `${track.kind}Muted` as keyof LocalState
          ] as boolean;
        });

        (document.getElementById(
          "local_video"
        ) as HTMLMediaElement).srcObject = localStream;

        state.mediaConstraints = data.appliedContrains;
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
      },

      toggleCamera: () => {
        methods.updateDevices();
        const videoInputDevices = state.devices.videoinput;
        if (videoInputDevices.length) {
          const selectedVideoDevice = videoInputDevices.find(o => {
            return o.deviceId === state.selectedDevices.videoinput;
          });

          if (!selectedVideoDevice) {
            console.log("Something is wrong. No selected video input device");
            return;
          }

          const indexOfSelectedVideoDevice = videoInputDevices.indexOf(
            selectedVideoDevice
          );

          const newVideoDeviceId =
            videoInputDevices[
              indexOfSelectedVideoDevice === videoInputDevices.length - 1
                ? 0
                : indexOfSelectedVideoDevice + 1
            ].deviceId;

          methods
            .changeStream({
              ...state.mediaConstraints,
              video: {
                deviceId: newVideoDeviceId
              }
            })
            .then(() => {
              methods.replaceTrack("video");
              state.selectedDevices.videoinput = newVideoDeviceId;
            });
        }
      },
      hangupCall: () => {
        state.peers.forEach(peer => peer.closeRTPConnection());
      }
    };

    // End Methods

    onMounted(async () => {
      methods.updateDevices();

      const data = await methods.getUserMedia({
        ...state.mediaConstraints,
        audio: state.devices.audioinput.length
          ? ({
              deviceId: state.devices.audioinput[0].deviceId
            } as MediaTrackConstraints)
          : true,
        video: state.devices.videoinput.length
          ? ({
              deviceId: state.devices.videoinput[0].deviceId
            } as MediaTrackConstraints)
          : true
      });

      // Two of the defaults set here. One already set
      state.selectedDevices.audioinput = state.devices.audioinput[0].deviceId;
      state.selectedDevices.videoinput = state.devices.videoinput[0].deviceId;

      if (!data) {
        console.log("Cannot get media on mounted");
        return;
      }

      localStream = data.stream;

      (document.getElementById(
        "local_video"
      ) as HTMLMediaElement).srcObject = localStream;

      const socket = io.connect(
        `https://p2psignal.duckdns.org/${route.params.room}?user=${store.state.userId}`,
        {
          transports: ["websocket"]
        }
      );

      methods.hangupCall = () => {
        state.peers.forEach(peer => peer.closeRTPConnection());
        socket.close();
        store.dispatch("clearUserAndRoom");
        router.push("/login");
      };

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
          deadPeer.closeRTPConnection();
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
  background-color: rgb(190, 190, 190);
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
  font-size: 1.1em;
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

.toolbar {
  border: 1px solid gray;
  padding: 4px 3px;
  display: flex;
  justify-content: space-between;
}

.toolbar-title {
  font-size: 1.5rem;
}

.device-setting {
  width: 75%;
  border: 1px solid gray;
  background-color: rgb(247, 244, 244);
}

.close-icon {
  height: 30px;
  width: 30px;
  color: red;
  cursor: pointer;
}
</style>
