import {Telegraf, Markup, session} from "telegraf";
import {message} from "telegraf/filters";
import {code} from 'telegraf/format';
import config from 'config';
import {auth} from "./auth.js";
import {openai} from './openai.js';

const INITIAL_SESSION = {
    messages: []
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session());

let isBotRunning = false;

bot.command(('start'), async (ctx) => {
    const user = await auth.getUserByToken(ctx.from.id);
    let userBot = '';
    if (!user) {
        auth.saveUserToken(ctx.from, ctx.telegram.token);
        userBot = new Telegraf(ctx.telegram.token);
        userBot.start();
    } else {
        userBot = new Telegraf(user.token);
        userBot.start();
    }
    await ctx.reply(`Привіт ${user.user.username}`);
    isBotRunning = true;
});


bot.command('cache', (ctx) => {
    const chatId = ctx.chat.id;

    // Пусте повідомлення
    const messageText = 'Кеш очищено.';
    const replyMarkup = {
        remove_keyboard: true,
    };

    // Відправляємо нове повідомлення з пустою клавіатурою
    ctx.reply(messageText, {reply_markup: replyMarkup});
});


// userBot.hears('Старт', (ctx) => {
//     ctx.reply('Робот розпочато!');
// });
//
// userBot.hears('Зупинити', (ctx) => {
//     ctx.reply('Робот зупинено!');
// });


//
// bot.on(message('voice'), async ctx => {
//     const messageText = ctx.message.text;
//
//     if (messageText === 'Старт') {
//         ctx.session = {};
//         ctx.session.botState = botStates.TYPING;
//         await ctx.reply('Чекаю вашого повідомлення!)))', {
//             reply_markup: {
//                 keyboard: [
//                     [Markup.button.text('Старт')],
//                     [Markup.button.text('Зупинити')]
//                 ],
//                 resize_keyboard: true
//             }
//         });
//     } else if (messageText === 'Зупинити') {
//         await ctx.reply('Робот завершено!');
//         ctx.session = INITIAL_SESSION
//         bot.stop();
//     } else {
//         ctx.session.messages = [];
//         ctx.session ??= INITIAL_SESSION;
//         try {
//             const userId = String(ctx.message.from.id);
//
//             const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
//             const oggPath = await ogg.create(link.href, userId);
//             const mp3Path = await ogg.toMp3(oggPath, userId);
//
//             const text = await openai.transcription(mp3Path);
//             await ctx.reply(code(`Ваш запит: ${text}`));
//
//             ctx.session.messages.push({role: openai.roles.USER, content: text});
//             const response = await openai.chat(ctx.session.messages);
//             ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});
//
//             await ctx.reply(response.content);
//         } catch (error) {
//             console.log(`Error while voice message`, error.message);
//         }
//     }
// });

bot.on(message('text'), async (ctx) => {
    try {
        if (isBotRunning) {
            ctx.session ??= INITIAL_SESSION;
            ctx.session.messages = [];

            await ctx.reply(code('Повідомлення прийнято, чекаю відповідь від сервера...'));
            await ctx.reply(code('Зачекайте я пишу повідомлення...'));
            ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text});
            const response = await openai.chat(ctx.session.messages);

            ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});
            await ctx.reply(response.content);
        } else {
            await ctx.reply('Бот не запущений ведіть команду /start');
        }
    } catch (error) {
        console.log('Помилка під час обробки текстового повідомлення:', error.message);
    }
});

bot.startPolling().then(() => {
    console.log('Працюю!');
}).catch(e => {
    console.log(e);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
