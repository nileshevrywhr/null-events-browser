const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class APIServer {
    constructor(port = 3001) {
        this.port = port;
        this.server = null;
    }

    start() {
        this.server = http.createServer((req, res) => {
            // Enable CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            if (req.url === '/api/update' && req.method === 'POST') {
                this.handleUpdate(req, res);
            } else if (req.url === '/api/status' && req.method === 'GET') {
                this.handleStatus(req, res);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });

        this.server.listen(this.port, () => {
            console.log(`🚀 API Server running on http://localhost:${this.port}`);
            console.log('📡 Available endpoints:');
            console.log(`   POST http://localhost:${this.port}/api/update - Trigger manual update`);
            console.log(`   GET  http://localhost:${this.port}/api/status - Get update status`);
        });
    }

    async handleUpdate(req, res) {
        console.log('🔄 Manual update requested via API');
        
        try {
            // Run the update script
            const updateProcess = spawn('node', ['update-events.js'], {
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            updateProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            updateProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            updateProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Update completed successfully');
                    
                    // Read the update summary
                    try {
                        const summaryPath = './public/data/update-summary.json';
                        let summary = { newEvents: 0, newSessions: 0, timestamp: new Date().toISOString() };
                        
                        if (fs.existsSync(summaryPath)) {
                            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
                        }
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: 'Update completed successfully',
                            summary: summary,
                            output: output
                        }));
                    } catch (error) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: 'Update completed but could not read summary',
                            output: output
                        }));
                    }
                } else {
                    console.error('❌ Update failed with code:', code);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Update failed',
                        error: errorOutput,
                        output: output
                    }));
                }
            });

            updateProcess.on('error', (error) => {
                console.error('❌ Failed to start update process:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Failed to start update process',
                    error: error.message
                }));
            });

        } catch (error) {
            console.error('❌ Update API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: error.message
            }));
        }
    }

    handleStatus(req, res) {
        try {
            const summaryPath = './public/data/update-summary.json';
            let summary = { 
                newEvents: 0, 
                newSessions: 0, 
                timestamp: new Date().toISOString(),
                message: 'No update summary available'
            };
            
            if (fs.existsSync(summaryPath)) {
                summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
                summary.message = 'Update summary loaded successfully';
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                summary: summary,
                serverTime: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Failed to get status',
                error: error.message
            }));
        }
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 API Server stopped');
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new APIServer();
    server.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down API server...');
        server.stop();
        process.exit(0);
    });
}

module.exports = APIServer;
