import type { Meta, StoryObj } from '@storybook/react-vite';
import { MockFrameProvider } from '../story-harness';
import { ShadcnPagination } from './list-slots';

const meta = {
    title: 'Frame/Shadcn/Pagination',
    parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Ambient token/light/dark come from the workbench; state and viewport are explicit. */
export const CursorStates: Story = {
    render: () => (
        <MockFrameProvider>
            <div className="space-y-4">
                {[
                    { label: 'First', isFirst: true, hasPrevious: false, hasNext: true },
                    { label: 'Middle', isFirst: false, hasPrevious: true, hasNext: true },
                    {
                        label: 'Terminal',
                        isFirst: false,
                        hasPrevious: true,
                        hasNext: false,
                    },
                    {
                        label: 'Replayed',
                        isFirst: false,
                        hasPrevious: false,
                        hasNext: true,
                    },
                    {
                        label: 'Loading',
                        isFirst: false,
                        hasPrevious: true,
                        hasNext: true,
                        disabled: true,
                    },
                ].map(({ label, ...state }) => (
                    <div key={label}>
                        <p>{label}</p>
                        <ShadcnPagination
                            mode="cursor"
                            perPage={25}
                            {...state}
                            onPerPageChange={() => {}}
                            onFirst={() => {}}
                            onPrevious={() => {}}
                            onNext={() => {}}
                        />
                    </div>
                ))}
            </div>
        </MockFrameProvider>
    ),
};
export const OffsetStates: Story = {
    render: () => (
        <MockFrameProvider>
            <div className="space-y-4">
                {[1, 3, 5].map((page) => (
                    <ShadcnPagination
                        key={page}
                        mode="offset"
                        page={page}
                        perPage={25}
                        total={120}
                        onPageChange={() => {}}
                        onPerPageChange={() => {}}
                    />
                ))}
            </div>
        </MockFrameProvider>
    ),
};
export const Mobile: Story = {
    ...CursorStates,
    parameters: { viewport: { defaultViewport: 'mobile1' } },
};
