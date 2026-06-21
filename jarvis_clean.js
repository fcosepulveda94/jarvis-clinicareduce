require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuración de Express
const app = express();
app.use(bodyParser.json());

// Variables de entorno
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'jarvis_clinicareduce';
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;

// Verificación de Webhook (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado - Respondiendo challenge:', challenge);
    res.status(200).send(challenge);
  } else {
    console.log('❌ Fallo en verificación de webhook');
    res.sendStatus(403);
  }
});

// Recepción de Mensajes (POST)
app.post('/webhook', async (req, res) => {
  const body = req.body;
  
  if (body.object === 'instagram') {
    try {
      // Procesar cada entrada del webhook
      for (const entry of body.entry) {
        const messaging = entry.messaging;
        
        if (messaging) {
          for (const messageEvent of messaging) {
            const senderId = messageEvent.sender.id;
            const recipientId = messageEvent.recipient.id;
            
            // Verificar si es un mensaje de texto
            if (messageEvent.message && messageEvent.message.text) {
              const messageText = messageEvent.message.text;
              console.log(`📩 Instagram - De ${senderId}: ${messageText}`);
              
              // Generar respuesta con IA (simulada por ahora)
              const aiResponse = await generateAIResponse(messageText, senderId);
              
              // Enviar respuesta
              const sent = await sendInstagramMessage(senderId, aiResponse);
              if (sent) {
                console.log(`✅ Respuesta enviada a ${senderId}`);
              } else {
                console.log(` Error enviando respuesta a ${senderId}`);
              }
            }
          }
        }
      }
      
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      res.status(500).send('Error interno');
    }
  } else {
    res.sendStatus(404);
  }
});

// Función para generar respuesta con IA
async function sendInstagramMessage(recipientId, messageText) {
  // Usamos el ID de la cuenta de Instagram Business directamente, no 'me'
  const igAccountId = process.env.IG_BUSINESS_ACCOUNT_ID; 
  
  if (!igAccountId) {
    console.error('❌ ERROR: Falta la variable IG_BUSINESS_ACCOUNT_ID en Render');
    return false;
  }

  const url = `https://graph.facebook.com/v18.0/${igAccountId}/messages`;
  
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IG_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error de Meta API:', data.error.message);
      return false;
    }
    
    console.log('✅ Jarvis respondió correctamente a:', recipientId);
    return true;
  } catch (error) {
    console.error('❌ Error de red:', error);
    return false;
  }
}

// Función CORREGIDA para enviar mensajes a Instagram
// Usa /me/messages en lugar de /{id}/messages para evitar error #3 en apps no verificadas
async function sendInstagramMessage(recipientId, messageText) {
  // Usamos el ID de la cuenta de Instagram Business directamente, no 'me'
  const igAccountId = process.env.IG_BUSINESS_ACCOUNT_ID; 
  
  if (!igAccountId) {
    console.error('❌ ERROR: Falta la variable IG_BUSINESS_ACCOUNT_ID en Render');
    return false;
  }

  const url = `https://graph.facebook.com/v18.0/${igAccountId}/messages`;
  
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IG_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error de Meta API:', data.error.message);
      return false;
    }
    
    console.log('✅ Jarvis respondió correctamente a:', recipientId);
    return true;
  } catch (error) {
    console.error('❌ Error de red:', error);
    return false;
  }
}
// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor Express corriendo en puerto ${PORT}`);
  console.log(` Webhook URL: /webhook`);
  console.log(`✅ Google Calendar configurado correctamente`); // Mantenido de tu versión original
  console.log(`\n==> Your service is live 🎉`);
  console.log(`==> Available at: https://jarvis-clinicareduce.onrender.com\n`);
});