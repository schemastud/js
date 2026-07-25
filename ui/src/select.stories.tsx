import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SimpleSelect,
    type SimpleSelectOption,
} from './select';

/**
 * Foundation/Select (component-seams ticket 14). The Radix select — the trigger + portalled
 * listbox, plus the `SimpleSelect` flat-list convenience. Mechanism primitive: no variant/size;
 * axes it exposes are the closed/open **states** and the disabled **state**. Ambient token +
 * light⊗dark wired globally.
 */
// Render-based stories (the FrameLayout pilot idiom): SimpleSelect has required props, so the
// meta is untyped-by-component and each story renders explicitly rather than from args.
const meta = {
    title: 'Foundation/Select',
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="w-64">
                <Story />
            </div>
        ),
    ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const OPTIONS: SimpleSelectOption[] = [
    { value: 'local', label: 'Local' },
    { value: 'mcp', label: 'MCP' },
    { value: 'failed', label: 'Failed' },
];

function ControlledSimple(props: { disabled?: boolean }) {
    const [value, setValue] = useState('local');
    return (
        <SimpleSelect
            value={value}
            onValueChange={setValue}
            options={OPTIONS}
            placeholder="Pick a source"
            disabled={props.disabled}
            aria-label="Source"
        />
    );
}

/** states = closed — the SimpleSelect trigger. */
export const Simple: Story = { render: () => <ControlledSimple /> };

/** states = disabled. */
export const Disabled: Story = { render: () => <ControlledSimple disabled /> };

/** states = open — the composed Select listbox rendered, for the catalog + VR baseline. */
export const Open: Story = {
    render: () => (
        <Select defaultOpen defaultValue="local">
            <SelectTrigger aria-label="Source">
                <SelectValue placeholder="Pick a source" />
            </SelectTrigger>
            <SelectContent>
                {OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    ),
};
