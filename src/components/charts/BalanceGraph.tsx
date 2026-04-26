'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './BalanceGraph.module.css';
import { Transaction } from '@/types';

interface Props {
  transactions: Transaction[];
  isDebt: boolean;
}

const CHART_MARGIN = { top: 10, right: 0, left: 0, bottom: 0 };
const CHART_TICK_GAP = 20;
const CHART_Y_AXIS_WIDTH = 40;
const CHART_HEIGHT = 200;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      dateLabel: string;
      balance: number;
      changeAmount: number;
      changeLabel: string;
      changeKind: 'Debt' | 'Repayment' | 'No change';
    };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    const signedAmount = point.changeKind === 'Repayment' ? -point.changeAmount : point.changeAmount;
    const signedAmountText = `${signedAmount >= 0 ? '+' : '-'}${Math.abs(signedAmount)}`;
    const valueClassName = signedAmount >= 0 ? styles.tooltipPositive : styles.tooltipNegative;

    return (
      <div className={styles.tooltip} role="tooltip">
        <p className={`${styles.tooltipValue} ${valueClassName}`}>{signedAmountText}</p>
      </div>
    );
  }
  return null;
};

export function BalanceGraph({ transactions, isDebt }: Props) {
  const chartColor = isDebt === true ? 'var(--color-danger)' : 'var(--color-primary)';
  const uniqueId = isDebt ? 'debt' : 'advance';
  const gradientId = `colorBalance-${uniqueId}`;

  const data = transactions.reduce<Array<{
    x: string;
    dateLabel: string;
    balance: number;
    changeAmount: number;
    changeKind: 'Debt' | 'Repayment' | 'No change';
    changeLabel: string;
  }>>((points, t, index) => {
    const previousBalance = points.length > 0 ? points[points.length - 1].balance : 0;
    let nextBalance = previousBalance;
    let changeAmount = 0;
    let changeKind: 'Debt' | 'Repayment' | 'No change' = 'No change';

    if (t.approval === 'VERIFIED') {
      if (t.type === 'CREDIT') {
        nextBalance = previousBalance + t.originalAmount;
        changeAmount = t.originalAmount;
        changeKind = 'Debt';
      }

      if (t.type === 'PAYMENT') {
        nextBalance = previousBalance - t.originalAmount;
        changeAmount = t.originalAmount;
        changeKind = 'Repayment';
      }
    }

    const dateLabel = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return [
      ...points,
      {
        x: `${new Date(t.date).toISOString()}-${index}`,
        dateLabel,
        balance: nextBalance,
        changeAmount,
        changeKind,
        changeLabel: nextBalance < 0 ? 'Advance' : 'Balance',
      },
    ];
  }, []);

  return (
    <figure className={styles.container} aria-label="Balance history over time">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity="var(--opacity-low)" />
              <stop offset="95%" stopColor={chartColor} stopOpacity="var(--opacity-transparent)" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            fontSize="var(--font-size-xs)"
            tickLine={false}
            axisLine={false}
            minTickGap={CHART_TICK_GAP}
            tickFormatter={(_, index) => data[index]?.dateLabel ?? ''}
          />
          <YAxis fontSize="var(--font-size-xs)" tickLine={false} axisLine={false} width={CHART_Y_AXIS_WIDTH} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="balance" stroke={chartColor} fillOpacity="var(--opacity-full)" fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
