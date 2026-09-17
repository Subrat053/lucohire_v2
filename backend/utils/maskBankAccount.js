/**
 * Masks a bank account number, showing only the last 4 digits.
 * Example: "123456789012" -> "XXXX XXXX 9012"
 * @param {string} accountNumber 
 * @returns {string}
 */
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return "";
  const str = String(accountNumber).trim();
  if (str.length <= 4) return str;
  const last4 = str.slice(-4);
  return `XXXX XXXX ${last4}`;
};

module.exports = {
  maskAccountNumber,
};
