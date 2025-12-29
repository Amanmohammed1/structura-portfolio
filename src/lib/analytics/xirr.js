/**
 * XIRR Calculator - Extended Internal Rate of Return
 * 
 * Unlike simple returns, XIRR accounts for the timing of cash flows.
 * This is the correct way to calculate returns when you've bought/sold
 * at different times with different amounts.
 * 
 * Formula: Sum of [Cash Flow / (1 + XIRR)^((date - firstDate) / 365)] = 0
 * 
 * References:
 * - Excel's XIRR function
 * - Newton-Raphson method for solving IRR
 */

/**
 * Calculate XIRR from cash flows and dates
 * @param {Array<{date: Date, amount: number}>} cashFlows - Negative for investments, positive for returns
 * @param {number} [guess=0.1] - Initial guess (default 10%)
 * @param {number} [tolerance=1e-6] - Convergence tolerance
 * @param {number} [maxIterations=100] - Maximum iterations
 * @returns {number} - Annual return rate (0.15 = 15%)
 */
export function calculateXIRR(cashFlows, guess = 0.1, tolerance = 1e-6, maxIterations = 100) {
    if (!cashFlows || cashFlows.length < 2) {
        return 0;
    }

    // Sort by date
    const sorted = [...cashFlows].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstDate = new Date(sorted[0].date);

    // Convert dates to year fractions from first date
    const flows = sorted.map(cf => ({
        amount: cf.amount,
        yearFrac: (new Date(cf.date).getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    }));

    // Newton-Raphson method
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let derivative = 0;

        for (const flow of flows) {
            const discountFactor = Math.pow(1 + rate, flow.yearFrac);
            npv += flow.amount / discountFactor;
            derivative -= flow.yearFrac * flow.amount / (discountFactor * (1 + rate));
        }

        // Check convergence
        if (Math.abs(npv) < tolerance) {
            return rate;
        }

        // Newton-Raphson update
        const newRate = rate - npv / derivative;

        // Bound check (rate should be between -100% and 1000%)
        if (newRate < -0.99) rate = -0.99;
        else if (newRate > 10) rate = 10;
        else rate = newRate;

        // Check if stuck
        if (Math.abs(npv / derivative) < tolerance) {
            return rate;
        }
    }

    // Return best guess if didn't converge
    return rate;
}

/**
 * Calculate XIRR for a stock given its transactions and current value
 * @param {Array<{date: Date, type: 'BUY'|'SELL'|'DIVIDEND', quantity: number, price: number}>} transactions
 * @param {number} currentPrice - Current market price
 * @param {Date} currentDate - Date for valuation (default: today)
 * @returns {{xirr: number, totalInvested: number, currentValue: number, totalReturn: number}}
 */
export function calculateStockXIRR(transactions, currentPrice, currentDate = new Date()) {
    if (!transactions || transactions.length === 0) {
        return { xirr: 0, totalInvested: 0, currentValue: 0, totalReturn: 0 };
    }

    const cashFlows = [];
    let holdingQuantity = 0;
    let totalInvested = 0;

    for (const tx of transactions) {
        if (tx.type === 'BUY') {
            // Cash outflow (negative)
            cashFlows.push({
                date: tx.date,
                amount: -(tx.quantity * tx.price)
            });
            holdingQuantity += tx.quantity;
            totalInvested += tx.quantity * tx.price;
        } else if (tx.type === 'SELL') {
            // Cash inflow (positive)
            cashFlows.push({
                date: tx.date,
                amount: tx.quantity * tx.price
            });
            holdingQuantity -= tx.quantity;
        } else if (tx.type === 'DIVIDEND') {
            // Cash inflow (positive)
            cashFlows.push({
                date: tx.date,
                amount: tx.quantity * tx.price // price = dividend per share
            });
        }
    }

    // Add current holdings as final cash inflow
    const currentValue = holdingQuantity * currentPrice;
    if (holdingQuantity > 0) {
        cashFlows.push({
            date: currentDate,
            amount: currentValue
        });
    }

    const xirr = calculateXIRR(cashFlows);
    const totalReturn = ((currentValue / totalInvested) - 1) * 100;

    return {
        xirr: xirr * 100, // Convert to percentage
        totalInvested,
        currentValue,
        holdingQuantity,
        totalReturn,
        absoluteGain: currentValue - totalInvested
    };
}

/**
 * Calculate portfolio-level XIRR
 * @param {Object} stocksData - { symbol: { transactions: [], currentPrice: number } }
 * @param {Date} currentDate
 * @returns {Object} - Portfolio XIRR and per-stock breakdown
 */
export function calculatePortfolioXIRR(stocksData, currentDate = new Date()) {
    const allCashFlows = [];
    const perStockResults = {};
    let portfolioInvested = 0;
    let portfolioCurrentValue = 0;

    for (const [symbol, data] of Object.entries(stocksData)) {
        const result = calculateStockXIRR(data.transactions, data.currentPrice, currentDate);
        perStockResults[symbol] = result;

        portfolioInvested += result.totalInvested;
        portfolioCurrentValue += result.currentValue;

        // Add stock cash flows to portfolio
        for (const tx of data.transactions) {
            if (tx.type === 'BUY') {
                allCashFlows.push({ date: tx.date, amount: -(tx.quantity * tx.price) });
            } else if (tx.type === 'SELL') {
                allCashFlows.push({ date: tx.date, amount: tx.quantity * tx.price });
            } else if (tx.type === 'DIVIDEND') {
                allCashFlows.push({ date: tx.date, amount: tx.quantity * tx.price });
            }
        }

        // Add current value
        if (result.holdingQuantity > 0) {
            allCashFlows.push({ date: currentDate, amount: result.currentValue });
        }
    }

    const portfolioXIRR = calculateXIRR(allCashFlows);

    return {
        portfolioXIRR: portfolioXIRR * 100,
        portfolioInvested,
        portfolioCurrentValue,
        portfolioAbsoluteGain: portfolioCurrentValue - portfolioInvested,
        portfolioSimpleReturn: ((portfolioCurrentValue / portfolioInvested) - 1) * 100,
        perStock: perStockResults
    };
}

/**
 * Calculate benchmark comparison
 * Given the user's investment dates and amounts, what if they had invested in NIFTY 50?
 * @param {Array<{date: Date, amount: number}>} investments - User's BUY transactions
 * @param {Array<{date: string, close: number}>} benchmarkPrices - NIFTY 50 daily prices
 * @param {Date} currentDate
 * @returns {Object} - Benchmark comparison
 */
export function calculateBenchmarkComparison(investments, benchmarkPrices, currentDate = new Date()) {
    if (!investments.length || !benchmarkPrices.length) {
        return { benchmarkXIRR: 0, userAlpha: 0 };
    }

    // Create price lookup
    const priceByDate = {};
    benchmarkPrices.forEach(p => { priceByDate[p.date] = p.close; });

    // Find closest price for a date
    const getClosestPrice = (targetDate) => {
        const dateStr = targetDate.toISOString().split('T')[0];
        if (priceByDate[dateStr]) return priceByDate[dateStr];

        // Find closest date
        const sorted = Object.keys(priceByDate).sort();
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i] <= dateStr) {
                return priceByDate[sorted[i]];
            }
        }
        return priceByDate[sorted[0]];
    };

    // Calculate what benchmark units would have been bought
    let totalBenchmarkUnits = 0;
    const benchmarkCashFlows = [];

    for (const inv of investments) {
        const price = getClosestPrice(new Date(inv.date));
        const units = Math.abs(inv.amount) / price;
        totalBenchmarkUnits += units;
        benchmarkCashFlows.push({ date: inv.date, amount: inv.amount }); // Same investment
    }

    // Current benchmark value
    const currentBenchmarkPrice = getClosestPrice(currentDate);
    const benchmarkCurrentValue = totalBenchmarkUnits * currentBenchmarkPrice;

    benchmarkCashFlows.push({ date: currentDate, amount: benchmarkCurrentValue });

    const benchmarkXIRR = calculateXIRR(benchmarkCashFlows);

    return {
        benchmarkXIRR: benchmarkXIRR * 100,
        benchmarkCurrentValue,
        benchmarkUnits: totalBenchmarkUnits
    };
}

export default {
    calculateXIRR,
    calculateStockXIRR,
    calculatePortfolioXIRR,
    calculateBenchmarkComparison
};
