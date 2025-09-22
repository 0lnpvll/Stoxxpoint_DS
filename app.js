// Supabase configuration
const SUPABASE_URL = 'https://hfqtqjjsagwcbhyzzrnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcXRxampzYWd3Y2JoeXp6cm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM1MDY0NjQsImV4cCI6MjAzOTA4MjQ2NH0.0LJ6N2u7eUT0lU6Deez5p6lJ9jNwL7pzN8n7J8lZ7kI';

// Initialize Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables
let stockData = [];
let currentTickerIndex = 0;

// DOM elements
const stockGrid = document.getElementById('stockGrid');
const tickerTape = document.getElementById('tickerTape');
const dataStatus = document.getElementById('dataStatus');
const lastUpdated = document.getElementById('lastUpdated');
const footerDate = document.getElementById('footerDate');
const methodologyText = document.getElementById('methodologyText');
const aboutText = document.getElementById('aboutText');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    loadTextFiles();
    loadExcelFile();
    updateFooterDate();
});

// Load text files
async function loadTextFiles() {
    try {
        // Load Methodology.txt
        const methodologyResponse = await fetch('Methodology.txt');
        if (methodologyResponse.ok) {
            const methodologyContent = await methodologyResponse.text();
            methodologyText.innerHTML = `<p>${methodologyContent.replace(/\n/g, '</p><p>')}</p>`;
        }
        
        // Load finviz.txt
        const finvizResponse = await fetch('finviz.txt');
        if (finvizResponse.ok) {
            const finvizContent = await finvizResponse.text();
            aboutText.innerHTML = `<p>${finvizContent.replace(/\n/g, '</p><p>')}</p>`;
        }
    } catch (error) {
        console.error("Error loading text files:", error);
        methodologyText.innerHTML = "<p>Methodology information not available.</p>";
        aboutText.innerHTML = "<p>About information not available.</p>";
    }
}

// Load initial data from points.xlsx
async function loadExcelFile() {
    showDataStatus("Loading stock data from points.xlsx...", "loading");
    
    try {
        // Use direct URL to file in Supabase Storage
        const fileUrl = 'https://hfqtqjjsagwcbhyzzrnp.supabase.co/storage/v1/object/public/uploads/points.xlsx';
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const jsonData = processExcelData(arrayBuffer);
        
        // Get file modification date from headers
        const lastModified = response.headers.get('last-modified');
        const fileDate = formatFileDate(lastModified);
        
        // Process data
        stockData = jsonData.map(item => {
            // Convert price
            let priceValue = item.price;
            if (typeof priceValue === 'string') {
                priceValue = priceValue.replace(',', '.').replace(/\s/g, '');
            }
            priceValue = parseFloat(priceValue);
            
            // Convert score
            let scoreValue = item.score;
            if (typeof scoreValue === 'string') {
                scoreValue = scoreValue.replace(/\D/g, '');
            }
            scoreValue = parseInt(scoreValue);
            
            return {
                ticker: item.ticker,
                company: item.company,
                price: isNaN(priceValue) ? 0 : priceValue,
                score: isNaN(scoreValue) ? 0 : scoreValue,
                label: item.label
            };
        });
        
        console.log("Successfully loaded stocks:", stockData);
        initTickerTape();
        renderStockCards();
        
        // Update last updated text
        lastUpdated.textContent = `Latest data calculated after market close on ${fileDate}`;
        showDataStatus("Data loaded successfully!", "success");
        
    } catch (error) {
        const errorMsg = `Error loading data: ${error.message}`;
        showDataStatus(errorMsg, "error");
        lastUpdated.textContent = "Data load failed!";
        console.error(errorMsg, error);
        
        // Load sample data if real data fails
        loadSampleData();
    }
}

// Process Excel data
function processExcelData(arrayBuffer) {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
        console.error("Error processing Excel data:", error);
        throw new Error("Failed to process Excel file");
    }
}

// Initialize ticker tape
function initTickerTape() {
    if (stockData.length === 0) return;
    
    // Create initial ticker tape content
    updateTickerTape();
    
    // Update ticker tape every 5 seconds
    setInterval(updateTickerTape, 5000);
}

// Update ticker tape with next stock
function updateTickerTape() {
    if (stockData.length === 0) return;
    
    const stock = stockData[currentTickerIndex];
    const scoreClass = getScoreClass(stock.score);
    
    tickerTape.innerHTML = `
        <span class="ticker">${stock.ticker}</span>
        <span class="price">$${stock.price.toFixed(2)}</span>
        <span class="score ${scoreClass}">${stock.score}</span>
    `;
    
    // Move to next stock, loop back to start if needed
    currentTickerIndex = (currentTickerIndex + 1) % stockData.length;
}

// Render stock cards in grid
function renderStockCards() {
    stockGrid.innerHTML = '';
    
    stockData.forEach(stock => {
        const scoreClass = getScoreClass(stock.score);
        
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.innerHTML = `
            <div class="stock-header">
                <div class="ticker">${stock.ticker}</div>
                <div class="company">${stock.company}</div>
            </div>
            <div class="stock-price">$${stock.price.toFixed(2)}</div>
            <div class="stock-score ${scoreClass}">Score: ${stock.score}</div>
            <div class="stock-label">${stock.label || 'No label'}</div>
        `;
        
        stockGrid.appendChild(card);
    });
}

// Get CSS class based on score value
function getScoreClass(score) {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
}

// Show data status message
function showDataStatus(message, type) {
    dataStatus.textContent = message;
    dataStatus.className = '';
    
    switch (type) {
        case 'loading':
            dataStatus.classList.add('status-loading');
            break;
        case 'success':
            dataStatus.classList.add('status-success');
            break;
        case 'error':
            dataStatus.classList.add('status-error');
            break;
    }
}

// Format file date
function formatFileDate(dateString) {
    if (!dateString) return 'unknown date';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return 'unknown date';
    }
}

// Update footer date
function updateFooterDate() {
    const now = new Date();
    footerDate.textContent = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Load sample data if real data fails
function loadSampleData() {
    console.log("Loading sample data...");
    
    stockData = [
        { ticker: "AAPL", company: "Apple Inc.", price: 175.34, score: 82, label: "Strong Buy" },
        { ticker: "MSFT", company: "Microsoft Corp.", price: 338.11, score: 78, label: "Buy" },
        { ticker: "GOOGL", company: "Alphabet Inc.", price: 139.23, score: 75, label: "Buy" },
        { ticker: "AMZN", company: "Amazon.com Inc.", price: 145.18, score: 68, label: "Moderate Buy" },
        { ticker: "TSLA", company: "Tesla Inc.", price: 238.59, score: 62, label: "Hold" },
        { ticker: "JPM", company: "JPMorgan Chase & Co.", price: 155.21, score: 71, label: "Buy" }
    ];
    
    renderStockCards();
    initTickerTape();
    
    lastUpdated.textContent = "Using sample data - last update unknown";
    showDataStatus("Using sample data", "success");
}