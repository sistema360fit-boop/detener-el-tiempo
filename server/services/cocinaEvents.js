// server/services/cocinaEvents.js
// Servicio de Server-Sent Events (SSE) para actualizaciones en tiempo real a la cocina

const clients = new Set();

/**
 * Registra un nuevo cliente SSE de cocina.
 * @param {import('express').Response} res
 */
export function addClient(res) {
  clients.add(res);
  console.log(`[SSE Cocina] Cliente conectado. Total: ${clients.size}`);

  res.on('close', () => {
    clients.delete(res);
    console.log(`[SSE Cocina] Cliente desconectado. Total: ${clients.size}`);
  });
}

/**
 * Envía un evento a todos los clientes conectados.
 * @param {'nueva_comanda' | 'comanda_actualizada' | 'plato_agregado' | 'comanda_pagada'} tipo
 * @param {object} payload
 */
export function broadcastCocina(tipo, payload = {}) {
  const data = JSON.stringify({ tipo, payload, timestamp: Date.now() });

  for (const client of clients) {
    try {
      client.write(`event: cocina\ndata: ${data}\n\n`);
    } catch {
      clients.delete(client);
    }
  }

  console.log(`[SSE Cocina] Broadcast "${tipo}" → ${clients.size} clientes`);
}
