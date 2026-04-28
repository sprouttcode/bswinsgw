/**
 * BSWinsGW - Brawl Stars & Multi-Game Giveaway Win Notifier
 * Per Revenge/Vendetta Discord Client
 * 
 * @author sproutt
 * @version 1.3.0
 */

// ═══════════════════════════════════════════════════════════════
// ⚙️ CONFIGURAZIONE - MODIFICA QUESTI VALORI!
// ═══════════════════════════════════════════════════════════════

const WEBHOOK_URL = "https://discord.com/api/webhooks/1498700349354021037/Ysrj6Z-nI1fImWzLLO4AXZnM0fb2Zd1Jl1KJZlztKXDQ8KzXEYLsXquuMdLy5CDOhm1T";
const NTFY_TOPIC = "bsenrihgiveawayswins";
const CONFIDENCE_THRESHOLD = 50;

// ═══════════════════════════════════════════════════════════════
// 📚 KEYWORDS MULTILINGUA
// ═══════════════════════════════════════════════════════════════

const WIN_KEYWORDS = [
    // ITALIANO
    "hai vinto", "congratulazioni! hai vinto", "sei il vincitore",
    "premio vinto", "giveaway vinto", "sei stato estratto",
    "ritira il premio", "rivendica il premio", "dm per il premio",
    "gemme vinte", "brawl pass vinto", "sei stata estratta",
    
    // ENGLISH
    "you won", "you've won", "you have won", "congratulations! you won",
    "you are the winner", "prize won", "claim your prize",
    "you have been selected", "winner:", "has won", "giveaway won",
    "won gems", "brawl pass won", "you're the winner",
    
    // DEUTSCH
    "du hast gewonnen", "herzlichen glückwunsch", "du bist der gewinner",
    "preis gewonnen", "ausgewählt worden", "gewinner:",
    
    // FRANÇAIS
    "tu as gagné", "vous avez gagné", "félicitations",
    "tu es le gagnant", "prix gagné", "réclame ton prix",
    
    // ESPAÑOL
    "has ganado", "ganaste", "felicidades",
    "eres el ganador", "premio ganado"
];

const GIVEAWAY_BOTS = [
    "giveawaybot", "giveaway bot", "santa", "dyno", "mee6",
    "carl-bot", "carlbot", "tatsumaki", "gaway", "wick",
    "arcane", "dank memer", "gleam", "lottery", "raffle"
];

const BRAWL_KEYWORDS = [
    "brawl stars", "brawlstars", "gems", "gemme",
    "brawl pass", "brawlpass", "supercell"
];

// ═══════════════════════════════════════════════════════════════
// 🔧 CODICE PLUGIN
// ═══════════════════════════════════════════════════════════════

let unpatch;
let currentUserId;
let currentUsername;

function log(...args) {
    console.log("%c[BSWinsGW]", "color: #9C27B0; font-weight: bold;", ...args);
}

function error(...args) {
    console.error("%c[BSWinsGW]", "color: #F04747; font-weight: bold;", ...args);
}

// Analizza messaggio
function analyzeMessage(message) {
    try {
        if (!message || !message.author || !message.content) return;
        if (message.author.id === currentUserId) return;

        const content = message.content.toLowerCase();
        const authorName = message.author.username.toLowerCase();
        
        // Sistema punteggio
        let confidence = 0;
        let reasons = [];
        
        // Check 1: Menzione
        const mentioned = message.mentions?.some(u => u.id === currentUserId) || 
                         message.mention_everyone;
        if (mentioned) {
            confidence += 30;
            reasons.push("Menzione (+30)");
        }
        
        // Check 2: Bot giveaway
        const isBot = GIVEAWAY_BOTS.some(bot => authorName.includes(bot));
        if (isBot) {
            confidence += 25;
            reasons.push("Bot giveaway (+25)");
        }
        
        // Check 3: Keyword vittoria
        const hasWin = WIN_KEYWORDS.some(kw => content.includes(kw));
        if (hasWin) {
            confidence += 35;
            reasons.push("Keyword vittoria (+35)");
        }
        
        // Check 4: Username
        const hasUser = currentUsername && content.includes(currentUsername);
        if (hasUser) {
            confidence += 20;
            reasons.push("Username (+20)");
        }
        
        // Check 5: Brawl Stars
        const isBrawl = BRAWL_KEYWORDS.some(kw => content.includes(kw));
        if (isBrawl) {
            confidence += 15;
            reasons.push("Brawl Stars (+15)");
        }
        
        // Decisione
        let isWin = confidence >= CONFIDENCE_THRESHOLD;
        
        // Match perfetto
        if (isBot && hasWin && (mentioned || hasUser)) {
            isWin = true;
            confidence = Math.max(confidence, 95);
            reasons.push("⭐ MATCH PERFETTO");
        }
        
        if (isWin) {
            log("🎉 VITTORIA RILEVATA!", `Confidenza: ${confidence}%`);
            handleWin(message, confidence, reasons, isBrawl);
        }
        
    } catch (e) {
        error("Errore analisi:", e);
    }
}

// Gestisci vittoria
async function handleWin(message, confidence, reasons, isBrawl) {
    const data = {
        guild: message.guild_id || "DM",
        channel: message.channel_id,
        content: message.content,
        link: `https://discord.com/channels/${message.guild_id || "@me"}/${message.channel_id}/${message.id}`,
        bot: message.author.username,
        time: new Date().toLocaleString("it-IT"),
        confidence: confidence,
        reasons: reasons.join("\n"),
        isBrawl: isBrawl
    };
    
    // Webhook
    if (WEBHOOK_URL && !WEBHOOK_URL.includes("YOUR_WEBHOOK")) {
        sendWebhook(data);
    }
    
    // Ntfy
    if (NTFY_TOPIC && NTFY_TOPIC !== "your-ntfy-topic-here") {
        sendNtfy(data);
    }
}

// Invia Webhook
async function sendWebhook(data) {
    try {
        const embed = {
            title: data.isBrawl ? "🎮 BRAWL STARS VINTO!" : "🎉 GIVEAWAY VINTO!",
            description: data.content.substring(0, 1500),
            color: data.isBrawl ? 0x9C27B0 : 0x00FF00,
            fields: [
                { name: "🤖 Bot", value: data.bot, inline: true },
                { name: "📊 Confidenza", value: `${data.confidence}%`, inline: true },
                { name: "🔗 Link", value: `[Clicca qui](${data.link})`, inline: false },
                { name: "📋 Motivi", value: data.reasons, inline: false }
            ],
            footer: { text: "BSWinsGW Mobile v1.3.0 by sproutt" },
            timestamp: new Date().toISOString()
        };
        
        await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "BSWinsGW 🎮",
                embeds: [embed]
            })
        });
        
        log("✅ Webhook inviato!");
    } catch (e) {
        error("Errore webhook:", e);
    }
}

// Invia Ntfy
async function sendNtfy(data) {
    try {
        const msg = `🎉 HAI VINTO!\n\nBot: ${data.bot}\nConfidenza: ${data.confidence}%\n\n${data.content.substring(0, 200)}`;
        
        await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
            method: "POST",
            headers: {
                "Title": data.isBrawl ? "🎮 Brawl Stars Vinto!" : "🎉 Giveaway Vinto!",
                "Priority": "urgent",
                "Tags": "tada,trophy",
                "Click": data.link
            },
            body: msg
        });
        
        log("✅ Ntfy inviato!");
    } catch (e) {
        error("Errore ntfy:", e);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 EXPORT PLUGIN
// ═══════════════════════════════════════════════════════════════

export default {
    onLoad() {
        log("Plugin caricato! v1.3.0 by sproutt");
        
        // Verifica configurazione
        if (WEBHOOK_URL.includes("YOUR_WEBHOOK") && NTFY_TOPIC === "your-ntfy-topic-here") {
            error("⚠️ CONFIGURA WEBHOOK E NTFY in index.js!");
            return;
        }
        
        // Ottieni utente corrente
        try {
            const { FluxDispatcher } = window.vendetta.metro.common;
            const UserStore = window.vendetta.metro.findByStoreName("UserStore");
            
            if (UserStore) {
                const user = UserStore.getCurrentUser();
                if (user) {
                    currentUserId = user.id;
                    currentUsername = user.username.toLowerCase();
                    log(`👤 Monitorando: ${user.username} (${user.id})`);
                }
            }
            
            // Intercetta messaggi
            unpatch = FluxDispatcher.subscribe("MESSAGE_CREATE", (payload) => {
                if (payload?.message) {
                    analyzeMessage(payload.message);
                }
            });
            
            log("✅ In ascolto per giveaway...");
            
        } catch (e) {
            error("Errore inizializzazione:", e);
            
            // Fallback: prova API alternativa
            try {
                const modules = window.vendetta?.metro;
                if (modules) {
                    log("Tentativo metodo alternativo...");
                    // Implementazione alternativa se disponibile
                }
            } catch (e2) {
                error("Impossibile inizializzare:", e2);
            }
        }
    },
    
    onUnload() {
        if (unpatch) {
            unpatch();
            log("Plugin scaricato");
        }
    }
};
