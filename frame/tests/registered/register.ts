// The fixture registration a host makes, in a `.ts` module: one key, hand-written.
export interface MemberRow {
    id: string;
    name: string;
    email: string;
    plan: { tier: string; seats: number } | null;
}

export interface MemberEdit {
    name: string;
    email: string;
}

declare module '../../src/resources' {
    interface FrameResourceMap {
        members: {
            row: MemberRow;
            edit: MemberEdit;
            createResult: MemberRow;
            actions: { archive: null; publish: { note: string } };
        };
    }
}
