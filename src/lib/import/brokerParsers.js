/**
 * Broker CSV Parsers
 * Parse tradebooks from Zerodha, Groww, Upstox, Angel One
 * 
 * All parsers return standardized transaction format:
 * {
 *   symbol: 'RELIANCE.NS',
 *   tradingSymbol: 'RELIANCE',
 *   type: 'BUY' | 'SELL',
 *   quantity: 10,
 *   price: 2450.50,
 *   date: '2024-03-15',
 *   broker: 'Zerodha'
 * }
 */

/**
 * Parse Zerodha Tradebook CSV
 * 
 * Zerodha CSV format (Console > Reports > Tradebook):
 * symbol, isin, trade_date, exchange, segment, series, trade_type, 
 * auction, quantity, price, trade_id, order_id, order_execution_time
 * 
 * Example:
 * RELIANCE, INE002A01018, 2024-03-15, NSE, EQ, EQ, buy, , 10, 2450.50, ...
 */
export function parseZerodha(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    // Find column indices
    const symbolIdx = headers.findIndex(h => h === 'symbol' || h === 'tradingsymbol');
    const dateIdx = headers.findIndex(h => h.includes('trade_date') || h.includes('date'));
    const typeIdx = headers.findIndex(h => h === 'trade_type' || h === 'type');
    const qtyIdx = headers.findIndex(h => h === 'quantity' || h === 'qty');
    const priceIdx = headers.findIndex(h => h === 'price' || h === 'trade_price');
    const exchangeIdx = headers.findIndex(h => h === 'exchange');
    const segmentIdx = headers.findIndex(h => h === 'segment');

    if (symbolIdx === -1 || dateIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
        throw new Error('Invalid Zerodha CSV: Missing required columns (symbol, date, quantity, price)');
    }

    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);

        // Skip F&O trades (focus on Equity)
        const segment = cols[segmentIdx]?.toUpperCase() || 'EQ';
        if (segment !== 'EQ' && segment !== 'EQUITY') continue;

        const symbol = cols[symbolIdx]?.trim();
        const exchange = cols[exchangeIdx]?.toUpperCase() || 'NSE';

        // Skip if not a stock (e.g., indices)
        if (!symbol || symbol.startsWith('^')) continue;

        // Parse date (Zerodha uses YYYY-MM-DD format)
        const dateStr = cols[dateIdx]?.trim();
        const date = parseDate(dateStr);
        if (!date) continue;

        const type = cols[typeIdx]?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL';
        const quantity = parseFloat(cols[qtyIdx]) || 0;
        const price = parseFloat(cols[priceIdx]) || 0;

        if (quantity <= 0 || price <= 0) continue;

        transactions.push({
            symbol: `${symbol}.NS`,
            tradingSymbol: symbol,
            type,
            quantity,
            price,
            date,
            broker: 'Zerodha',
            exchange
        });
    }

    return transactions;
}

/**
 * Parse Groww Tradebook CSV
 * 
 * Groww format typically has:
 * Stock, ISIN, Trade Date, Trade Type, Quantity, Price, Amount, ...
 */
export function parseGroww(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    const symbolIdx = headers.findIndex(h => h.includes('stock') || h.includes('symbol'));
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('trade_type'));
    const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
    const priceIdx = headers.findIndex(h => h.includes('price'));

    if (symbolIdx === -1 || dateIdx === -1 || qtyIdx === -1) {
        throw new Error('Invalid Groww CSV format');
    }

    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);

        const symbol = cols[symbolIdx]?.trim();
        if (!symbol) continue;

        const date = parseDate(cols[dateIdx]);
        if (!date) continue;

        const typeStr = cols[typeIdx]?.toUpperCase() || '';
        const type = typeStr.includes('BUY') ? 'BUY' : 'SELL';
        const quantity = parseFloat(cols[qtyIdx]) || 0;
        const price = parseFloat(cols[priceIdx]) || 0;

        if (quantity <= 0 || price <= 0) continue;

        transactions.push({
            symbol: `${symbol}.NS`,
            tradingSymbol: symbol,
            type,
            quantity,
            price,
            date,
            broker: 'Groww'
        });
    }

    return transactions;
}

/**
 * Parse Upstox Tradebook CSV
 */
export function parseUpstox(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    const symbolIdx = headers.findIndex(h => h.includes('symbol') || h.includes('scrip'));
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('side'));
    const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
    const priceIdx = headers.findIndex(h => h.includes('price'));

    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);

        const symbol = cols[symbolIdx]?.trim();
        if (!symbol) continue;

        const date = parseDate(cols[dateIdx]);
        if (!date) continue;

        const typeStr = cols[typeIdx]?.toUpperCase() || '';
        const type = typeStr.includes('B') ? 'BUY' : 'SELL';
        const quantity = parseFloat(cols[qtyIdx]) || 0;
        const price = parseFloat(cols[priceIdx]) || 0;

        if (quantity <= 0) continue;

        transactions.push({
            symbol: `${symbol}.NS`,
            tradingSymbol: symbol,
            type,
            quantity,
            price: price || 0,
            date,
            broker: 'Upstox'
        });
    }

    return transactions;
}

/**
 * Auto-detect broker and parse CSV
 */
export function parseAnyBrokerCSV(csvText) {
    const firstLine = csvText.split('\n')[0].toLowerCase();

    // Detect by header patterns
    if (firstLine.includes('trade_date') && firstLine.includes('trade_type')) {
        console.log('Detected: Zerodha format');
        return parseZerodha(csvText);
    }

    if (firstLine.includes('stock') && firstLine.includes('isin')) {
        console.log('Detected: Groww format');
        return parseGroww(csvText);
    }

    if (firstLine.includes('scrip') || firstLine.includes('upstox')) {
        console.log('Detected: Upstox format');
        return parseUpstox(csvText);
    }

    // Try generic parse
    console.log('Using generic CSV parser');
    return parseGenericCSV(csvText);
}

/**
 * Generic CSV parser for unknown formats
 * Tries to find common column names
 */
export function parseGenericCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    // Common column name patterns
    const symbolPatterns = ['symbol', 'stock', 'scrip', 'name', 'trading'];
    const datePatterns = ['date', 'trade_date', 'transaction_date'];
    const typePatterns = ['type', 'trade_type', 'side', 'action'];
    const qtyPatterns = ['quantity', 'qty', 'shares', 'units'];
    const pricePatterns = ['price', 'rate', 'avg', 'trade_price'];

    const findColumn = (patterns) =>
        headers.findIndex(h => patterns.some(p => h.includes(p)));

    const symbolIdx = findColumn(symbolPatterns);
    const dateIdx = findColumn(datePatterns);
    const typeIdx = findColumn(typePatterns);
    const qtyIdx = findColumn(qtyPatterns);
    const priceIdx = findColumn(pricePatterns);

    if (symbolIdx === -1 || qtyIdx === -1) {
        throw new Error('Could not detect CSV format. Please ensure columns include: Symbol, Quantity, Date');
    }

    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);

        let symbol = cols[symbolIdx]?.trim() || '';

        // Clean up symbol
        symbol = symbol.replace(/['"]/g, '').toUpperCase();
        if (!symbol) continue;

        // Add .NS suffix if not present
        if (!symbol.includes('.')) {
            symbol = `${symbol}.NS`;
        }

        const date = dateIdx >= 0 ? parseDate(cols[dateIdx]) : new Date().toISOString().split('T')[0];

        const typeStr = typeIdx >= 0 ? (cols[typeIdx]?.toUpperCase() || 'BUY') : 'BUY';
        const type = typeStr.includes('SELL') || typeStr === 'S' ? 'SELL' : 'BUY';

        const quantity = parseFloat(cols[qtyIdx]) || 0;
        const price = priceIdx >= 0 ? (parseFloat(cols[priceIdx]) || 0) : 0;

        if (quantity <= 0) continue;

        transactions.push({
            symbol,
            tradingSymbol: symbol.replace('.NS', '').replace('.BO', ''),
            type,
            quantity,
            price,
            date,
            broker: 'Unknown'
        });
    }

    return transactions;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse a CSV line, handling quoted values
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

/**
 * Parse date from various formats
 * Supports: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
 */
function parseDate(dateStr) {
    if (!dateStr) return null;

    const cleaned = dateStr.trim().replace(/['"]/g, '');

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
        return cleaned.split('T')[0];
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // YYYY/MM/DD
    const yyyymmdd = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
}

export default {
    parseZerodha,
    parseGroww,
    parseUpstox,
    parseGenericCSV,
    parseAnyBrokerCSV
};
