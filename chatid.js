const TelegramBot = require('node-telegram-bot-api');
const { 
  existsSync,
  readFileSync
} = require('fs');

if (!existsSync('config_tele.json')) return console.log(chalk.red(`config_tele.json File Not Found!`))
const config = JSON.parse(readFileSync('config_tele.json', {encoding: 'utf-8'}))
const token = config.token; 
 
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
    console.log(msg)
  const chatId = msg.chat.id;
 
  bot.sendMessage(chatId, 'Chat id -> ' + chatId);
});
