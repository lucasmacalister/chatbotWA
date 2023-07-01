const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config();

const client = new Client();
let accessToken;

// Função para obter o token de autenticação do cliente
const getClientToken = async () => {
  try {
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      qs.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID,
        scope: 'https://graph.microsoft.com/.default',
        client_secret: process.env.CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return tokenResponse.data.access_token;
  } catch (error) {
    throw new Error('Falha ao obter o token do cliente');
  }
};

// Função para verificar a conexão estável com o SharePoint
const checkSharePointConnection = async () => {
  try {
    const accessToken = await getClientToken();

    // Obter informações do site do SharePoint
    const siteResponse = await axios.get('https://graph.microsoft.com/v1.0/sites/macallister.sharepoint.com:/sites/procesos', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const siteId = siteResponse.data.id;

    // Obter listas do site do SharePoint
    const listsResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    // Procurar pela lista "Actividades"
    const list = listsResponse.data.value.find(item => item.displayName === 'Actividades');

    if (!list) {
      throw new Error('A lista "Actividades" não foi encontrada.');
    }

    const listId = list.id;

    // Obter um registro da lista "Actividades"
    const recordResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const record = recordResponse.data;

    console.log('Conexão com o SharePoint estabelecida');

    return true;
  } catch (error) {
    console.log('Falha ao conectar ao SharePoint:', error.message);
    return false;
  }
};

// Evento 'qr' - exibe o código QR e aguarda a leitura
client.on('qr', (qr) => {
  console.log('Por favor, escaneie o código QR abaixo usando o aplicativo do WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Evento 'authenticated' - chamado quando a autenticação é concluída
client.on('authenticated', async (session) => {
  console.log('Autenticado com sucesso no WhatsApp');

  // Verificar a conexão com o SharePoint antes de prosseguir
  const isSharePointConnected = await checkSharePointConnection();

  if (isSharePointConnected) {
    // Restante do código após a autenticação e conexão estável com o SharePoint

    // Lógica de resposta às mensagens do WhatsApp
    client.on('message', async (message) => {
      console.log('Mensagem recebida:', message.body);

      if (message.body.toLowerCase() === 'oi') {
        message.reply('Qual é o ID?');

        // Ouvir a resposta do usuário
        const responseListener = client.on('message', async (response) => {
          if (response.body.startsWith('ID: ')) {
            const id = response.body.substring(4);
            const fieldValue = await getListRecordById(id);
            if (fieldValue) {
              message.reply(`Valor do campo "Descricao_Actividad": ${fieldValue}`);
            } else {
              message.reply('ID não encontrado.');
            }
            // Remover o ouvinte de resposta para evitar respostas múltiplas
            responseListener();
          }
        });
      }
    });
  } else {
    // Encerrar a execução do programa caso a conexão com o SharePoint falhe
    process.exit(1);
  }
});

// Evento 'auth_failure' - chamado quando a autenticação falha
client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação no WhatsApp', msg);
  process.exit(1);
});

// Função para obter o registro da lista "Actividades" pelo ID
const getListRecordById = async (id) => {
  try {
    if (!accessToken) {
      accessToken = await getClientToken();
    }

    const siteResponse = await axios.get('https://graph.microsoft.com/v1.0/sites/macallister.sharepoint.com:/sites/procesos', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const siteId = siteResponse.data.id;

    const listsResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const list = listsResponse.data.value.find(item => item.displayName === 'Actividades');

    if (!list) {
      console.log('A lista "Actividades" não foi encontrada.');
      return null;
    }

    const listId = list.id;

    const recordResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const record = recordResponse.data;

    return record.fields.Descripcion_Actividad;
  } catch (error) {
    console.log('Falha ao obter o registro da lista:', error.message);
    return null;
  }
};

// Inicializar o cliente WhatsApp
client.initialize();
