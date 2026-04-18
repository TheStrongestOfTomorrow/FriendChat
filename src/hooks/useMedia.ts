import { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { MediaState } from '../types/p2p';

/**
 * Hook to manage WebRTC media streams (audio/video) via PeerJS.
 */
export const useMedia = (peer: Peer | null) => {
  const [state, setState] = useState<MediaState>({
    isAudioEnabled: false,
    isVideoEnabled: false,
    activeStreams: {},
  });

  const localStreamRef = useRef<MediaStream | null>(null);
  const callsRef = useRef<Record<string, MediaConnection>>({});

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setState(prev => {
      const newStreams = { ...prev.activeStreams };
      delete newStreams['local'];
      return {
        ...prev,
        isAudioEnabled: false,
        isVideoEnabled: false,
        activeStreams: newStreams,
      };
    });
  }, []);

  const getLocalStream = useCallback(async (audio: boolean, video: boolean) => {
    try {
      if (localStreamRef.current) {
        stopLocalStream();
      }

      if (!audio && !video) return null;

      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      localStreamRef.current = stream;

      setState(prev => ({
        ...prev,
        isAudioEnabled: audio,
        isVideoEnabled: video,
        activeStreams: {
          ...prev.activeStreams,
          local: stream,
        },
      }));

      // In a real application, you might want to replace tracks in existing calls here.
      // For this implementation, we assume re-calling or manual toggle management.
      return stream;
    } catch (err) {
      console.error('Error getting user media:', err);
      return null;
    }
  }, [stopLocalStream]);

  const toggleAudio = useCallback(async () => {
    if (state.isAudioEnabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => (track.enabled = false));
      }
      setState(prev => ({ ...prev, isAudioEnabled: false }));
    } else {
      if (!localStreamRef.current) {
        await getLocalStream(true, state.isVideoEnabled);
      } else {
        localStreamRef.current.getAudioTracks().forEach(track => (track.enabled = true));
        setState(prev => ({ ...prev, isAudioEnabled: true }));
      }
    }
  }, [state.isAudioEnabled, state.isVideoEnabled, getLocalStream]);

  const toggleVideo = useCallback(async () => {
    if (state.isVideoEnabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => (track.enabled = false));
      }
      setState(prev => ({ ...prev, isVideoEnabled: false }));
    } else {
      if (!localStreamRef.current) {
        await getLocalStream(state.isAudioEnabled, true);
      } else {
        localStreamRef.current.getVideoTracks().forEach(track => (track.enabled = true));
        setState(prev => ({ ...prev, isVideoEnabled: true }));
      }
    }
  }, [state.isAudioEnabled, state.isVideoEnabled, getLocalStream]);

  const handleIncomingCall = useCallback((call: MediaConnection) => {
    console.log(`[useMedia] Incoming call from ${call.peer}`);

    // Auto-answer with current local stream if available
    call.answer(localStreamRef.current || undefined);

    call.on('stream', (remoteStream) => {
      console.log(`[useMedia] Received stream from ${call.peer}`);
      setState(prev => ({
        ...prev,
        activeStreams: {
          ...prev.activeStreams,
          [call.peer]: remoteStream,
        },
      }));
    });

    call.on('close', () => {
      console.log(`[useMedia] Call closed from ${call.peer}`);
      setState(prev => {
        const newStreams = { ...prev.activeStreams };
        delete newStreams[call.peer];
        return { ...prev, activeStreams: newStreams };
      });
      delete callsRef.current[call.peer];
    });

    call.on('error', (err) => {
      console.error(`[useMedia] Call error with ${call.peer}:`, err);
      call.close();
    });

    callsRef.current[call.peer] = call;
  }, []);

  const callPeer = useCallback((targetPeerId: string) => {
    if (!peer || !localStreamRef.current || callsRef.current[targetPeerId]) return;

    console.log(`[useMedia] Calling peer ${targetPeerId}`);
    const call = peer.call(targetPeerId, localStreamRef.current);

    call.on('stream', (remoteStream) => {
      console.log(`[useMedia] Received stream from ${targetPeerId}`);
      setState(prev => ({
        ...prev,
        activeStreams: {
          ...prev.activeStreams,
          [targetPeerId]: remoteStream,
        },
      }));
    });

    call.on('close', () => {
      console.log(`[useMedia] Call closed with ${targetPeerId}`);
      setState(prev => {
        const newStreams = { ...prev.activeStreams };
        delete newStreams[targetPeerId];
        return { ...prev, activeStreams: newStreams };
      });
      delete callsRef.current[targetPeerId];
    });

    callsRef.current[targetPeerId] = call;
  }, [peer]);

  useEffect(() => {
    if (!peer) return;

    peer.on('call', handleIncomingCall);

    return () => {
      peer.off('call', handleIncomingCall);
      Object.values(callsRef.current).forEach(call => call.close());
      stopLocalStream();
    };
  }, [peer, handleIncomingCall, stopLocalStream]);

  return {
    ...state,
    toggleAudio,
    toggleVideo,
    callPeer,
    stopLocalStream,
  };
};
