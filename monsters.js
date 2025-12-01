export class Monster {
  constructor({ id, name, element, hp, attack, img }) {
    this.id = id;
    this.name = name;
    this.element = element;
    this.maxHp = hp;
    this.hp = hp;
    this.attack = attack;
    this.img = img;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  isDead() {
    return this.hp <= 0;
  }
}

export const PLAYER_TEAM = [
  new Monster({
    id: 1,
    name: "Flare Cub",
    element: "fire",
    hp: 150,
    attack: 22,
    img: "assets/monsters/flare_cub.png"
  }),
  new Monster({
    id: 2,
    name: "Dropletodon",
    element: "water",
    hp: 170,
    attack: 18,
    img: "assets/monsters/dropletodon.png"
  }),
  new Monster({
    id: 3,
    name: "Mossling",
    element: "earth",
    hp: 200,
    attack: 16,
    img: "assets/monsters/mossling.png"
  })
];

export const ENEMY = new Monster({
  id: 99,
  name: "Void Bat",
  element: "dark",
  hp: 260,
  attack: 20,
  img: "assets/monsters/void_bat.png"
});
