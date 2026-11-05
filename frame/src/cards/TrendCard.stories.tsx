import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@schemastud/ui';
import { TrendCard } from './TrendCard';
import type { SummaryFigure, SummaryPayload } from './types';

/**
 * Frame/Cards/Trend (exec-board ticket 06). `trend-card` draws a summary's figures as a period
 * series: one figure per period, in order; a figure marked `forecast: true` draws as the dashed
 * segment. The Projection lens (exec-board ticket 19) is the producer that marks them.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — measured / with-forecast /
 * all-forecast / gap / single-point / empty. Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Frame/Cards/Trend',
    component: TrendCard,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof TrendCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const series = (values: (number | string)[], forecastFrom = Number.POSITIVE_INFINITY): SummaryFigure[] =>
    values.map((value, i) => ({
        key: `2026-${String(i + 1).padStart(2, '0')}`,
        label: `${MONTHS[i]} 2026`,
        value,
        ...(i >= forecastFrom ? { forecast: true } : {}),
    }));

const payload = (figures: SummaryFigure[]): SummaryPayload => ({ key: 'exec-revenue', label: 'MRR', figures });

const Cell = ({ children }: { children: ReactNode }) => (
    <div style={{ maxWidth: '22rem' }}>
        <Card>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    </div>
);

const MRR = [41200, 43800, 43100, 46900, 49400, 52300, 55100, 54700, 58200];

/** Measured periods only — one solid line, led by the latest period. */
export const Measured: Story = {
    args: { value: payload(series(MRR)) },
    render: (args) => (
        <Cell>
            <TrendCard {...args} />
        </Cell>
    ),
};

/** Six measured months, then three forecast: the dashed segment leaves the last measured point. */
export const WithForecast: Story = {
    args: { value: payload(series(MRR, 6)) },
    render: Measured.render,
};

/** A projection with no measured baseline: dashed throughout, no boundary rule, no lead. */
export const AllForecast: Story = {
    args: { value: payload(series(MRR.slice(0, 4), 0)) },
    render: Measured.render,
};

/** A formatted string is not plotted: the line breaks around it and the table keeps its value. */
export const Gap: Story = {
    args: { value: payload(series([12, 14, '—', 15, 18])) },
    render: Measured.render,
};

/** One period: a centred dot. */
export const SinglePoint: Story = {
    args: { value: payload(series([41200])) },
    render: Measured.render,
};

/** No periods: the honest empty state. */
export const Empty: Story = {
    args: { value: payload([]) },
    render: Measured.render,
};
