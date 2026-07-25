import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

/**
 * Foundation/Card (component-seams ticket 14). A composition surface (Card + Header/Title/
 * Description/Content/Footer parts). No variant/size prop — but as a raised surface it must read
 * legibly on either shell background, so it carries the **canvas** axis (flat / dotted), expressed
 * here as a story decorator (never a leaf arg, per treatment-axes §2b). Ambient token + light⊗dark
 * wired globally.
 */
const meta = {
    title: 'Foundation/Card',
    component: Card,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const dotted: CSSProperties = {
    backgroundColor: 'var(--background)',
    backgroundImage:
        'radial-gradient(color-mix(in oklch, var(--foreground) 12%, transparent) 1px, transparent 0)',
    backgroundSize: '16px 16px',
};

function DemoCard() {
    return (
        <Card className="w-80">
            <CardHeader>
                <CardTitle>Grounding silo</CardTitle>
                <CardDescription>Support corpus ingested and federated.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                14 documents captured across 3 sources. Last ingest 2 minutes ago.
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="ghost" size="sm">
                    Dismiss
                </Button>
                <Button size="sm">Re-ingest</Button>
            </CardFooter>
        </Card>
    );
}

/** canvas = flat — the default shell background. */
export const OnFlatCanvas: Story = {
    render: () => (
        <div className="flex justify-center p-10" style={{ backgroundColor: 'var(--background)' }}>
            <DemoCard />
        </div>
    ),
};

/** canvas = dotted — the patterned shell background; the card must still read as a raised surface. */
export const OnDottedCanvas: Story = {
    render: () => (
        <div className="flex justify-center p-10" style={dotted}>
            <DemoCard />
        </div>
    ),
};
