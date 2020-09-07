// With the help of
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
// This should work

interface MediaConstraint {
  audio: boolean;
  video: boolean;
}

interface InitSignal {
  type: string;
  userId: number;
  roomId: string;
  sdp: RTCSessionDescription | RTCSessionDescriptionInit;
}

interface ICESignal {
  type: string;
  roomId: string;
  candidate: RTCIceCandidate | null;
}

interface HangUpSignal {
  type: string;
  userId: number;
  roomId: string;
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
  sendSignal(signal: InitSignal | ICESignal | HangUpSignal): void;

  handleOffer(signal: InitSignal, mediaConstraints: MediaConstraint): void;
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
  userId: number;
  roomId: string;
  connection: RTCPeerConnection;
  wsCon: WebSocket;
  localStreamHtmlId: string;
  remoteStreamHtmlId: string;

  constructor(
    userId: number,
    roomId: string,
    wsConnection: WebSocket,
    localStreamHtmlId: string,
    remoteStreamHtmlId: string
  ) {
    this.userId = userId;
    this.roomId = roomId;
    this.wsCon = wsConnection;
    this.localStreamHtmlId = localStreamHtmlId;
    this.remoteStreamHtmlId = remoteStreamHtmlId;
    this.connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org" // TODO: Use your own
        }
      ]
    });

    this.connection.onicecandidate = this.onIceCandidate;
    this.connection.ontrack = this.onTrack;
    this.connection.onnegotiationneeded = this.onNegotiationNeeded;

    // this.connection.onremovetrack = this.onRemoveTrack; // depreciated

    this.connection.oniceconnectionstatechange = this.onIceConnectionStateChange;
    this.connection.onicegatheringstatechange = this.onIceGatheringStateChange;
    this.connection.onsignalingstatechange = this.onSignalingStateChange;
  }

  async startCall(mediaConstraints: MediaConstraint): Promise<boolean> {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );

      (document.getElementById(
        this.localStreamHtmlId
      ) as HTMLMediaElement).srcObject = localStream;

      localStream
        .getTracks()
        .forEach(track =>
          mediaConstraints[track.kind as keyof MediaConstraint]
            ? this.connection.addTrack(track, localStream)
            : false
        );
    } catch (err) {
      this.onMediaError(err);
    }

    return true;
  }

  hangUpCall(): void {
    this.closeRTPConnection();
    this.sendSignal({
      userId: this.userId,
      roomId: this.roomId,
      type: "hang_up"
    });
  }

  sendSignal(signal: InitSignal | ICESignal | HangUpSignal) {
    const msgJSON = JSON.stringify(signal);
    this.wsCon.send(msgJSON);
  }

  async handleOffer(
    signal: InitSignal,
    mediaConstraints: MediaConstraint
  ): Promise<boolean> {
    try {
      await this.connection.setRemoteDescription(signal.sdp);
      const localStream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );

      (document.getElementById(
        this.localStreamHtmlId
      ) as HTMLMediaElement).srcObject = localStream;

      localStream
        .getTracks()
        .forEach(track =>
          mediaConstraints[track.kind as keyof MediaConstraint]
            ? this.connection.addTrack(track, localStream)
            : false
        );
      const answer = await this.connection.createAnswer();
      await this.connection.setLocalDescription(answer);

      this.sendSignal({
        userId: this.userId,
        roomId: signal.roomId,
        type: "video_answer",
        sdp: answer
      });
    } catch (err) {
      this.onMediaError(err);
    }

    return true;
  }

  handleNewIceCandidate(candidate: RTCIceCandidate): void {
    try {
      this.connection.addIceCandidate(candidate);
    } catch (err) {
      alert("Error handling incoming ice candidate");
    }
  }

  onNegotiationNeeded = async (): Promise<boolean> => {
    try {
      const offer = await this.connection.createOffer();
      await this.connection.setLocalDescription(offer);

      this.sendSignal({
        userId: this.userId,
        roomId: this.roomId,
        type: "video_offer",
        sdp: offer
      });
    } catch (err) {
        console.error(err) // eslint-disable-line
      // alert('Some error before sending offer')
    }
    return true;
  };

  onIceCandidate = (event: RTCPeerConnectionIceEvent): void => {
    this.sendSignal({
      type: "new_ice_candidate",
      roomId: this.roomId,
      candidate: event.candidate
    });
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
    switch (this.connection.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        this.closeRTPConnection();
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
    const remoteVideo = document.getElementById(
      this.remoteStreamHtmlId
    ) as HTMLMediaElement;
    const localVideo = document.getElementById(
      this.localStreamHtmlId
    ) as HTMLMediaElement;

    this.connection.ontrack = null;

    // Commented coz depreciated
    // this.connection.onremovetrack = null
    // this.connection.onremovestream = null

    this.connection.onicecandidate = null;
    this.connection.oniceconnectionstatechange = null;
    this.connection.onsignalingstatechange = null;
    this.connection.onicegatheringstatechange = null;
    this.connection.onnegotiationneeded = null;

    if (remoteVideo.srcObject) {
      (remoteVideo.srcObject as MediaStream)
        .getTracks()
        .forEach(track => track.stop());
    }

    if (localVideo.srcObject) {
      (localVideo.srcObject as MediaStream)
        .getTracks()
        .forEach(track => track.stop());
    }

    this.connection.close();

    remoteVideo.removeAttribute("src");
    remoteVideo.removeAttribute("srcObject");
    localVideo.removeAttribute("src");
    remoteVideo.removeAttribute("srcObject");

    // document.getElementById("hangup-button").disabled = true;
    // targetUsername = null;
  }
}
