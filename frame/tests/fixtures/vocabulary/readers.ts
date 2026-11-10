import type { FrameReaders } from '../../../src/vocabulary';

function sourceReader() {}
export default { 'manifest:source-reader': sourceReader, 'manifest:resources': sourceReader } satisfies FrameReaders;
