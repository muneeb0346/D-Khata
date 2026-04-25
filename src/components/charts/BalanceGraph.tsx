'use client';

import React from 'react';
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
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip} role="tooltip">
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>Rs. {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export function BalanceGraph({ transactions, isDebt }: Props) {
  // Ensure we have a strictly boolean debt status to avoid unexpected color defaults
  const chartColor = isDebt === true ? 'var(--color-danger)' : 'var(--color-primary)';
  const uniqueId = isDebt ? 'debt' : 'advance';
  const gradientId = `colorBalance-${uniqueId}`;

  let balance = 0;
  const data = transactions.map(t => {
    if (t.approval === 'VERIFIED') {
      if (t.type === 'CREDIT') balance += t.originalAmount;
      if (t.type === 'PAYMENT') balance -= t.originalAmount;
    }
    return {
      date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      balance,
    };
  });

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
          <XAxis dataKey="date" fontSize="var(--font-size-xs)" tickLine={false} axisLine={false} minTickGap={CHART_TICK_GAP} />
          <YAxis fontSize="var(--font-size-xs)" tickLine={false} axisLine={false} width={CHART_Y_AXIS_WIDTH} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="balance" stroke={chartColor} fillOpacity="var(--opacity-full)" fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
