const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client();

// Evento 'qr' - exibe o código QR e aguarda a leitura
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

// Evento 'authenticated' - chamado quando a autenticação é concluída
client.on('authenticated', (session) => {
  console.log('Autenticado com sucesso');
  // Salvar a sessão para uso posterior
  // Exemplo: salvar a sessão em um arquivo
  // fs.writeFileSync('session.json', JSON.stringify(session));
});

// Evento 'auth_failure' - chamado quando a autenticação falha
client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg);
});

// Carregar a sessão salva (opcional)
// Exemplo: carregar a sessão de um arquivo
// const sessionFile = require('./session.json');
// client.initialize(sessionFile);


// Evento 'message' - chamado quando uma nova mensagem é recebida
client.on('message', (message) => {
  console.log('Mensagem recebida:', message.body);

  // Responder à mensagem
  if (message.body === 'Oi') {
    message.reply('Olá! Como posso ajudar?Teste');
  }
});

// Inicializar o cliente WhatsApp

client.initialize();
