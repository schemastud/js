import type { Meta, StoryObj } from '@storybook/react-vite';
import { MissingSlots } from './MissingSlots';
import { MockMount, makeConformance, makeMount } from './story-harness';

/**
 * Frame/MissingSlots (component-seams ticket 15). The absent-required-category chrome
 * of the edit canvas (ED-13 F6): a "Missing: N ⟨category⟩ [+ Add]" card per
 * required-slot deficit, read from the EditShellMount conformance channel's
 * `requiredSlots`. Pure shell chrome — no phantom document node; `+ Add` issues a
 * scoped insert through the palette channel.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — the component renders
 * `null` when no deficits exist (an `empty` state that is deliberately invisible) and a
 * stack of deficit cards otherwise. Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Frame/MissingSlots',
    component: MissingSlots,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof MissingSlots>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One deficit — a parent short one required child of a category. */
export const SingleDeficit: Story = {
    render: () => (
        <MockMount
            value={makeMount({
                conformance: makeConformance({
                    requiredSlots: [{ parentId: 'section-1', category: 'field', min: 1, filled: 0 }],
                }),
            })}
        >
            <MissingSlots />
        </MockMount>
    ),
};

/** Several deficits across parents — the full Missing-cards stack. */
export const MultipleDeficits: Story = {
    render: () => (
        <MockMount
            value={makeMount({
                conformance: makeConformance({
                    requiredSlots: [
                        { parentId: 'section-1', category: 'field', min: 2, filled: 0 },
                        { parentId: 'section-2', category: 'option', min: 3, filled: 1 },
                        { parentId: 'root', category: 'section', min: 1, filled: 0 },
                    ],
                }),
            })}
        >
            <MissingSlots />
        </MockMount>
    ),
};

/**
 * Satisfied — no deficits: the component renders `null` (invisible). A framed
 * placeholder makes that documented emptiness legible in the catalog.
 */
export const NoDeficits: Story = {
    render: () => (
        <MockMount value={makeMount({ conformance: makeConformance({ requiredSlots: [] }) })}>
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <MissingSlots />
                No missing slots — component renders nothing.
            </div>
        </MockMount>
    ),
};
