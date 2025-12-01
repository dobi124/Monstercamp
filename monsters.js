// monsters.js — система монстров + скиллы

export class Monster {
  constructor({ id, name, element, hp, attack, img, skill }) {
    this.id = id;
    this.name = name;
    this.element = element;
    this.maxHp = hp;
    this.hp = hp;
    this.attack = attack;
    this.img = img;

    this.skill = skill;

    this.sp = 0;       // энергия
    this.maxSp = 10;   // сколько нужно для активации

    this.damageBuff = 0;    // +100% = 1.0
    this.buffTurns = 0;

    this.shield = 0;        // 0.3 = 30%
    this.shieldTurns = 0;   // сколько атак держит
  }

  chargeSp(amount) {
    this.sp = Math.min(this.maxSp, this.sp + amount);
  }

  resetSp() { this.sp = 0; }

  isReady() { return this.sp >= this.maxSp; }

  isDead() { return this.hp <= 0; }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }
}

/* ---------- СКИЛЛЫ ---------- */

function flareCubSkill(user, team, enemy) {
  user.damageBuff = 1.0;   // +100%
  user.buffTurns = 2;
}

function dropletodonSkill(user, team, enemy) {
  for (const ally of team) {
    if (!ally.isDead()) {
      const heal = Math.round(ally.maxHp * 0.2);
      ally.hp = Math.min(ally.maxHp, ally.hp + heal);
    }
  }
}

function mosslingSkill(user, team, enemy) {
  for (const ally of team) {
    if (!ally.isDead()) {
      ally.shield = 0.3;
      ally.shieldTurns = 1;
    }
  }
}

/* ---------- МОЯ КОМАНДА ---------- */

export const PLAYER_TEAM = [
  new Monster({
    id: 1,
    name: "Flare Cub",
    element: "fire",
    hp: 150,
    attack: 22,
    img: "assets/monsters/flare_cub.png",
    skill: flareCubSkill,
  }),
  new Monster({
    id: 2,
    name: "Dropletodon",
    element: "water",
    hp: 170,
    attack: 18,
    img: "assets/monsters/dropletodon.png",
    skill: dropletodonSkill,
  }),
  new Monster({
    id: 3,
    name: "Mossling",
    element: "earth",
    hp: 200,
    attack: 16,
    img: "assets/monsters/mossling.png",
    skill: mosslingSkill,
  }),
];

/* ---------- ВРАГ ---------- */

export const ENEMY = new Monster({
  id: 99,
  name: "Void Bat",
  element: "dark",
  hp: 260,
  attack: 20,
  img: "assets/monsters/void_bat.png",
});
