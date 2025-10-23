import { spawn } from 'child_process';

const server = spawn('node', ['build/index.js']);

// List tools
const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
};

server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

server.stdout.on('data', (data) => {
    console.log('Response:', data.toString());
});

// Query tool
setTimeout(() => {
    const queryRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'query',
            arguments: { prompt: '안녕하세요' }
        }
    };

    server.stdin.write(JSON.stringify(queryRequest) + '\n');
}, 1000);