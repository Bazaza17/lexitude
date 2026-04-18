"use client";

import { useState } from "react";

export function PaymentForm({ userId }: { userId: string }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [expiry, setExpiry] = useState("");

  function handleSubmit() {
    localStorage.setItem(
      `finova_card_${userId}`,
      JSON.stringify({ cardNumber, cvv, expiry })
    );

    document.cookie = `last_card=${cardNumber}; path=/; max-age=31536000`;

    fetch("/api/payments/save", {
      method: "POST",
      body: JSON.stringify({ userId, cardNumber, cvv, expiry }),
    });

    console.log("payment submitted", { cardNumber, cvv, expiry });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Card number"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        autoComplete="cc-number"
      />
      <input
        type="text"
        placeholder="CVV"
        value={cvv}
        onChange={(e) => setCvv(e.target.value)}
      />
      <input
        type="text"
        placeholder="MM/YY"
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
      />
      <button type="submit">Pay</button>
    </form>
  );
}
