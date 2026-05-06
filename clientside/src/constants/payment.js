export const PAYMENT_CURRENCY = "pkr";
export const PAYMENT_SYMBOL = "Rs.";

export const formatPkrAmount = (amount) => `${PAYMENT_SYMBOL}${amount}`;