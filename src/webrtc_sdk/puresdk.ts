// With the help of
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
// This should work

import SocketIOClient from "socket.io-client";

const turnIP = "34.232.68.146:3478";
const RTCPeerConfig = {
  iceServers: [
    {
      urls: `stun:${turnIP}`
    },
    {
      urls: `turn:${turnIP}`,
      username: "meetu-turn",
      credential: "K1u$aritZ"
    }
  ]
};

export interface IODevice {
  deviceId: string;
  label: string
}
export interface IODeviceCollection {
  audioinput: IODevice[];
  audiooutput: IODevice[];
  videoinput: IODevice[];
}

export interface SelectedIODevice {
  audioinput: string;
  audiooutput: string;
  videoinput: string;
}

interface MediaConstraint {
  audio: boolean;
  video: boolean;
}

export interface OfferSignal {
  callerUserId: string;
  calleeUserId: string;
  callerSocketId: string;
  calleeSocketId: string;
  sdp: RTCSessionDescription | RTCSessionDescriptionInit;
}

export interface AnswerSignal {
  callerUserId: string;
  calleeUserId: string;
  peerId: string;
  sdp: RTCSessionDescription | RTCSessionDescriptionInit;
}

export interface ICESignal {
  peerId: string;
  candidate: RTCIceCandidate | null;
}

export interface HangUpSignal {
  peerId: string;
}

// enum UserInitActionType {
//   Publish,
//   Subscribe,
//   PubSub,
// }

// interface UserInitData {
//   userId: number;
//   roomId: string;
//   type: UserInitActionType;
// }

interface WebRTC {
  startCall(mediaConstraints: MediaConstraint): Promise<boolean>;

  hangUpCall(): void;

  // Signalling related methods
  sendSignal(
    type: string,
    signal: OfferSignal | AnswerSignal | ICESignal | HangUpSignal,
    target: string
  ): void;

  handleOffer(signal: OfferSignal, mediaConstraints: MediaConstraint): void;

  handleAnswer(signal: AnswerSignal): void;

  handleNewIceCandidate(candidate: RTCIceCandidate): void;

  // RTCPeerConnection event handlers
  onIceCandidate(event: RTCPeerConnectionIceEvent): void;
  onTrack(event: RTCTrackEvent): void;
  onNegotiationNeeded(): void;

  // onRemoveTrack(event: MediaStreamTrackEvent): void //depreciated

  onIceConnectionStateChange(): void;
  onIceGatheringStateChange(): void;
  onSignalingStateChange(): void;

  // Error handlers
  onMediaError(err: Error): void;

  // Cleaning methods
  closeRTPConnection(): void;
}

export class WebRTCSDK implements WebRTC {
  callerUserId: string;
  calleeUserId: string;
  callerSocketId: string;
  calleeSocketId: string;
  peerId: string;
  socket: SocketIOClient.Socket;
  connection: RTCPeerConnection;
  localStream: MediaStream;
  remoteStreamHtmlId: string;
  isCallerPeer: boolean | null;

  constructor(
    callerUserId: string,
    calleeUserId: string,
    callerSocketId: string,
    calleeSocketId: string,
    localStream: MediaStream,
    socket: SocketIOClient.Socket
  ) {
    this.isCallerPeer = null;
    this.callerUserId = callerUserId;
    this.calleeUserId = calleeUserId;
    this.callerSocketId = callerSocketId;
    this.calleeSocketId = calleeSocketId;

    this.localStream = localStream;

    this.socket = socket;

    this.peerId = `${this.callerSocketId}-${this.calleeSocketId}`;

    this.remoteStreamHtmlId = `peer-video-${this.peerId}`;

    this.connection = new RTCPeerConnection(RTCPeerConfig);

    this.connection.onicecandidate = this.onIceCandidate;
    this.connection.ontrack = this.onTrack;
    this.connection.onnegotiationneeded = this.onNegotiationNeeded;

    // this.connection.onremovetrack = this.onRemoveTrack; // depreciated

    this.connection.oniceconnectionstatechange = this.onIceConnectionStateChange;
    this.connection.onicegatheringstatechange = this.onIceGatheringStateChange;
    this.connection.onsignalingstatechange = this.onSignalingStateChange;
  }

  async startCall(mediaConstraints: MediaConstraint): Promise<boolean> {
    this.isCallerPeer = true;
    try {
      this.localStream
        .getTracks()
        .forEach(track =>
          mediaConstraints[track.kind as keyof MediaConstraint]
            ? this.connection.addTrack(track, this.localStream)
            : false
        );
    } catch (err) {
      this.onMediaError(err);
    }

    return true;
  }

  hangUpCall(): void {
    this.closeRTPConnection();
    this.sendSignal(
      "hangup",
      {
        peerId: this.peerId
      },
      this.isCallerPeer ? this.calleeSocketId : this.callerSocketId
    );
  }

  sendSignal(
    type: string,
    signal: OfferSignal | AnswerSignal | ICESignal | HangUpSignal,
    target: string
  ) {
    this.socket.emit("webrtc_signal", {
      signal,
      target,
      type
    });
  }

  async handleOffer(
    signal: OfferSignal,
    mediaConstraints: MediaConstraint
  ): Promise<boolean> {
    this.isCallerPeer = false;

    try {
      await this.connection.setRemoteDescription(signal.sdp);

      this.localStream
        .getTracks()
        .forEach(track =>
          mediaConstraints[track.kind as keyof MediaConstraint]
            ? this.connection.addTrack(track, this.localStream)
            : false
        );
      const answer = await this.connection.createAnswer();
      await this.connection.setLocalDescription(answer);

      this.sendSignal(
        "answer",
        {
          callerUserId: this.callerUserId,
          calleeUserId: this.calleeUserId,
          peerId: this.peerId,
          sdp: answer
        },
        this.callerSocketId
      );
    } catch (err) {
      this.onMediaError(err);
    }

    return true;
  }

  handleAnswer(signal: AnswerSignal): void {
    this.connection.setRemoteDescription(signal.sdp);
  }

  handleNewIceCandidate(candidate: RTCIceCandidate): void {
    try {
      this.connection.addIceCandidate(candidate);
    } catch (err) {
      console.error(err);
    }
  }

  onNegotiationNeeded = async (): Promise<boolean> => {
    try {
      const offer = await this.connection.createOffer({ iceRestart: true });
      await this.connection.setLocalDescription(offer);

      this.sendSignal(
        "offer",
        {
          callerUserId: this.callerUserId,
          calleeUserId: this.calleeUserId,
          callerSocketId: this.callerSocketId,
          calleeSocketId: this.calleeSocketId,
          sdp: offer
        },
        this.calleeSocketId
      );
    } catch (err) {
        console.error(err) // eslint-disable-line
      // alert('Some error before sending offer')
    }
    return true;
  };

  onIceCandidate = (event: RTCPeerConnectionIceEvent): void => {
    this.sendSignal(
      "ice",
      {
        peerId: this.peerId,
        candidate: event.candidate
      },
      this.isCallerPeer ? this.calleeSocketId : this.callerSocketId
    );
  };

  onTrack = (event: RTCTrackEvent): void => {
    (document.getElementById(
      this.remoteStreamHtmlId
    ) as HTMLMediaElement).srcObject = event.streams[0];
    // document.getElementById("hangup-button").disabled = false;

    const trackList = event.streams[0].getTracks();

    if (trackList.length === 0) {
      this.closeRTPConnection();
    }
  };

  // State change handlers
  onIceConnectionStateChange = (): void => {
    console.log(
      "ICE candidate state changed to",
      this.connection.iceConnectionState
    );
    switch (this.connection.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        break;
    }
  };

  onSignalingStateChange = (): void => {
    switch (this.connection.signalingState) {
      case "closed":
        this.closeRTPConnection();
        break;
    }
  };

  // below can be used for debugging
  onIceGatheringStateChange = (): void => {
    return;
  };
  // End state change handlers

  onMediaError = (err: Error): void => {
    // TODO remove alerts
    switch (err.name) {
      case "NotFoundError":
        alert(
          "Unable to open your call because no camera and/or microphone" +
            "were found."
        );
        break;
      case "SecurityError":
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert("Error opening your camera and/or microphone: " + err.message);
        break;
    }
    this.closeRTPConnection();
  };

  closeRTPConnection(): void {
    console.log("RTPConnection closed. Peer#ID", this.peerId);
    this.connection.close();
  }
}
