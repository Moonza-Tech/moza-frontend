// === MOZA Assistant Bot v1.4 ===
// Telegrambot med Firebase Firestore + Moonbase + Build + Upgrade + Collect

const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

const bot = new Telegraf('7846332548:AAGe_9LbeRM7JVG7w6lyqCOp2gXkD9mpMyg');

const serviceAccount = require('./moza-assistant-firebase-adminsdk-fbsvc-b3df36bdda.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const usersCollection = db.collection('users');

// === Byggnader & metadata ===
const structureList = {
  solar_panels: { name: "☀️ Solar Panels", cost: 50, description: "Generates daily energy." },
  launchpad: { name: "🚀 Launchpad", cost: 75, description: "Start missions and earn XP." },
  research_lab: { name: "🔬 Research Lab", cost: 100, description: "Unlock tech upgrades." },
  defense_tower: { name: "🛡️ Defense Tower", cost: 120, description: "Protects your base from attacks." },
  crypto_bank: { name: "🏦 Crypto Bank", cost: 90, description: "Boosts MOZA Point generation." },
  transport_hub: { name: "🚉 Transport Hub", cost: 70, description: "Speeds up upgrades and missions." }
};

// === /start ===
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const userRef = usersCollection.doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    await userRef.set({
      telegram_id: userId,
      username: ctx.from.username || '',
      first_name: ctx.from.first_name || '',
      points: 0,
      level: 1,
      created_at: new Date(),
      moonbase: {
        base_level: 1,
        energy: 0,
        last_collected: null,
        buildings: Object.fromEntries(
          Object.keys(structureList).concat(['command_center']).map(k => [
            k,
            { level: k === 'command_center' ? 1 : 0, unlocked: k === 'command_center' }
          ])
        )
      }
    });
  }

  await ctx.reply(`👋 Welcome to *MOZA Assistant*, ${ctx.from.first_name}!

🌕 Your Moonbase is now initialized and ready.
🚀 Join our presale: https://your-presale-link.io

Type /menu or /moonbase to begin your journey.`,
    { parse_mode: "Markdown" });
});

// === /menu ===
bot.command('menu', (ctx) => {
  return ctx.reply('🧭 Choose an option:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 Token Info', callback_data: 'token_info' }],
        [{ text: '🚀 Join Presale', callback_data: 'presale' }],
        [{ text: '📈 View Stats', callback_data: 'stats' }],
        [{ text: '❓ FAQ', callback_data: 'faq' }],
      ],
    },
  });
});

// === Callbacks ===
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  const messages = {
    token_info: "🔹 MOZA Token Info\n\n- Symbol: MOZA\n- Supply: 1,000,000,000\n- Network: BSC\n- Tax: 0% Buy / 0% Sell\n- Contract: (coming soon)",
    presale: "🚀 Join the presale at: https://your-presale-link.io\n\n⏳ Countdown active now!",
    stats: "📈 Live Stats\n\nRaised: 0 BNB\nParticipants: 0\n(Coming soon from API)",
    faq: "❓ FAQ\n\n- How to buy? Use the presale link.\n- Is the token verified? Yes.\n- Is this real? 100%. Backed by a solid team."
  };

  if (messages[data]) {
    await ctx.answerCbQuery();
    return ctx.reply(messages[data]);
  }
});

// === /earn ===
bot.command('earn', async (ctx) => {
  const userId = ctx.from.id.toString();
  const ref = usersCollection.doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return ctx.reply("❌ You are not registered.");

  const data = snap.data();
  const now = new Date();
  const lastClaim = data.last_claimed ? new Date(data.last_claimed._seconds * 1000) : null;
  if (lastClaim && now.toDateString() === lastClaim.toDateString()) {
    return ctx.reply("⏱ You’ve already claimed your daily reward. Come back tomorrow!");
  }

  const newPoints = (data.points || 0) + 10;
  await ref.update({ points: newPoints, last_claimed: now });
  ctx.reply(`🎁 Daily reward claimed!\n🪙 +10 MOZA Points\n💰 Total: ${newPoints}`);
});

// === /collect (ENERGY) ===
bot.command('collect', async (ctx) => {
  const userId = ctx.from.id.toString();
  const ref = usersCollection.doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return ctx.reply("❌ You are not registered.");

  const user = snap.data();
  const moonbase = user.moonbase;
  const now = new Date();
  const last = moonbase.last_collected ? new Date(moonbase.last_collected._seconds * 1000) : null;

  if (last && now.toDateString() === last.toDateString()) {
    return ctx.reply("⏱ You’ve already collected energy today.");
  }

  const bonus = moonbase.buildings.solar_panels?.level || 0;
  const totalEnergy = 5 + bonus * 3;

  moonbase.energy += totalEnergy;
  moonbase.last_collected = now;
  await ref.update({ 'moonbase': moonbase });

  ctx.reply(`⚡ Energy collected!\n➕ +${totalEnergy} Energy\n🔋 Total Energy: ${moonbase.energy}`);
});

// === /balance ===
bot.command('balance', async (ctx) => {
  const userId = ctx.from.id.toString();
  const snap = await usersCollection.doc(userId).get();
  if (!snap.exists) return ctx.reply("❌ You are not registered.");

  const d = snap.data();
  ctx.reply(`📊 Your balance:\n\n💰 Points: ${d.points}\n🏆 Level: ${d.level}\n⚡ Energy: ${d.moonbase.energy || 0}`);
});

// === /moonbase ===
bot.command('moonbase', async (ctx) => {
  const userId = ctx.from.id.toString();
  const snap = await usersCollection.doc(userId).get();
  if (!snap.exists) return ctx.reply("❌ You are not registered.");

  const base = snap.data().moonbase;
  let msg = `🏗️ *MOONBASE OVERVIEW*\n\n🔸 Base Level: ${base.base_level}\n⚡ Energy: ${base.energy}\n\n🏢 Buildings:\n`;
  for (const [name, info] of Object.entries(base.buildings)) {
    msg += `- ${structureList[name]?.name || name}: Lv ${info.level} ${info.unlocked ? '✅' : '🔒'}\n`;
  }

  ctx.replyWithMarkdown(msg);
});

// === /build ===
bot.command('build', async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    let list = "🏗️ *Available Structures to Build:*\n\n";
    for (const [key, s] of Object.entries(structureList)) {
      list += `• /build ${key} — ${s.name}\n_${s.description}_\n💰 Cost: ${s.cost} Points\n\n`;
    }
    return ctx.replyWithMarkdown(list);
  }

  const key = args[1].toLowerCase();
  if (!structureList[key]) return ctx.reply("❌ Invalid structure.");

  const ref = usersCollection.doc(userId);
  const snap = await ref.get();
  const data = snap.data();
  const buildings = data.moonbase.buildings;

  if (buildings[key].unlocked) return ctx.reply("✅ Already built. Use /upgrade instead.");
  if (data.points < structureList[key].cost)
    return ctx.reply(`💸 You need ${structureList[key].cost} Points. You have ${data.points}.`);

  buildings[key].unlocked = true;
  buildings[key].level = 1;
  await ref.update({
    points: data.points - structureList[key].cost,
    'moonbase.buildings': buildings
  });

  ctx.reply(`🏗️ You built *${structureList[key].name}*!\n💰 -${structureList[key].cost} Points`, { parse_mode: "Markdown" });
});

// === /upgrade ===
bot.command('upgrade', async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply("⚙️ Usage: /upgrade [structure]");

  const key = args[1].toLowerCase();
  if (!structureList[key]) return ctx.reply("❌ Invalid structure name.");

  const ref = usersCollection.doc(userId);
  const snap = await ref.get();
  const data = snap.data();
  const b = data.moonbase.buildings[key];

  if (!b?.unlocked) return ctx.reply("🔒 Structure is locked. Use /build first.");
  const cost = 50 + b.level * 30;
  if (data.points < cost) return ctx.reply(`💸 Upgrade cost: ${cost}. You have ${data.points}.`);

  b.level += 1;
  await ref.update({ points: data.points - cost, [`moonbase.buildings.${key}`]: b });

  ctx.reply(`🔧 Upgraded *${structureList[key].name}* to Level ${b.level}!\n💰 -${cost} Points`, { parse_mode: "Markdown" });
});

// === Start Bot ===
bot.launch();
console.log("🤖 MOZA Assistant is running...");


