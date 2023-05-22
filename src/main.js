import {Telegraf, session, Markup} from "telegraf";
import {message} from "telegraf/filters";
import {code} from 'telegraf/format';
import config from 'config';
import {ogg} from './ogg.js';
import {openai} from './openai.js';

const INITIAL_SESSION = {
    messages: []
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session());

const botStates = {
    IDLE: 'idle', TYPING: 'typing',
};

let isBotRunning = false;

bot.on(message('voice'), async ctx => {
    const messageText = ctx.message.text;

    if (messageText === 'Старт') {
        ctx.session = {};
        ctx.session.botState = botStates.TYPING;
        await ctx.reply('Чекаю вашого повідомлення!)))', {
            reply_markup: {
                keyboard: [
                    [Markup.button.text('Старт')],
                    [Markup.button.text('Зупинити')]
                ],
                resize_keyboard: true
            }
        });
    } else if (messageText === 'Зупинити') {
        await ctx.reply('Робот завершено!');
        ctx.session = INITIAL_SESSION
        bot.stop();
    } else {
        ctx.session.messages = [];
        ctx.session ??= INITIAL_SESSION;
        try {
            const userId = String(ctx.message.from.id);

            const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
            const oggPath = await ogg.create(link.href, userId);
            const mp3Path = await ogg.toMp3(oggPath, userId);

            const text = await openai.transcription(mp3Path);
            await ctx.reply(code(`Ваш запит: ${text}`));

            ctx.session.messages.push({role: openai.roles.USER, content: text});
            const response = await openai.chat(ctx.session.messages);
            ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});

            await ctx.reply(response.content);
        } catch (error) {
            console.log(`Error while voice message`, error.message);
        }
    }
});
bot.on(message('text'), async (ctx) => {
    const messageText = ctx.message.text;

    if (messageText === 'Старт') {
        if (isBotRunning) {
            await ctx.reply('Бот вже запущено!');
        } else {
            ctx.session = {};
            ctx.session.botState = botStates.TYPING;
            await ctx.reply('Чекаю вашого повідомлення!)))', {
                reply_markup: {
                    keyboard: [
                        [Markup.button.text('Старт')],
                        [Markup.button.text('Зупинити')]
                    ],
                    resize_keyboard: true
                }
            });
            isBotRunning = true; // Встановлюємо флаг, що бот запущено
        }
    } else if (messageText === 'Зупинити') {
        if (isBotRunning) {
            await ctx.reply('Робот завершено!');
            ctx.session = INITIAL_SESSION;
            isBotRunning = false; // Встановлюємо флаг, що бот зупинено
        } else {
            await ctx.reply('Бот вже зупинено!');
        }
    } else {
        // Обробка повідомлень користувача
        if (!isBotRunning) {
            await ctx.reply('Бот не запущено!');
            return;
        }

        ctx.session ??= INITIAL_SESSION;
        try {
            ctx.session.messages = []; // Ініціалізація масиву повідомлень

            await ctx.reply(code('Повідомлення прийнято, чекаю відповідь від сервера...'));
            await ctx.reply(code('Зачекайте я пишу повідомлення...'));
            ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text});
            const response = await openai.chat(ctx.session.messages);

            ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});
            await ctx.reply(response.content);
        } catch (error) {
            console.log('Помилка під час обробки текстового повідомлення:', error.message);
        }
    }
});

bot.launch().then(() => {
    isBotRunning = true; // Встановлюємо флаг, що бот запущено
    console.log('Бот запущено!');
});


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
