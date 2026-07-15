/**
 * Pure mortgage math. No React, no I/O — fully unit tested. Every output is an
 * ESTIMATE and labeled as such in the UI.
 */

export interface MortgageInputs {
  purchasePrice: number;
  downPayment: number; // dollar amount
  interestRate: number; // annual percent, e.g. 6.5
  loanTermYears: number;
  annualPropertyTax: number;
  monthlyHoa: number;
  annualHomeownersInsurance: number;
  /** Annual PMI as a percent of the loan balance (applies while LTV > 80%). */
  pmiAnnualRate: number;
  /** Closing costs as a percent of purchase price. */
  closingCostsPercent: number;
}

export interface AmortizationYear {
  year: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
}

export interface MortgageBreakdown {
  loanAmount: number;
  downPaymentPercent: number;
  principalAndInterest: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyPmi: number;
  totalMonthly: number;
  closingCosts: number;
  cashToClose: number;
  amortization: {
    totalInterest: number;
    totalPrincipal: number;
    totalPaid: number;
    payoffMonths: number;
    pmiDropOffMonth: number | null;
    schedule: AmortizationYear[];
  };
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Monthly principal & interest payment. Handles the zero-interest case. */
export function monthlyPayment(loanAmount: number, annualRatePercent: number, termMonths: number): number {
  if (loanAmount <= 0 || termMonths <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) {
    return loanAmount / termMonths;
  }
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (loanAmount * monthlyRate * factor) / (factor - 1);
}

export function calculateMortgage(inputs: MortgageInputs): MortgageBreakdown {
  const price = clampNonNegative(inputs.purchasePrice);
  const downPayment = Math.min(clampNonNegative(inputs.downPayment), price);
  const loanAmount = Math.max(price - downPayment, 0);
  const termMonths = Math.round(clampNonNegative(inputs.loanTermYears) * 12);
  const monthlyRate = clampNonNegative(inputs.interestRate) / 100 / 12;

  const downPaymentPercent = price > 0 ? (downPayment / price) * 100 : 0;
  const principalAndInterest = monthlyPayment(loanAmount, inputs.interestRate, termMonths);

  const monthlyTax = clampNonNegative(inputs.annualPropertyTax) / 12;
  const monthlyInsurance = clampNonNegative(inputs.annualHomeownersInsurance) / 12;
  const monthlyHoa = clampNonNegative(inputs.monthlyHoa);

  // PMI applies while loan-to-value exceeds 80% of the ORIGINAL price.
  const pmiThresholdBalance = price * 0.8;
  const pmiApplies = inputs.pmiAnnualRate > 0 && loanAmount > pmiThresholdBalance;
  const monthlyPmiInitial = pmiApplies ? (loanAmount * (inputs.pmiAnnualRate / 100)) / 12 : 0;

  // Amortize monthly to derive interest total and PMI drop-off.
  const schedule: AmortizationYear[] = [];
  let balance = loanAmount;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let pmiDropOffMonth: number | null = pmiApplies ? null : null;
  let yearInterest = 0;
  let yearPrincipal = 0;
  let payoffMonths = 0;

  for (let month = 1; month <= termMonths && balance > 0.005; month += 1) {
    const interest = balance * monthlyRate;
    let principalPortion = principalAndInterest - interest;
    if (principalPortion > balance) principalPortion = balance;
    balance -= principalPortion;

    totalInterest += interest;
    totalPrincipal += principalPortion;
    yearInterest += interest;
    yearPrincipal += principalPortion;
    payoffMonths = month;

    if (pmiApplies && pmiDropOffMonth === null && balance <= pmiThresholdBalance) {
      pmiDropOffMonth = month;
    }

    if (month % 12 === 0 || month === termMonths || balance <= 0.005) {
      schedule.push({
        year: Math.ceil(month / 12),
        interestPaid: round2(yearInterest),
        principalPaid: round2(yearPrincipal),
        endingBalance: round2(Math.max(balance, 0)),
      });
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }

  const totalMonthly = principalAndInterest + monthlyTax + monthlyInsurance + monthlyHoa + monthlyPmiInitial;
  const closingCosts = price * (clampNonNegative(inputs.closingCostsPercent) / 100);
  const cashToClose = downPayment + closingCosts;

  return {
    loanAmount: round2(loanAmount),
    downPaymentPercent: round2(downPaymentPercent),
    principalAndInterest: round2(principalAndInterest),
    monthlyTax: round2(monthlyTax),
    monthlyInsurance: round2(monthlyInsurance),
    monthlyHoa: round2(monthlyHoa),
    monthlyPmi: round2(monthlyPmiInitial),
    totalMonthly: round2(totalMonthly),
    closingCosts: round2(closingCosts),
    cashToClose: round2(cashToClose),
    amortization: {
      totalInterest: round2(totalInterest),
      totalPrincipal: round2(totalPrincipal),
      totalPaid: round2(totalInterest + totalPrincipal),
      payoffMonths,
      pmiDropOffMonth,
      schedule,
    },
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
