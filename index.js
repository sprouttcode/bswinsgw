/**
 * BSWinsGW - Brawl Stars & Multi-Game Giveaway Win Notifier
 * Versione Mobile per Revenge Discord Client
 * 
 * Creato da: sproutt
 * Versione: 1.2.0
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURAZIONE - MODIFICA QUESTI VALORI
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    // Il tuo Webhook Discord
    WEBHOOK_URL: "https://discord.com/api/webhooks/1498700349354021037/Ysrj6Z-nI1fImWzLLO4AXZnM0fb2Zd1Jl1KJZlztKXDQ8KzXEYLsXquuMdLy5CDOhm1T",
    
    // Il tuo topic Ntfy
    NTFY_TOPIC: "bsenrihgiveawayswins",
    
    // Abilita/disabilita notifiche
    USE_WEBHOOK: true,
    USE_NTFY: true,
    
    // Soglia di confidenza (30-100)
    CONFIDENCE_THRESHOLD: 50
};

// ═══════════════════════════════════════════════════════════════
// KEYWORDS MULTILINGUA
// ═══════════════════════════════════════════════════════════════

const WIN_KEYWORDS = {
    italian: [
        "hai vinto", "congratulazioni! hai vinto", "sei il vincitore",
        "premio vinto", "giveaway vinto", "sei stato estratto",
        "ritira il premio", "rivendica il premio", "dm per il premio",
        "gemme vinte", "brawl pass vinto"
    ],
    english: [
        "you won", "you've won", "you have won", "congratulations! you won",
        "you are the winner", "prize won", "claim your prize",
        "you have been selected", "winner:", "has won", "giveaway won",
        "won gems", "brawl pass won"
    ],
    german: [
        "du hast gewonnen", "herzlichen glückwunsch", "du bist der gewinner",
        "preis gewonnen", "ausgewählt worden", "gewinner:"
    ],
    french: [
        "tu as gagné", "vous avez gagné", "félicitations",
        "tu es le gagnant", "prix gagné", "réclame ton prix"
    ],
    spanish: [
        "has ganado", "ganaste", "felicidades! ganaste",
        "eres el ganador", "premio ganado", "reclama tu premio"
    ]
};

const GIVEAWAY_BOTS = [
    "giveawaybot", "giveaway bot", "santa", "dyno", "mee6",
    "carl-bot", "carlbot", "tatsumaki", "gaway", "wick",
    "arcane", "dank memer", "gleam", "lottery", "raffle"
];

const BRAWL_STARS_KEYWORDS = [
    "brawl stars", "brawlstars", "gems", "gemme",
    "brawl pass", "brawlpass", "skin", "brawler", "supercell"
];

// ═══════════════════════════════════════════════════════════════
// VARIABILI GLOBALI
// ═══════════════════════════════════════════════════════════════

let currentUser = null;
let messageHandler = null;

// ═══════════════════════════════════════════════════════════════
// FUNZIONI HELPER
// ═══════════════════════════════════════════════════════════════

function log(...args) {
    console.log("[BSWinsGW]", ...args);
}

function getAllKeywords() {
    return [
        ...WIN_KEYWORDS.italian,
        ...WIN_KEYWORDS.english,
        ...WIN_KEYWORDS.german,
        ...WIN_KEYWORDS.french,
        ...WIN_KEYWORDS.spanish
    ];
}

function containsWinKeyword(text) {
    const lower = text.toLowerCase();
    return getAllKeywords().some(kw => lower.includes(kw.toLowerCase()));
}

function isGiveawayBot(username) {
    const lower = username.toLowerCase();
    return GIVEAWAY_BOTS.some(bot => lower.includes(bot));
}

function isBrawlStars(text) {
    const lower = text.toLowerCase();
    return BRAWL_STARS_KEYWORDS.some(kw => lower.includes(kw));
}

function isMentioned(message) {
    if (!currentUser) return false;
    
    // Menzione diretta
    if (message.mentions && message.mentions.some(u => u.id === currentUser.id)) {
        return true;
    }
    
    // @everyone/@here
    if (message.mention_everyone) return true;
    
    return false;
}

function hasUsername(text) {
    if (!currentUser) return false;
    const lower = text.toLowerCase();
    return lower.includes(currentUser.username.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════
// ANALISI MESSAGGIO
// ═══════════════════════════════════════════════════════════════

function analyzeMessage(message) {
    try {
        // Ignora messaggi propri
        if (currentUser && message.author.id === currentUser.id) return;
        
        const content = message.content;
        const authorName = message.author.username;
        
        // Sistema di punteggio
        let confidence = 0;
        const reasons = [];
        
        // Check 1: Menzione (+30)
        if (isMentioned(message)) {
            confidence += 30;
            reasons.push("Menzione (+30)");
        }
        
        // Check 2: Bot giveaway (+25)
        if (isGiveawayBot(authorName)) {
            confidence += 25;
            reasons.push("Bot giveaway (+25)");
        }
        
        // Check 3: Keyword vittoria (+35)
        if (containsWinKeyword(content)) {
            confidence += 35;
            reasons.push("Keyword vittoria (+35)");
        }
        
        // Check 4: Username (+20)
        if (hasUsername(content)) {
            confidence += 20;
            reasons.push("Username presente (+20)");
        }
        
        // Check 5: Brawl Stars (+15 bonus)
        const isBrawl = isBrawlStars(content);
        if (isBrawl) {
            confidence += 15;
            reasons.push("Brawl Stars (+15)");
        }
        
        // Decisione
        const threshold = CONFIG.CONFIDENCE_THRESHOLD;
        let isWin = confidence >= threshold;
        
        // Match perfetto (override)
        if (isGiveawayBot(authorName) && containsWinKeyword(content) && 
            (isMentioned(message) || hasUsername(content))) {
            isWin = true;
            confidence = Math.max(confidence, 95);
            reasons.push("⭐ MATCH PERFETTO");
        }
        
        if (isWin) {
            log("🎉 VITTORIA RILEVATA!");
            log(`Confidenza: ${confidence}%`);
            log(`Motivi:`, reasons);
            handleWin(message, confidence, reasons, isBrawl);
        }
        
    } catch (error) {
        console.error("[BSWinsGW] Errore analisi:", error);
    }
}

// ═══════════════════════════════════════════════════════════════
// GESTIONE VITTORIA
// ═══════════════════════════════════════════════════════════════

async function handleWin(message, confidence, reasons, isBrawlStars) {
    const data = {
        serverName: message.guild_id ? "Server Discord" : "DM",
        serverId: message.guild_id || "DM",
        channelId: message.channel_id,
        messageId: message.id,
        content: message.content,
        link: `https://discord.com/channels/${message.guild_id || "@me"}/${message.channel_id}/${message.id}`,
        botName: message.author.username,
        timestamp: new Date().toLocaleString("it-IT"),
        confidence: confidence,
        reasons: reasons,
        isBrawlStars: isBrawlStars,
        gameType: isBrawlStars ? "Brawl Stars 🎮" : "Generico 🎁"
    };
    
    // Invia webhook
    if (CONFIG.USE_WEBHOOK && CONFIG.WEBHOOK_URL && !CONFIG.WEBHOOK_URL.includes("YOUR_WEBHOOK")) {
        await sendWebhook(data);
    }
    
    // Invia ntfy
    if (CONFIG.USE_NTFY && CONFIG.NTFY_TOPIC && CONFIG.NTFY_TOPIC !== "your-ntfy-topic-here") {
        await sendNtfy(data);
    }
    
    log("✅ Notifiche inviate!");
}

// ═══════════════════════════════════════════════════════════════
// INVIO WEBHOOK
// ═══════════════════════════════════════════════════════════════

async function sendWebhook(data) {
    try {
        const color = data.isBrawlStars ? 0x9C27B0 : 0x00FF00;
        const title = data.isBrawlStars ? 
            "🎮 HAI VINTO UN GIVEAWAY BRAWL STARS!" : 
            "🎉 HAI VINTO UN GIVEAWAY!";
        
        const embed = {
            title: title,
            description: data.content.substring(0, 1500),
            color: color,
            fields: [
                {name: "🏢 Server", value: data.serverName, inline: true},
                {name: "🤖 Bot", value: data.botName, inline: true},
                {name: "📊 Confidenza", value: `${data.confidence}%`, inline: true},
                {name: "🎯 Tipo", value: data.gameType, inline: true},
                {name: "⏰ Orario", value: data.timestamp, inline: true},
                {name: "🔗 Link", value: `[Vai al messaggio](${data.link})`, inline: false}
            ],
            footer: {text: "BSWinsGW Mobile v1.2.0 by sproutt"},
            timestamp: new Date().toISOString()
        };
        
        if (data.reasons.length > 0) {
            embed.fields.push({
                name: "📋 Motivi",
                value: data.reasons.map(r => `• ${r}`).join("\n"),
                inline: false
            });
        }
        
        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                username: "BSWinsGW Mobile 🎮",
                embeds: [embed]
            })
        });
        
        if (response.ok) {
            log("✅ Webhook inviato!");
        } else {
            console.error("[BSWinsGW] Errore webhook:", response.status);
        }
    } catch (error) {
        console.error("[BSWinsGW] Errore sendWebhook:", error);
    }
}

// ═══════════════════════════════════════════════════════════════
// INVIO NTFY
// ═══════════════════════════════════════════════════════════════

async function sendNtfy(data) {
    try {
        const emoji = data.isBrawlStars ? "🎮" : "🎉";
        const title = data.isBrawlStars ? 
            "🎮 Brawl Stars Vinto!" : 
            "🎉 Giveaway Vinto!";
        
        const message = `${emoji} HAI VINTO!\n\n` +
            `Server: ${data.serverName}\n` +
            `Bot: ${data.botName}\n` +
            `Tipo: ${data.gameType}\n` +
            `Confidenza: ${data.confidence}%\n\n` +
            `${data.content.substring(0, 250)}`;
        
        const response = await fetch(`https://ntfy.sh/${CONFIG.NTFY_TOPIC}`, {
            method: "POST",
            headers: {
                "Title": title,
                "Priority": "urgent",
                "Tags": data.isBrawlStars ? "video_game,trophy" : "tada,gift",
                "Click": data.link
            },
            body: message
        });
        
        if (response.ok) {
            log("✅ Ntfy inviato!");
        } else {
            console.error("[BSWinsGW] Errore ntfy:", response.status);
        }
    } catch (error) {
        console.error("[BSWinsGW] Errore sendNtfy:", error);
    }
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN LIFECYCLE
// ═══════════════════════════════════════════════════════════════

module.exports = {
    onLoad: () => {
        log("Plugin BSWinsGW caricato!");
        log("Versione 1.2.0 - by sproutt");
        
        // Ottieni utente corrente (metodo può variare in Revenge)
        try {
            const {UserStore} = require("@vendetta/storage");
            currentUser = UserStore.getCurrentUser?.();
            
            if (currentUser) {
                log(`👤 Monitorando per: ${currentUser.username}`);
            } else {
                log("⚠️ Impossibile ottenere utente corrente");
            }
        } catch (e) {
            console.error("[BSWinsGW] Errore caricamento utente:", e);
        }
        
        // Verifica configurazione
        if (CONFIG.WEBHOOK_URL.includes("YOUR_WEBHOOK") && CONFIG.NTFY_TOPIC === "your-ntfy-topic-here") {
            console.warn("[BSWinsGW] ⚠️ CONFIGURAZIONE MANCANTE! Modifica CONFIG in index.js");
        }
    },

    onUnload: () => {
        log("Plugin BSWinsGW scaricato!");
        if (messageHandler) {
            messageHandler = null;
        }
    },

    // Intercetta messaggi (sintassi può variare in base a Revenge)
    patches: [
        {
            find: "MESSAGE_CREATE",
            replacements: [
                {
                    match: /handleMessage\((\w+)\)/,
                    replace: (match, msgVar) => {
                        return `(function(msg){
                            try {
                                if (typeof analyzeMessage === 'function') {
                                    analyzeMessage(msg);
                                }
                            } catch(e) {
                                console.error('[BSWinsGW] Error:', e);
                            }
                            return ${match};
                        })(${msgVar})`;
                    }
                }
            ]
        }
    ]
};

// Esponi la funzione globalmente per il patch
global.analyzeMessage = analyzeMessage;
