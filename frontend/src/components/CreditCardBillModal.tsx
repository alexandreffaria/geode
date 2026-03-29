import { useEffect, useRef, useState, useCallback } from "react";
import type { Account, CreditCardBillSummary } from "../types";
import { apiService } from "../services/api";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { formatBillMonth } from "../utils/transactionUtils";
import { CURRENCY_SYMBOLS } from "../constants";
import "./CreditCardBillModal.css";

interface CreditCardBillModalProps {
  account: Account;
  accounts: Account[]; // all accounts, for the "from account" selector
  isOpen: boolean;
  onClose: () => void;
  onPaymentMade: () => void; // callback to refresh transactions/accounts
}

interface PaymentFormState {
  fromAccount: string;
  amount: string;
}

export function CreditCardBillModal({
  account,
  accounts,
  isOpen,
  onClose,
  onPaymentMade,
}: CreditCardBillModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [bills, setBills] = useState<CreditCardBillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which month's payment form is open
  const [payingMonth, setPayingMonth] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    fromAccount: "",
    amount: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useModalAccessibility(isOpen, onClose, modalRef);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getCreditCardBills(account.name);
      setBills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills.");
    } finally {
      setLoading(false);
    }
  }, [account.name]);

  useEffect(() => {
    if (isOpen) {
      fetchBills();
      setPayingMonth(null);
      setPaymentError(null);
    }
  }, [isOpen, fetchBills]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleOpenPayForm = (bill: CreditCardBillSummary) => {
    setPayingMonth(bill.month);
    setPaymentForm({
      fromAccount: nonCreditAccounts[0]?.name ?? "",
      amount: bill.unpaid_amount.toFixed(2),
    });
    setPaymentError(null);
  };

  const handleCancelPay = () => {
    setPayingMonth(null);
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
      setPayingMonth(null);
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

          {!loading && bills.length > 0 && (
            <ul className="cc-bill-list">
              {bills.map((bill) => (
                <li key={bill.month} className="cc-bill-item">
                  <div className="cc-bill-item-header">
                    <div className="cc-bill-month">
                      {formatBillMonth(bill.month)}
                    </div>
                    {bill.is_fully_paid ? (
                      <span className="cc-bill-paid-badge">✓ Fully Paid</span>
                    ) : (
                      payingMonth !== bill.month && (
                        <button
                          type="button"
                          className="btn btn--primary cc-bill-pay-btn"
                          onClick={() => handleOpenPayForm(bill)}
                        >
                          Pay
                        </button>
                      )
                    )}
                  </div>

                  <div className="cc-bill-amounts">
                    <div className="cc-bill-amount-row">
                      <span className="cc-bill-amount-label">Total</span>
                      <span className="cc-bill-amount-value">
                        {symbol}
                        {bill.total_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="cc-bill-amount-row">
                      <span className="cc-bill-amount-label">Paid</span>
                      <span className="cc-bill-amount-value amount-positive">
                        {symbol}
                        {bill.paid_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="cc-bill-amount-row">
                      <span className="cc-bill-amount-label">Remaining</span>
                      <span
                        className={`cc-bill-amount-value ${bill.unpaid_amount > 0 ? "amount-negative" : "amount-positive"}`}
                      >
                        {symbol}
                        {bill.unpaid_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Inline payment form */}
                  {payingMonth === bill.month && (
                    <div className="cc-bill-pay-form">
                      <h4 className="cc-bill-pay-form-title">
                        Pay bill for {formatBillMonth(bill.month)}
                      </h4>

                      {paymentError && (
                        <div className="cc-bill-error" role="alert">
                          {paymentError}
                        </div>
                      )}

                      <div className="cc-bill-pay-form-fields">
                        <div className="form-group">
                          <label htmlFor={`pay-from-${bill.month}`}>
                            From Account
                          </label>
                          {nonCreditAccounts.length === 0 ? (
                            <p className="cc-bill-no-accounts">
                              No checking accounts available to pay from.
                            </p>
                          ) : (
                            <select
                              id={`pay-from-${bill.month}`}
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
                          <label htmlFor={`pay-amount-${bill.month}`}>
                            Amount ({symbol})
                          </label>
                          <input
                            id={`pay-amount-${bill.month}`}
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
                          onClick={() => handleSubmitPayment(bill)}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
