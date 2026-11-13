import { z } from 'zod';
import { PHASES } from './types.js';
import { AVATAR_IDS } from './rules.js';

// Esquemas Zod de los comandos. El servidor valida todo; el cliente los usa para tipar.

const name = z.string().trim().min(1, 'El nombre no puede estar vacío').max(40);
const smallText = z.string().trim().max(60);
const tagList = z.array(z.string().trim().min(1).max(40)).max(6);
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const id = z.string().min(1).max(64);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const avatar = z.enum(AVATAR_IDS);

export const monsterInput = z.object({
  name: smallText.default(''),
  strength: int(0, 999),
  levels: int(0, 10).default(1),
  treasures: int(0, 20).default(1),
});
export type MonsterInput = z.infer<typeof monsterInput>;

export const sex = z.enum(['male', 'female']);

export const characterPatch = z
  .object({
    name: name.optional(),
    color: color.optional(),
    avatar: avatar.optional(),
    sex: sex.optional(),
    level: int(1, 99).optional(),
    classes: tagList.optional(),
    races: tagList.optional(),
    gear: int(-99, 999).optional(),
    otherMods: int(-99, 999).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();
export type CharacterPatch = z.infer<typeof characterPatch>;

export const itemInput = z.object({
  id: id,
  name: z.string().trim().min(1, 'Poné un nombre al objeto').max(40),
  bonus: int(-20, 20),
  slot: z.enum(['head', 'armor', 'feet', 'hand', 'twoHands', 'other']),
  big: z.boolean().default(false),
  equipped: z.boolean().default(true),
  oneShot: z.boolean().optional(),
});

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('character.update'), targetId: id, patch: characterPatch }),
  z.object({ type: z.literal('character.undo'), targetId: id }),
  z.object({ type: z.literal('character.setItems'), targetId: id, items: z.array(itemInput).max(24) }),
  z.object({
    type: z.literal('room.updateConfig'),
    sets: z.array(z.string().trim().min(1).max(60)).max(12),
    extraSets: z.array(z.string().trim().min(1).max(60)).max(12),
  }),
  z.object({ type: z.literal('order.set'), order: z.array(id).max(12) }),
  z.object({ type: z.literal('order.randomize') }),
  z.object({ type: z.literal('game.start') }),
  z.object({ type: z.literal('game.pause') }),
  z.object({ type: z.literal('game.resume') }),
  z.object({ type: z.literal('game.end'), winnerId: id.nullable().default(null) }),
  z.object({ type: z.literal('turn.kickDoor') }),
  z.object({
    type: z.literal('turn.doorResult'),
    result: z.enum(['monster', 'curse', 'other']),
    monster: monsterInput.optional(),
  }),
  z.object({ type: z.literal('turn.curseResolved') }),
  z.object({
    type: z.literal('turn.lookForTrouble'),
    confirmed: z.literal(true),
    monster: monsterInput,
  }),
  z.object({ type: z.literal('turn.lootRoom') }),
  z.object({ type: z.literal('turn.lootDone') }),
  z.object({ type: z.literal('turn.charityDone') }),
  z.object({ type: z.literal('turn.end') }),
  z.object({ type: z.literal('combat.addMonster'), monster: monsterInput }),
  z.object({
    type: z.literal('combat.updateMonster'),
    monsterId: id,
    monster: monsterInput,
  }),
  z.object({ type: z.literal('combat.removeMonster'), monsterId: id }),
  z.object({
    type: z.literal('combat.addModifier'),
    side: z.enum(['players', 'monsters']),
    label: smallText.default(''),
    value: int(-99, 99),
  }),
  z.object({ type: z.literal('combat.removeModifier'), modifierId: id }),
  z.object({ type: z.literal('combat.useItem'), itemId: id, side: z.enum(['players', 'monsters']) }),
  z.object({ type: z.literal('help.request'), toId: id }),
  z.object({ type: z.literal('help.respond'), requestId: id, accept: z.boolean() }),
  z.object({ type: z.literal('help.cancel'), requestId: id }),
  z.object({ type: z.literal('help.dismissHelper') }),
  z.object({
    type: z.literal('combat.resolveVictory'),
    rewards: z
      .array(z.object({ participantId: id, levels: int(-10, 10), note: smallText.default('') }))
      .max(2),
    note: z.string().trim().max(200).default(''),
  }),
  z.object({
    type: z.literal('combat.resolveFlee'),
    outcomes: z
      .array(
        z.object({
          participantId: id,
          monsterId: id,
          result: z.enum(['escaped', 'caught']),
        }),
      )
      .max(40),
    note: z.string().trim().max(200).default(''),
  }),
  z.object({
    type: z.literal('combat.resolveOther'),
    text: z.string().trim().min(1, 'Contá brevemente qué pasó').max(200),
  }),
  z.object({ type: z.literal('dm.setTurn'), activeId: id, phase: z.enum(PHASES) }),
  z.object({ type: z.literal('dm.transfer'), toId: id }),
  z.object({ type: z.literal('dm.removeParticipant'), participantId: id }),
  z.object({ type: z.literal('levelAlert.confirmWinner') }),
  z.object({ type: z.literal('levelAlert.dismiss') }),
]);
export type Action = z.infer<typeof actionSchema>;
export type ActionType = Action['type'];

export const commandSchema = z.object({
  commandId: z.string().uuid(),
  expectedVersion: z.number().int().min(0),
  action: actionSchema,
});
export type Command = z.infer<typeof commandSchema>;

export const createRoomSchema = z.object({
  name,
  sets: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  extraSets: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  avatar: avatar.optional(),
  color: color.optional(),
  sex: sex.optional(),
});

export const practiceRoomSchema = z.object({
  name,
  avatar: avatar.optional(),
  color: color.optional(),
  sex: sex.optional(),
});

export const joinRoomSchema = z.object({
  name,
  role: z.enum(['player', 'spectator']),
  avatar: avatar.optional(),
  color: color.optional(),
  sex: sex.optional(),
});
