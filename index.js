const { 
    withFbns
} = require('instagram_mqtt');
const {
    IgApiClient,
    IgCheckpointError, 
} = require('instagram-private-api');
const {
    promisify
} = require('util');
const {
    writeFile,
    readFile,
    exists,
    existsSync,
    readFileSync
} = require('fs');
const {
    question
} = require('readline-sync')
const chalk = require('chalk');
const Bluebird = require('bluebird');
const inquirer = require('inquirer');
const TelegramBot = require('node-telegram-bot-api');

if (!existsSync('config_tele.json')) return console.log(chalk.red(`config_tele.json File Not Found!`))
const config = JSON.parse(readFileSync('config_tele.json', {encoding: 'utf-8'}))
const token = config.token; 

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

var bigInt = require("big-integer");
const {
    delay
} = require('bluebird');
 
console.log(chalk.yellow(`
█████  ██    ██ ████████  ██████       ██████  ██████  ███    ███ ███    ███ ███████ ███    ██ ████████ 
██   ██ ██    ██    ██    ██    ██     ██      ██    ██ ████  ████ ████  ████ ██      ████   ██    ██    
███████ ██    ██    ██    ██    ██     ██      ██    ██ ██ ████ ██ ██ ████ ██ █████   ██ ██  ██    ██    
██   ██ ██    ██    ██    ██    ██     ██      ██    ██ ██  ██  ██ ██  ██  ██ ██      ██  ██ ██    ██    
██   ██  ██████     ██     ██████       ██████  ██████  ██      ██ ██      ██ ███████ ██   ████    ██    
                                                                                                         
                                                                                                         
- Script Auto Comment Realtime!
- Script Created By : AREL TIYAN (SGB TEAM) @10-2020
`));

const IG_USERNAME = question(`- IG Username : `);
const IG_PASSWORD = question(`- IG Password : `);
const limit_today = question(`- Action Limit : `);
const delay_limit = question(`- Delay After Limit (minute) : `);
const nama_comment = question(`- Name File Comment : `);
const nama_target = question(`- Name File Target : `);
const nama_filter = question(`- Name File Filter : `);
const notif_tele =  question(`- Notif Tele? y/n : `);
const chatId_tele = notif_tele == 'y' ? config.chatId : '';

const telegram_bot = notif_tele == 'y' ? new TelegramBot(token, {
    polling: true
}) : null;

(async () => {
    try {
        if (!IG_USERNAME || !IG_PASSWORD || !limit_today || !delay_limit || !nama_comment || !nama_target || !notif_tele) return console.log(chalk.red(`Check Field Again!`))
        if (!await existsAsync(nama_comment)) return console.log(chalk.red(`@Comment File Not Found!`))
        if (!await existsAsync(nama_target)) return console.log(chalk.red(`@Target File Not Found!`))
        if (!await existsAsync(nama_filter)) return console.log(chalk.red(`@Filter File Not Found!`))

        const read_comment = await readFileAsync(nama_comment, {
            encoding: 'utf-8'
        })
        var comment = read_comment.includes('\r\n') ? read_comment.split('\r\n') : read_comment.split('\n')
    
        const read_target = await readFileAsync(nama_target, {
            encoding: 'utf-8'
        }) 
        var target = read_target.includes('\r\n') ? read_target.split('\r\n') : read_target.split('\n')

        const read_filter = await readFileAsync(nama_filter, {
            encoding: 'utf-8'
        })
        var filter = read_filter.includes('\r\n') ? read_filter.split('\r\n') : read_filter.split('\n') 
        
        const ig = withFbns(new IgApiClient());
        ig.state.generateDevice(IG_USERNAME); 
        //await readState(ig);
    
        await login(ig);
    
        let action = 0;
        let enabled = 1; 
        ig.fbns.on('push', async (push) => { 
            try {  
                if (push.pushCategory && push.pushCategory == 'post') {
                    if (target.includes(push.message.split(' ')[0])) {
                        if (action == parseInt(limit_today, 10)) {
                            const logs = `Max action reached today! Total comment ${action}! Delay ${delay_limit}m`
                            console.log(chalk.red(logs))
                            if (notif_tele == 'y') await telegram_bot.sendMessage(chatId_tele, logs)
                            enabled = 0;
                            await delay(parseInt(delay_limit, 10) * 60000);
                            enabled = 1;
                            action = 1;
                        }
                        if (enabled) {
                            const checkInfo = await ig.media.info(push.actionParams.media_id)    
                            if(checkInfo.items[0].caption == null || checkInfo.items[0].caption != null && ArrayIncludes(filter, checkInfo.items[0].caption.text) != true)
                            {
                                var timeNow = new Date();
                                timeNow = `${timeNow.getHours()}:${timeNow.getMinutes()}:${timeNow.getSeconds()}`
                                const text = getRandomText(comment)
                                const publishComment = await ig.media.comment({
                                    mediaId: push.actionParams.media_id,
                                    text: text
                                })
                                const publishLike = await ig.media.like({
                                    mediaId: push.actionParams.media_id,
                                    moduleInfo: {
                                        module_name: 'profile'
                                    }
                                })
                                action++
                                const log = `------[${timeNow}]------ \n${push.message}\nLike -> [ ${publishLike && publishLike.status =='ok' ? 'success': 'failed'} ] \nComment -> [ ${publishComment && publishComment.status == 'Active'?text:'failed'} ] \nUrl -> ${getInstagramUrlFromMediaId(push.actionParams.media_id)}\nUser -> ${push.message.split(' ')[0]} | Action Success ${action}\n-----------------------\nWaiting new post . . .\n`
                                if (notif_tele == 'y') await telegram_bot.sendMessage(chatId_tele, log)
                                console.log(chalk.magenta(log))
                            }else{
                                const log = `------[${timeNow}]------ \n${push.message}\nLike -> [ filter detected ] \nComment -> [ filter detected ] \nUrl -> ${getInstagramUrlFromMediaId(push.actionParams.media_id)}\nUser -> ${push.message.split(' ')[0]}\n-----------------------\nWaiting new post . . .\n`
                                if (notif_tele == 'y') await telegram_bot.sendMessage(chatId_tele, log)
                                console.log(chalk.red(log))
                            }
                            
                        }
        
                    }
                }   
            } catch (error) {
                console.log(error)
            }
        });
    
    
        ig.fbns.on('auth', async (auth) => {  
            //console.log(auth)
            console.log(chalk.green('Login success . . . ' + auth.userId))
            console.log(chalk.yellow(`Detected Count Target -> [ ${target.length} ]`))
            console.log(chalk.yellow(`Detected Count Comment -> [ ${comment.length} ]`))
            console.log(chalk.green('Waiting new post . . . \n'))
            if (notif_tele == 'y') await telegram_bot.sendMessage(chatId_tele, `Login Success !\nDetected Count Target -> [ ${target.length} ]\nDetected Count Comment -> [ ${comment.length} ]`)
            await saveState(ig);
        });
    
        ig.fbns.on('error', async (err) => { 
            console.log(err)
        });
    
        ig.fbns.on('warning', async (warning) => {
            console.log(warning)
        });

        ig.fbns.on('disconnect', async (dc) => {
            console.log(dc) 
        });
    
        await ig.fbns.connect();   
    } catch (error) {
        console.log(error)
    }
})();

function ArrayIncludes(a, b)
{
    for(let i = 0; i<a.length;i++)
    {
        if(b.includes(a[i])) return true;
    } 
    return false;
}

function getInstagramUrlFromMediaId(media_id) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var shortenedId = '';
    media_id = media_id.substring(0, media_id.indexOf('_'));

    while (media_id > 0) {
        var remainder = bigInt(media_id).mod(64);
        media_id = bigInt(media_id).minus(remainder).divide(64).toString();
        shortenedId = alphabet.charAt(remainder) + shortenedId;
    }

    return 'https://www.instagram.com/p/' + shortenedId + '/';
}

function getRandomText(id) {
    var raNdText = id[Math.floor(Math.random() * id.length)];
    return raNdText;
}

async function saveState(ig) {
    return writeFileAsync('state.json', await ig.exportState(), {
        encoding: 'utf8'
    });
}

async function readState(ig) {
    if (!await existsAsync('state.json'))
        return;
    await ig.importState(await readFileAsync('state.json', {
        encoding: 'utf8'
    }));
}

async function login(ig) {
    return new Promise((resolve, reject) => {
        Bluebird.try(async () => {
            ig.request.end$.subscribe(() => saveState(ig));
            const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
            resolve(auth)
        }).catch(IgCheckpointError, async () => {
            console.log(ig.state.checkpoint); // Checkpoint info here
            await ig.challenge.selectVerifyMethod(1, false); // Requesting sms-code or click "It was me" button
            console.log(ig.state.checkpoint); // Challenge info here
            console.log(chalk.green('[+++] Check OTP Email'))
            const {
                code
            } = await inquirer.prompt([{
                type: 'input',
                name: 'code',
                message: 'Enter code',
            }, ]);

            const end = await ig.challenge.sendSecurityCode(code)
            await ig.request.end$.subscribe(() => saveState(ig));
            resolve(end);
        }).catch(e => console.log(chalk.red('Could not resolve checkpoint:', e, e.stack)));
    });
}

async function loginToInstagram(ig) {
    ig.request.end$.subscribe(() => saveState(ig));
    await ig.account.login(IG_USERNAME, IG_PASSWORD);
}

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function logEvent(name) {
    return (data) => console.log(name, data);
}