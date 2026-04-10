import { DataConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { FileChunk, FileMetadata } from '../types/chat';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks for WebRTC stability

export const sendFile = async (
  conn: DataConnection,
  file: File,
  onProgress?: (progress: number) => void
) => {
  const fileId = nanoid();
  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  };

  // Send metadata first
  conn.send({
    type: 'file-start',
    fileId,
    metadata
  });

  const buffer = await file.arrayBuffer();
  const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
    const chunkData = buffer.slice(start, end);

    const chunk: FileChunk = {
      id: fileId,
      index: i,
      total: totalChunks,
      data: chunkData
    };

    conn.send({
      type: 'file-chunk',
      chunk
    });

    if (onProgress) {
      onProgress(((i + 1) / totalChunks) * 100);
    }

    // Small delay to prevent overwhelming the data channel
    if (i % 20 === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
};

export class FileReceiver {
  private chunks: Map<string, ArrayBuffer[]> = new Map();
  private metadata: Map<string, FileMetadata> = new Map();

  start(fileId: string, metadata: FileMetadata) {
    this.chunks.set(fileId, []);
    this.metadata.set(fileId, metadata);
  }

  receiveChunk(chunk: FileChunk): Blob | null {
    const fileChunks = this.chunks.get(chunk.id);
    if (!fileChunks) return null;

    fileChunks[chunk.index] = chunk.data as ArrayBuffer;

    // Check if all chunks received
    const receivedCount = fileChunks.filter(c => c !== undefined).length;
    if (receivedCount === chunk.total) {
      const metadata = this.metadata.get(chunk.id)!;
      const blob = new Blob(fileChunks, { type: metadata.type });

      // Cleanup
      this.chunks.delete(chunk.id);
      this.metadata.delete(chunk.id);

      return blob;
    }

    return null;
  }
}
