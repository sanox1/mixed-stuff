const ethers = require('ethers');

// 1. PROVIDERS - Your Infura Endpoints
const ETH_PROVIDER = 'https://mainnet.infura.io/v3/849dc181182746c98cc8a91bcbf7c7ac';
const POLYGON_PROVIDER = 'https://polygon-mainnet.infura.io/v3/849dc181182746c98cc8a91bcbf7c7ac';

// 2. CONTRACT ADDRESSES - ETH/USD Price Feeds (Different for each chain)
const ETH_FEED_ADDR = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'; // Ethereum Mainnet
const POLY_FEED_ADDR = '0xF9680D99D6C9589e2a93a78A04A279e509205945'; // Polygon Mainnet

// 3. TELEGRAM CONFIG - Add your bot credentials here
const TELEGRAM_BOT_TOKEN = ''; // Get from @BotFather
const TELEGRAM_CHAT_ID = ''; // Your chat ID
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// 4. ABI - The instructions for the contract
const aggregatorV3InterfaceABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            { "internalType": "uint80", "name": "roundId", "type": "uint80" },
            { "internalType": "int256", "name": "answer", "type": "int256" },
            { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
            { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
            { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// 5. INITIALIZE PROVIDERS
const ethProvider = new ethers.JsonRpcProvider(ETH_PROVIDER);
const polyProvider = new ethers.JsonRpcProvider(POLYGON_PROVIDER);

// 6. TELEGRAM NOTIFICATION FUNCTION
async function sendTelegramNotification(message) {
    try {
        const url = `${TELEGRAM_API}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML' // Optional: for formatting
            })
        });
        
        const data = await response.json();
        if (!data.ok) {
            console.error('❌ Telegram API error:', data.description);
        }
    } catch (error) {
        console.error('❌ Failed to send Telegram notification:', error.message);
    }
}

// 7. FORMAT MESSAGE FUNCTION
function formatProfitMessage(ethPrice, polyPrice, spread) {
    const timestamp = new Date().toLocaleString();
    
    return `
🚨 <b>ARBITRAGE OPPORTUNITY DETECTED!</b> 🚨

⏰ <b>Time:</b> ${timestamp}
💰 <b>ETH Mainnet:</b> $${ethPrice.toFixed(2)}
💎 <b>Polygon ETH:</b> $${polyPrice.toFixed(2)}
📊 <b>Spread:</b> $${spread.toFixed(2)}

🔥 <b>PROFIT OPPORTUNITY!</b>
👉 Visit <a href="https://ghostswap.app">ghostswap.app</a> to execute your Cross Network Exchange.

    `;
}

async function getPrices() {
    console.log(`\n--- Checking Cross-Chain Prices [${new Date().toLocaleTimeString()}] ---`);
    
    try {
        const ethFeed = new ethers.Contract(ETH_FEED_ADDR, aggregatorV3InterfaceABI, ethProvider);
        const polyFeed = new ethers.Contract(POLY_FEED_ADDR, aggregatorV3InterfaceABI, polyProvider);

        // Fetching both simultaneously to ensure timing accuracy
        const [ethData, polyData] = await Promise.all([
            ethFeed.latestRoundData(),
            polyFeed.latestRoundData()
        ]);

        // Chainlink prices have 8 decimals
        const priceETH = Number(ethData.answer) / 100000000;
        const pricePOLY = Number(polyData.answer) / 100000000;
        const spread = Math.abs(priceETH - pricePOLY);

        console.log(`ETH Mainnet: $${priceETH.toFixed(2)}`);
        console.log(`Polygon ETH: $${pricePOLY.toFixed(2)}`);
        console.log(`Current Spread: $${spread.toFixed(2)}`);

        if (spread > 20) { // Adjusted threshold
            console.log(`💰 PROFIT OPPORTUNITY! High spread detected.`);
            console.log(`Visit ghostswap.app to execute your Cross Network Exchange.`);
            
            // Send Telegram notification
            const message = formatProfitMessage(priceETH, pricePOLY, spread);
            await sendTelegramNotification(message);
            console.log('✅ Telegram notification sent!');
            
        } else {
            console.log(`Market is stable. No significant arbitrage gap.`);
        }

    } catch (error) {
        console.error("❌ Error fetching data:", error.message);
        console.log("Tip: Check if your Infura keys are active and addresses are correct.");
        
        // Optional: Send error notification to Telegram
        await sendTelegramNotification(`⚠️ <b>Bot Error:</b>\n${error.message}\nTime: ${new Date().toLocaleString()}`);
    }
}

// Run every 30 seconds
setInterval(getPrices, 30000);

// Run immediately on start
getPrices();