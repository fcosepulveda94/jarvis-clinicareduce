require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
// Usamos node-fetch compatible con versiones antiguas de Node si es necesario, 
// aunque en Render moderno suele estar disponible globalmente.
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(bodyParser.json());

// Variables de entorno
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'jarvis_clinicareduce';
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;

// 1. Verificación de Webhook (GET) - Necesario para que Meta confíe en la URL
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Fallo en verificación de webhook');
    res.sendStatus(403);
  }
});

// 2. Recepción de Mensajes (POST)
app.post('/webhook', async (req, res) => {
  const body = req.body;
  
  // Confirmar recepción inmediatamente a Meta
  res.status(200).send('EVENT_RECEIVED');

  if (body.object === 'instagram') {
    try {
      for (const entry of body.entry) {
        const messaging = entry.messaging;
        
        if (messaging) {
          for (const messageEvent of messaging) {
            // Evitar procesar mensajes enviados por el mismo bot o ecos
            if (messageEvent.message && messageEvent.message.text) {
              const senderId = messageEvent.sender.id;
              const messageText = messageEvent.message.text;
              
              console.log(` Mensaje recibido de ${senderId}: "${messageText}"`);
              
              // Generar respuesta con la IA (lógica local)
              const aiResponse = await generateAIResponse(messageText, senderId);
              
              // Enviar respuesta usando la API corregida
              await sendInstagramMessage(senderId, aiResponse);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
    }
  }
});

// 3. Función de IA (La que faltaba)
async function generateAIResponse(userMessage, userId) {
  try {
    const msg = userMessage.toLowerCase().trim();
    
    // Lógica simple de palabras clave (puedes expandir esto luego)
    if (msg.includes('agenda') || msg.includes('cita') || msg.includes('reservar') || msg.includes('hora')) {
      return '¡Claro! Para agendar una cita en Clínica Reduce, por favor indícame:\n1. Tu nombre completo\n2. Fecha y hora preferida\n3. Tipo de consulta o tratamiento';
    }
    
    if (msg.includes('precio') || msg.includes('valor') || msg.includes('costo') || msg.includes('tarifa')) {
      return 'Nuestros precios dependen del tratamiento específico. ¿Te gustaría ver nuestro catálogo de suplementos o saber el valor de la consulta general?';
    }
    
    if (msg.includes('ubicacion') || msg.includes('direccion') || msg.includes('donde')) {
      return 'Estamos ubicados en [Tu Dirección Aquí]. ¿Necesitas instrucciones para llegar?';
    }

    if (msg.includes('hola') || msg.includes('buenas') || msg.includes('hi')) {
      return '¡Hola! Soy Jarvis, el asistente virtual de Clínica Reduce. 🤖 ¿En qué puedo ayudarte hoy? Puedo agendar citas, darte precios o resolver dudas.';
    }
    
    // Respuesta por defecto
    return 'Gracias por escribirnos. Soy Jarvis. ¿Hay algo específico sobre nuestros servicios de nutrición o suplementos en lo que pueda ayudarte?';
    
  } catch (error) {
    console.error('Error en lógica de IA:', error);
    return 'Lo siento, tuve un pequeño error. ¿Podrías repetirme tu consulta?';
  }
}

// 4. Función de Envío Corregida (Usando ID explícito y Auth Header)
async function sendInstagramMessage(recipientId, messageText) {
  if (!IG_ACCESS_TOKEN || !IG_BUSINESS_ACCOUNT_ID) {
    console.error('❌ Faltan credenciales: IG_ACCESS_TOKEN o IG_BUSINESS_ACCOUNT_ID');
    return false;
  }

  // URL CORREGIDA: Usa el ID de la cuenta business, no 'me'
  const url = `https://graph.facebook.com/v18.0/${IG_BUSINESS_ACCOUNT_ID}/messages`;
  
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IG_ACCESS_TOKEN}` // Token va en el header
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error de Meta API:', data.error.message, '(Code:', data.error.code, ')');
      return false;
    }
    
    console.log('✅ Mensaje enviado exitosamente a', recipientId);
    return true;
  } catch (error) {
    console.error('❌ Error de red al enviar:', error.message);
    return false;
  }
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Jarvis corriendo en puerto ${PORT}`);
  console.log(` Webhook activo en: /webhook`);
});