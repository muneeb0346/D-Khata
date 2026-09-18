import { useMemo } from "react";
import { Transaction } from "@/types";
import styles from "./TransactionList.module.css";

interface Props {
  transactions: Transaction[];
}
export function TransactionList({ transactions }: Props) {
  const reversedTransactions = useMemo(() => {
    return transactions ? [...transactions].reverse() : [];
  }, [transactions]);

  if (!transactions || transactions.length === 0) {
    return <p className={`${styles["text-center"]} text-muted p-md`}>No transactions yet.</p>;
  }

  return (
    <ul className="flex-col gap-sm w-full" role="list">
      {reversedTransactions.map(
        ({
          id,
          description,
          date,
          type,
          originalAmount,
          remainingBalance,
          settlement,
          approval,
        }) => {
          const isSettled = settlement === "SETTLED";
          const isPartial = settlement === "PARTIAL";
          const isUnpaid = settlement === "UNPAID" && type === "CREDIT";
          const isDisputed = approval === "DISPUTED";

          const cardClass = [
            "card-base",
            approval === "PENDING" ? styles["card-pending"] : "",
            isDisputed ? styles["card-disputed"] : "",
            isSettled ? styles["status-settled"] : "",
            isUnpaid ? styles["status-unpaid"] : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li
              key={id}
              className={cardClass}
              aria-label={`${description}, ${type === "CREDIT" ? "+" : "-"} Rs. ${originalAmount}, ${settlement}`}
            >
              <div className="flex-row justify-between">
                <strong>{description}</strong>
                <span className={type === "CREDIT" ? "text-debt" : "text-advance"}>
                  {type === "CREDIT" ? "+" : "-"} Rs. {originalAmount}
                </span>
              </div>

              <div className="flex-row justify-between mt-md text-xs text-muted">
                <time dateTime={new Date(date).toISOString()}>
                  {new Date(date).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <span>
                  {approval} • {settlement}
                </span>
              </div>

              {(isSettled || isUnpaid || isPartial || isDisputed) && (
                <div className={`${styles["items-end"]} mt-sm`}>
                  {isSettled && !isDisputed && (
                    <span className={styles["badge-settled"]}>Fully Paid</span>
                  )}
                  {isUnpaid && <span className={styles["badge-unpaid"]}>Unpaid</span>}
                  {isDisputed && <span className={styles["badge-disputed"]}>Disputed</span>}
                  {isPartial && (
                    <div className={styles["partial-container"]}>
                      <label htmlFor={`progress-${id}`} className={styles["partial-text"]}>
                        Rs. {remainingBalance} left
                      </label>
                      <progress
                        id={`progress-${id}`}
                        className="progress-bar"
                        value={originalAmount - remainingBalance}
                        max={originalAmount}
                      >
                        {((originalAmount - remainingBalance) / originalAmount) * 100}%
                      </progress>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        },
      )}
    </ul>
  );
}
