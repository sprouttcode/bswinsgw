/**
 * GIVEAWAY WIN NOTIFIER - NTFY VERSION
 * Notifica SOLO quando vinci effettivamente un giveaway
 * 
 * SETUP:
 * 1. Installa app Ntfy sul telefono
 * 2. Crea un topic (es: "brawl-wins-2024")
 * 3. Sostituisci NTFY_TOPIC sotto con il tuo topic
 * 4. Carica questo plugin in Revenge
 */

const NTFY_TOPIC = 'bsenrihgiveawayswins'; // CAMBIA QUESTO!
const NTFY_SERVER = 'https://ntfy.sh'; // Puoi anche self-hostare

module.exports = {
    name: 'GiveawayWinNotifier',
    description: 'Notifica push quando vinci un giveaway - Versione Completa',
    author: 'BrawlStars Helper',
    version: '2.0',

    // Configurazione
    config: {
        // Keywords che indicano VITTORIA
        winKeywords: [
            // Italiano
            'hai vinto', 'congratulazioni', 'vincitore', 'sei il vincitore',
            'vinto il giveaway', 'winner è', 'vinto:', 'premio a',
            'rivendica il premio', 'ritira il premio', 'contatta per',
            'dm per ritirare', 'dm me', 'hai ottenuto',
            
            // Inglese
            'you won', 'you win', 'you\'re the winner', 'you are the winner',
            'congratulations', 'congrats', 'winner is', 'won the giveaway',
            'claim your prize', 'claim your reward', 'dm to claim',
            'dm me to claim', 'you\'ve won', 'you have won',
            'winner:', 'winners:', 'won:', 'prize goes to',
            
            // Emoji patterns comuni
            '🎉', '🎊', '🏆', '👑', '✨'
        ],
        
        // Frasi che ESCLUDONO la vittoria (falsi positivi)
        excludeKeywords: [
            // Italiano
            'non hai vinto', 'non sei il vincitore', 'prossima volta',
            'riprova', 'better luck', 'sfortunatamente',
            'partecipa al prossimo', 'non è tra i vincitori',
            'non risulti vincitore', 'nessun vincitore',
            
            // Inglese
            'didn\'t win', 'did not win', 'not the winner', 'not a winner',
            'better luck next time', 'try again', 'no winner',
            'unfortunately', 'sorry', 'failed to win',
            'not selected', 'weren\'t selected', 'wasn\'t selected',
            
            // Announcement di inizio giveaway (non vittoria)
            'giveaway starting', 'new giveaway', 'react to enter',
            'click to enter', 'partecipa con', 'entra nel giveaway'
        ],
        
        // Server/canali da IGNORARE (opzionale)
        ignoredGuilds: [
            // Aggiungi ID server da ignorare, es: '123456789'
        ],
        
        // Minimo di parole richieste per considerare vittoria
        minMessageLength: 10,
        
        // Richiedi che il messaggio contenga sia menzione CHE keyword
        requireBothMentionAndKeyword: true
    },

    // Statistiche
    stats: {
        totalMentions: 0,
        possibleWins: 0,
        notificationsSent: 0,
        falsePositivesBlocked: 0
    },

    start() {
        console.log('[GiveawayWinNotifier] 🚀 Plugin avviato!');
        console.log('[GiveawayWinNotifier] 📱 Topic Ntfy:', NTFY_TOPIC);
        
        this.listener = async (msg) => {
            try {
                // Ignora messaggi bot (opzionale - rimuovi se vuoi anche notifiche da bot)
                // if (msg.author?.bot) return;
                
                const currentUser = revenge.api.user.getCurrentUser();
                
                // Controlla se sei menzionato
                const isMentioned = msg.mentions?.some(u => u.id === currentUser.id) || 
                                  msg.content?.includes(`<@${currentUser.id}>`) ||
                                  msg.content?.includes(`<@!${currentUser.id}>`);
                
                if (!isMentioned) return;
                
                this.stats.totalMentions++;
                
                // Ignora server nella blacklist
                if (this.config.ignoredGuilds.includes(msg.guild_id)) {
                    console.log('[GiveawayWinNotifier] ⏭️ Server ignorato');
                    return;
                }
                
                const content = msg.content?.toLowerCase() || '';
                
                // Verifica lunghezza minima
                if (content.length < this.config.minMessageLength) {
                    console.log('[GiveawayWinNotifier] ⏭️ Messaggio troppo corto');
                    return;
                }
                
                // FASE 1: Controlla ESCLUSIONI (frasi negative)
                const hasExcludedPhrase = this.config.excludeKeywords.some(keyword => 
                    content.includes(keyword.toLowerCase())
                );
                
                if (hasExcludedPhrase) {
                    this.stats.falsePositivesBlocked++;
                    console.log('[GiveawayWinNotifier] ❌ Falso positivo bloccato (frase negativa)');
                    return;
                }
                
                // FASE 2: Controlla KEYWORDS DI VITTORIA
                const hasWinKeyword = this.config.winKeywords.some(keyword => {
                    if (keyword.length === 1 || keyword.length === 2) {
                        // Per emoji, controlla presenza esatta
                        return msg.content?.includes(keyword);
                    }
                    return content.includes(keyword.toLowerCase());
                });
                
                if (!hasWinKeyword) {
                    console.log('[GiveawayWinNotifier] ⏭️ Nessuna keyword di vittoria trovata');
                    return;
                }
                
                // FASE 3: VERIFICA AGGIUNTIVA - Pattern di vittoria
                const winPatterns = [
                    // La menzione è seguita/preceduta da "winner" o simili
                    new RegExp(`winner.*<@!?${currentUser.id}>|<@!?${currentUser.id}>.*winner`, 'i'),
                    new RegExp(`won.*<@!?${currentUser.id}>|<@!?${currentUser.id}>.*won`, 'i'),
                    new RegExp(`congratulations.*<@!?${currentUser.id}>|<@!?${currentUser.id}>.*congratulations`, 'i'),
                    new RegExp(`vinto.*<@!?${currentUser.id}>|<@!?${currentUser.id}>.*vinto`, 'i'),
                ];
                
                const hasStrongPattern = winPatterns.some(pattern => 
                    pattern.test(msg.content || '')
                );
                
                // FASE 4: DECISIONE FINALE
                let confidenceLevel = 'MEDIA';
                
                if (hasStrongPattern) {
                    confidenceLevel = 'ALTA';
                } else if (hasWinKeyword && isMentioned) {
                    confidenceLevel = 'MEDIA';
                } else {
                    console.log('[GiveawayWinNotifier] ⚠️ Confidenza troppo bassa');
                    return;
                }
                
                // VITTORIA CONFERMATA! Invia notifica
                this.stats.possibleWins++;
                await this.sendNotification(msg, confidenceLevel);
                
            } catch (error) {
                console.error('[GiveawayWinNotifier] ❌ Errore:', error);
            }
        };
        
        revenge.api.messages.addListener('MESSAGE_CREATE', this.listener);
    },

    async sendNotification(msg, confidence) {
        try {
            const currentUser = revenge.api.user.getCurrentUser();
            
            // Costruisci messaggio
            const serverName = msg.guild?.name || 'Messaggio Diretto';
            const channelName = msg.channel?.name || 'DM';
            const messageUrl = `https://discord.com/channels/${msg.guild_id || '@me'}/${msg.channel_id}/${msg.id}`;
            const messagePreview = msg.content.substring(0, 200);
            
            // Emoji basato su confidenza
            const confidenceEmoji = {
                'ALTA': '🏆',
                'MEDIA': '🎉',
                'BASSA': '⚠️'
            };
            
            const notificationBody = `
${confidenceEmoji[confidence]} GIVEAWAY VINTO! (Confidenza: ${confidence})

📍 Server: ${serverName}
💬 Canale: ${channelName}
👤 Utente: ${msg.author?.username || 'Unknown'}

📝 Messaggio:
${messagePreview}${msg.content.length > 200 ? '...' : ''}

🔗 Link: ${messageUrl}

⏰ ${new Date().toLocaleString('it-IT')}
            `.trim();
            
            // Invia a Ntfy
            const response = await fetch(`${NTFY_SERVER}/${NTFY_TOPIC}`, {
                method: 'POST',
                headers: {
                    'Title': `${confidenceEmoji[confidence]} HAI VINTO UN GIVEAWAY!`,
                    'Priority': confidence === 'ALTA' ? 'urgent' : 'high',
                    'Tags': confidence === 'ALTA' ? 'trophy,tada,rotating_light' : 'tada,gift',
                    'Click': messageUrl,
                    'Actions': `view, Apri Discord, ${messageUrl}, clear=true`
                },
                body: notificationBody
            });
            
            if (response.ok) {
                this.stats.notificationsSent++;
                console.log(`[GiveawayWinNotifier] ✅ Notifica inviata! (${confidence})`);
                console.log(`[GiveawayWinNotifier] 📊 Stats: ${this.stats.notificationsSent} notifiche, ${this.stats.falsePositivesBlocked} falsi positivi bloccati`);
            } else {
                console.error('[GiveawayWinNotifier] ❌ Errore invio notifica:', await response.text());
            }
            
        } catch (error) {
            console.error('[GiveawayWinNotifier] ❌ Errore sendNotification:', error);
        }
    },

    stop() {
        revenge.api.messages.removeListener('MESSAGE_CREATE', this.listener);
        console.log('[GiveawayWinNotifier] 🛑 Plugin fermato');
        console.log('[GiveawayWinNotifier] 📊 Statistiche finali:', this.stats);
    },

    // Comando per vedere statistiche
    getStats() {
        return this.stats;
    }
};
