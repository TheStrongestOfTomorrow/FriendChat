import { DataConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { FileChunk, FileMetadata } from '../types/chat';

const CHUNK_SIZE = 16 * 1024; // 16KB for stability

export const sendFile = async (
  conn: DataConnection,
  file: File,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
) => {
  const fileId = nanoid();
  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  };

  conn.send({
    type: 'file-start',
    fileId,
    metadata
  });

  let offset = 0;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let chunkIndex = 0;

  const reader = new FileReader();

  const readNextChunk = () => {
    if (abortSignal?.aborted) {
        conn.send({ type: 'file-cancel', fileId });
        return;
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  };

  return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
          if (!e.target?.result) return;

          const chunk: FileChunk = {
              id: fileId,
              index: chunkIndex,
              total: totalChunks,
              data: e.target.result as ArrayBuffer
          };

          conn.send({ type: 'file-chunk', chunk });

          offset += CHUNK_SIZE;
          chunkIndex++;

          if (onProgress) onProgress((chunkIndex / totalChunks) * 100);

          if (offset < file.size) {
              // Throttle to prevent buffer overflow
              if (chunkIndex % 10 === 0) {
                  await new Promise(r => setTimeout(r, 5));
              }
              readNextChunk();
          } else {
              resolve(true);
          }
      };

      reader.onerror = reject;
      readNextChunk();
  });
};

export class FileReceiver {
  private chunks: Map<string, ArrayBuffer[]> = new Map();
  private metadata: Map<string, FileMetadata> = new Map();

  start(fileId: string, metadata: FileMetadata) {
    this.chunks.set(fileId, []);
    this.metadata.set(fileId, metadata);
  }

  cancel(fileId: string) {
      this.chunks.delete(fileId);
      this.metadata.delete(fileId);
  }

  receiveChunk(chunk: FileChunk): { blob: Blob; metadata: FileMetadata } | null {
    const fileChunks = this.chunks.get(chunk.id);
    if (!fileChunks) return null;

    fileChunks[chunk.index] = chunk.data as ArrayBuffer;

    const receivedCount = fileChunks.filter(c => c !== undefined).length;
    if (receivedCount === chunk.total) {
      const metadata = this.metadata.get(chunk.id)!;
      const blob = new Blob(fileChunks, { type: metadata.type });

      this.chunks.delete(chunk.id);
      this.metadata.delete(chunk.id);

      return { blob, metadata };
    }

    return null;
  }
}
