// Phase 2: Agent naming system

const ADJECTIVES = [
  'Swift', 'Clever', 'Bold', 'Bright', 'Quick', 'Sharp', 'Smart', 'Wise',
  'Brave', 'Calm', 'Cool', 'Fast', 'Gentle', 'Happy', 'Kind', 'Lucky',
  'Magic', 'Noble', 'Proud', 'Royal', 'Silent', 'Strong', 'Sweet', 'Wild',
  'Young', 'Zesty', 'Agile', 'Alert', 'Ambitious', 'Ancient', 'Artistic',
  'Astonishing', 'Brilliant', 'Cunning', 'Daring', 'Dynamic', 'Elegant',
  'Epic', 'Fearless', 'Fierce', 'Graceful', 'Heroic', 'Incredible',
  'Intelligent', 'Majestic', 'Mysterious', 'Powerful', 'Radiant', 'Sleek',
  'Spectacular', 'Stunning', 'Supreme', 'Thunderous', 'Titanic', 'Valiant',
  'Vibrant', 'Vigilant', 'Wondrous', 'Zealous'
];

const ANIMALS = [
  'Fox', 'Wolf', 'Bear', 'Eagle', 'Lion', 'Tiger', 'Shark', 'Dolphin',
  'Owl', 'Hawk', 'Falcon', 'Raven', 'Panther', 'Lynx', 'Cougar', 'Jaguar',
  'Whale', 'Orca', 'Seal', 'Penguin', 'Otter', 'Beaver', 'Badger', 'Wolverine',
  'Moose', 'Elk', 'Cheetah', 'Leopard', 'Puma', 'Bobcat',
  'Coyote', 'Hyena', 'Jackal', 'Dingo', 'Panda',
  'Narwhal', 'Caribou', 'Reindeer', 'Bison', 'Buffalo', 'Yak', 'Ibex',
  'Pronghorn', 'Gazelle', 'Antelope', 'Wildebeest', 'Impala',
  'Zebra', 'Giraffe', 'Hippo', 'Rhino', 'Elephant', 'Camel',
  'Llama', 'Alpaca', 'Vicuna', 'Guanaco', 'Tapir', 'Capybara',
  'Armadillo', 'Sloth', 'Aardvark', 'Pangolin', 'Meerkat',
  'Mongoose', 'Ferret', 'Weasel', 'Stoat', 'Ermine', 'Mink',
  'Skunk', 'Raccoon', 'Coatimundi', 'Kinkajou', 'Ringtail',
  'Lemur', 'Tarsier', 'Gibbon', 'Orangutan', 'Chimpanzee', 'Bonobo', 'Gorilla',
  'Mandrill', 'Baboon', 'Macaque', 'Colobus', 'Langur',
  'Tamarin', 'Marmoset', 'Uakari'
];

/**
 * Generate a unique agent name using adjective + animal combination
 * Examples: "Swift Fox", "Clever Wolf", "Bold Eagle"
 */
export function generateAgentName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

/**
 * Validate agent name according to Phase 2 requirements
 * - 1-50 characters
 * - Alphanumeric, spaces, and hyphens only
 */
export function validateAgentName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }

  if (!/^[a-zA-Z0-9 -]+$/.test(name)) {
    return { valid: false, error: 'Invalid name: only alphanumeric, spaces, hyphens allowed' };
  }

  return { valid: true };
}

/**
 * Ensure name is unique among active agents
 * If not, suggest a numbered variant
 */
export function ensureUniqueName(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) {
    return name;
  }

  let counter = 2;
  let newName = `${name} ${counter}`;

  while (existingNames.has(newName)) {
    counter++;
    newName = `${name} ${counter}`;
  }

  return newName;
}
