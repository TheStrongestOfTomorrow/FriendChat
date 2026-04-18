import { useState, useCallback, useRef } from 'react';
import { DataConnection } from 'peerjs';
import { FileTransferState, TransferProgress } from '../types/p2p';
import { sendFile, FileReceiver } from '../utils/fileTransfer';
import { nanoid } from 'nanoid';

/**
 * Hook to manage P2P file transfers using WebRTC DataChannels.
 * Handles both sending and receiving files with progress tracking.
 */
export const useFileTransfer = (connections: Map<string, DataConnection>) => {
  const [state, setState] = useState<FileTransferState>({
    activeTransfers: {},
  });

  const receiverRef = useRef(new FileReceiver());

  const updateTransfer = useCallback((fileId: string, updates: Partial<TransferProgress>) => {
    setState(prev => {
      const current = prev.activeTransfers[fileId];
      // If it's a new transfer, we need the full object eventually, but name is required for initialization
      if (!current && !updates.name) return prev;
      
      return {
        ...prev,
        activeTransfers: {
          ...prev.activeTransfers,
          [fileId]: { ...current, ...updates } as TransferProgress,
        },
      };
    });
  }, []);

  /**
   * Sends a file to a specific peer.
   */
  const transferFile = useCallback(async (peerId: string, file: File) => {
    const conn = connections.get(peerId);
    if (!conn) {
      console.error(`[useFileTransfer] No connection to peer ${peerId}`);
      return;
    }

    const fileId = nanoid();
    updateTransfer(fileId, {
      fileId,
      name: file.name,
      progress: 0,
      total: file.size,
      status: 'transferring',
      type: 'outgoing',
    });

    try {
      await sendFile(conn, file, (progress) => {
        updateTransfer(fileId, { progress });
      });
      updateTransfer(fileId, { status: 'completed', progress: 100 });
      console.log(`[useFileTransfer] Successfully sent file: ${file.name}`);
    } catch (err) {
      console.error(`[useFileTransfer] Failed to send file ${file.name}:`, err);
      updateTransfer(fileId, { status: 'error' });
    }
  }, [connections, updateTransfer]);

  /**
   * Processes incoming file-related data events from PeerJS connections.
   * This should be called from the central data event listener.
   */
  const handleFileEvent = useCallback((conn: DataConnection, data: any, onComplete?: (fileId: string, blob: Blob, metadata: any) => void) => {
    if (data.type === 'file-start') {
      const { fileId, metadata } = data;
      receiverRef.current.start(fileId, metadata);
      updateTransfer(fileId, {
        fileId,
        name: metadata.name,
        progress: 0,
        total: metadata.size,
        status: 'transferring',
        type: 'incoming',
      });
      console.log(`[useFileTransfer] Receiving file: ${metadata.name} from ${conn.peer}`);
    } else if (data.type === 'file-chunk') {
      const { chunk } = data;
      const result = receiverRef.current.receiveChunk(chunk);

      // Update progress based on chunk index
      const progress = ((chunk.index + 1) / chunk.total) * 100;
      updateTransfer(chunk.id, { progress });

      if (result) {
        updateTransfer(chunk.id, { status: 'completed', progress: 100 });
        console.log(`[useFileTransfer] File transfer complete: ${result.metadata.name}`);
        if (onComplete) {
          onComplete(chunk.id, result.blob, result.metadata);
        }
      }
    } else if (data.type === 'file-cancel') {
      const { fileId } = data;
      receiverRef.current.cancel(fileId);
      updateTransfer(fileId, { status: 'cancelled' });
      console.log(`[useFileTransfer] File transfer cancelled: ${fileId}`);
    }
  }, [updateTransfer]);

  const clearCompletedTransfers = useCallback(() => {
    setState(prev => {
      const newActiveTransfers = { ...prev.activeTransfers };
      Object.keys(newActiveTransfers).forEach(id => {
        if (newActiveTransfers[id].status === 'completed' || newActiveTransfers[id].status === 'cancelled') {
          delete newActiveTransfers[id];
        }
      });
      return { ...prev, activeTransfers: newActiveTransfers };
    });
  }, []);

  return {
    ...state,
    transferFile,
    handleFileEvent,
    clearCompletedTransfers,
  };
};
