import { useEffect, useRef, useState, useCallback } from "react";
import type { Account, CreditCardBillSummary, Transaction } from "../types";
import { apiService } from "../services/api";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { formatBillMonth, formatDate } from "../utils/transactionUtils";
import { CURRENCY_SYMBOLS } from "../constants";
import "./CreditCardBillModal.css";

interface CreditCardBillModalProps {
  account: Account;
  accounts: Account[]; // all accounts, for the "from account" selector
  transactions: Transaction[]; // all transactions for client-side filtering
  isOpen: boolean;
  onClose: () => void;
  onPaymentMade: () => void; // callback to refresh transactions/accounts
}

interface PaymentFormState {
  fromAccount: string;
  amount: string;
}

/** Derive the bill month for a transaction using the same logic as the backend. */
function getTxBillMonth(tx: Transaction): string {
  if (tx.credit_card_bill_month) return tx.credit_card_bill_month;
  return tx.date.substring(0, 7);
}

/** Filter transactions that belong to a specific CC account bill month. */
function filterBillTransactions(
  transactions: Transaction[],
  accountName: string,
  billMonth: string,
): Transaction[] {
  return transactions.filter((tx) => {
    // Must be a purchase on this CC account
    if (tx.type !== "purchase") return false;
    if (tx.account !== accountName) return false;
    // Exclude virtual transactions
    if (tx.is_virtual === true) return false;
    // Must match the bill month
    return getTxBillMonth(tx) === billMonth;
  });
}

/** Determine the default selected month index: first unpaid, or last if all paid. */
function getDefaultMonthIndex(bills: CreditCardBillSummary[]): number {
  if (bills.length === 0) return 0;
  const firstUnpaid = bills.findIndex((b) => !b.is_fully_paid);
  return firstUnpaid >= 0 ? firstUnpaid : bills.length - 1;
}

export function CreditCardBillModal({
  account,
  accounts,
  transactions,
  isOpen,
  onClose,
  onPaymentMade,
}: CreditCardBillModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [bills, setBills] = useState<CreditCardBillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected month navigation
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    fromAccount: "",
    amount: "",
  });
  const [showPayForm, setShowPayForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useModalAccessibility(isOpen, onClose, modalRef);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getCreditCardBills(account.name);
      setBills(data);
      setSelectedMonthIndex(getDefaultMonthIndex(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills.");
    } finally {
      setLoading(false);
    }
  }, [account.name]);

  useEffect(() => {
    if (isOpen) {
      fetchBills();
      setShowPayForm(false);
      setPaymentError(null);
    }
  }, [isOpen, fetchBills]);

  // Reset pay form when navigating months
  useEffect(() => {
    setShowPayForm(false);
    setPaymentError(null);
  }, [selectedMonthIndex]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleOpenPayForm = (bill: CreditCardBillSummary) => {
    setPaymentForm({
      fromAccount: nonCreditAccounts[0]?.name ?? "",
      amount: bill.unpaid_amount.toFixed(2),
    });
    setPaymentError(null);
    setShowPayForm(true);
  };

  const handleCancelPay = () => {
    setShowPayForm(false);
    setPaymentError(null);
  };

  const handleSubmitPayment = async (bill: CreditCardBillSummary) => {
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid amount.");
      return;
    }
    if (!paymentForm.fromAccount) {
      setPaymentError("Please select a source account.");
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      await apiService.payCreditCardBill(account.name, {
        from_account: paymentForm.fromAccount,
        amount,
        bill_month: bill.month,
        description: `Payment for ${formatBillMonth(bill.month)}`,
      });
      onPaymentMade();
      await fetchBills();
      setShowPayForm(false);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Only non-credit-card accounts can be used as payment source
  const nonCreditAccounts = accounts.filter(
    (a) => !a.archived && a.type !== "credit_card" && a.name !== account.name,
  );

  const symbol = CURRENCY_SYMBOLS[account.currency] ?? account.currency;

  if (!isOpen) return null;

  const currentBill = bills[selectedMonthIndex] ?? null;
  const billTransactions = currentBill
    ? filterBillTransactions(transactions, account.name, currentBill.month)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const canGoPrev = selectedMonthIndex > 0;
  const canGoNext = selectedMonthIndex < bills.length - 1;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cc-bill-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-container cc-bill-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="cc-bill-modal-title" className="modal-title">
            💳 Credit Card Bills — {account.name}
          </h2>
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && <p className="cc-bill-loading">Loading bills…</p>}

          {error && (
            <div className="cc-bill-error" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && bills.length === 0 && (
            <p className="cc-bill-empty">
              No credit card bills found for this account.
            </p>
          )}

          {!loading && bills.length > 0 && currentBill && (
            <>
              {/* ── Month navigation ── */}
              <div className="bill-nav">
                <button
                  type="button"
                  className="bill-nav-btn"
                  onClick={() =>
                    setSelectedMonthIndex((i) => Math.max(0, i - 1))
                  }
                  disabled={!canGoPrev}
                  aria-label="Previous month"
                >
                  ←
                </button>

                <div className="bill-nav-center">
                  <span className="cc-bill-month">
                    {formatBillMonth(currentBill.month)}
                  </span>
                  <span className="bill-month-indicator">
                    {selectedMonthIndex + 1} / {bills.length}
                  </span>
                </div>

                <button
                  type="button"
                  className="bill-nav-btn"
                  onClick={() =>
                    setSelectedMonthIndex((i) =>
                      Math.min(bills.length - 1, i + 1),
                    )
                  }
                  disabled={!canGoNext}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>

              {/* ── Bill summary ── */}
              <div className="cc-bill-item">
                <div className="cc-bill-item-header">
                  {/* Paid status badge */}
                  {currentBill.is_fully_paid ? (
                    <span className="cc-bill-paid-badge bill-status-paid">
                      ✅ Fully Paid
                    </span>
                  ) : currentBill.paid_amount > 0 ? (
                    <span className="cc-bill-paid-badge bill-status-partial">
                      ⚠️ Partially Paid
                    </span>
                  ) : (
                    <span className="cc-bill-paid-badge bill-status-unpaid">
                      Unpaid
                    </span>
                  )}

                  {/* Pay button — only when not fully paid and form is hidden */}
                  {!currentBill.is_fully_paid && !showPayForm && (
                    <button
                      type="button"
                      className="btn btn--primary cc-bill-pay-btn"
                      onClick={() => handleOpenPayForm(currentBill)}
                    >
                      Pay
                    </button>
                  )}

                  {/* Additional payment toggle when fully paid */}
                  {currentBill.is_fully_paid && !showPayForm && (
                    <button
                      type="button"
                      className="btn btn--secondary cc-bill-pay-btn"
                      onClick={() => handleOpenPayForm(currentBill)}
                    >
                      + Additional Payment
                    </button>
                  )}
                </div>

                <div className="cc-bill-amounts">
                  <div className="cc-bill-amount-row">
                    <span className="cc-bill-amount-label">Total</span>
                    <span className="cc-bill-amount-value">
                      {symbol}
                      {currentBill.total_amount.toFixed(2)}
                    </span>
                  </div>
                  {currentBill.paid_amount > 0 && (
                    <div className="cc-bill-amount-row">
                      <span className="cc-bill-amount-label">Paid</span>
                      <span className="cc-bill-amount-value amount-positive">
                        {symbol}
                        {currentBill.paid_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="cc-bill-amount-row">
                    <span className="cc-bill-amount-label">Remaining</span>
                    <span
                      className={`cc-bill-amount-value ${currentBill.unpaid_amount > 0 ? "amount-negative" : "amount-positive"}`}
                    >
                      {symbol}
                      {currentBill.unpaid_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ── Inline payment form ── */}
                {showPayForm && (
                  <div className="cc-bill-pay-form">
                    <h4 className="cc-bill-pay-form-title">
                      Pay bill for {formatBillMonth(currentBill.month)}
                    </h4>

                    {paymentError && (
                      <div className="cc-bill-error" role="alert">
                        {paymentError}
                      </div>
                    )}

                    <div className="cc-bill-pay-form-fields">
                      <div className="form-group">
                        <label htmlFor={`pay-from-${currentBill.month}`}>
                          From Account
                        </label>
                        {nonCreditAccounts.length === 0 ? (
                          <p className="cc-bill-no-accounts">
                            No checking accounts available to pay from.
                          </p>
                        ) : (
                          <select
                            id={`pay-from-${currentBill.month}`}
                            value={paymentForm.fromAccount}
                            onChange={(e) =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                fromAccount: e.target.value,
                              }))
                            }
                            disabled={paymentLoading}
                          >
                            {nonCreditAccounts.map((a) => (
                              <option key={a.name} value={a.name}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`pay-amount-${currentBill.month}`}>
                          Amount ({symbol})
                        </label>
                        <input
                          id={`pay-amount-${currentBill.month}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              amount: e.target.value,
                            }))
                          }
                          disabled={paymentLoading}
                        />
                      </div>
                    </div>

                    <div className="cc-bill-pay-form-actions">
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => handleSubmitPayment(currentBill)}
                        disabled={
                          paymentLoading || nonCreditAccounts.length === 0
                        }
                      >
                        {paymentLoading ? "Paying…" : "Confirm Payment"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={handleCancelPay}
                        disabled={paymentLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Transaction list for this month ── */}
              <div className="bill-transactions">
                <h4 className="bill-transactions-title">
                  Transactions
                  {billTransactions.length > 0 && (
                    <span className="bill-transactions-count">
                      {billTransactions.length}
                    </span>
                  )}
                </h4>

                {billTransactions.length === 0 ? (
                  <p className="cc-bill-empty bill-transactions-empty">
                    No transactions found for this month.
                  </p>
                ) : (
                  <ul className="bill-transactions-list">
                    {billTransactions.map((tx) => (
                      <li key={tx.id} className="bill-transaction-item">
                        <div className="bill-transaction-left">
                          <span className="bill-transaction-desc">
                            {tx.description ?? "—"}
                          </span>
                          <span className="bill-transaction-date">
                            {formatDate(tx.date)}
                          </span>
                        </div>
                        <span className="bill-transaction-amount amount-negative">
                          {symbol}
                          {tx.amount.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
