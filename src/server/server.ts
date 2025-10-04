import { WebSocketServer, WebSocket } from 'ws';
import { getMiners, addMiner, removeMiner, updateMiner } from './state';

export const startWebSocketServer = (server: any) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Send the initial state to the client
    ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload: { miners: getMiners() } }));

    ws.on('message', (message: string) => {
      try {
        const { type, payload } = JSON.parse(message);

        switch (type) {
          case 'ADD_MINER':
            addMiner(payload);
            broadcastState();
            break;
          case 'REMOVE_MINER':
            removeMiner(payload);
            broadcastState();
            break;
          case 'UPDATE_MINER':
            updateMiner(payload);
            broadcastState();
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  const broadcastState = () => {
    const state = { type: 'UPDATE_STATE', payload: { miners: getMiners() } };
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(state));
      }
    });
  };
};
