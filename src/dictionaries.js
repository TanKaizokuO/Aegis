export const equalityRules = [
  {
    ruleId: 'he-she',
    phrase: ['he', 'or', 'she'],
    isBinaryPair: true,
    suggestions: ['they']
  },
  {
    ruleId: 'he-she',
    phrase: ['she', 'or', 'he'],
    isBinaryPair: true,
    suggestions: ['they']
  },
  {
    ruleId: 'her-him',
    phrase: ['him', 'or', 'her'],
    isBinaryPair: true,
    suggestions: ['them']
  },
  {
    ruleId: 'her-him',
    phrase: ['her', 'or', 'him'],
    isBinaryPair: true,
    suggestions: ['them']
  },
  {
    ruleId: 'her-him',
    phrase: ['his', 'or', 'her'],
    isBinaryPair: true,
    suggestions: ['their']
  },
  {
    ruleId: 'her-him',
    phrase: ['her', 'or', 'his'],
    isBinaryPair: true,
    suggestions: ['their']
  },
  {
    ruleId: 'he-she',
    phrase: ['he'],
    suggestions: ['they', 'person']
  },
  {
    ruleId: 'he-she',
    phrase: ['she'],
    suggestions: ['they', 'person']
  },
  {
    ruleId: 'her-him',
    phrase: ['him'],
    suggestions: ['them', 'person']
  },
  {
    ruleId: 'her-him',
    phrase: ['her'],
    suggestions: ['them', 'their']
  },
  {
    ruleId: 'her-him',
    phrase: ['his'],
    suggestions: ['their', 'theirs']
  },
  {
    ruleId: 'master-slave',
    phrase: ['master', 'server'],
    suggestions: ['primary server', 'main server']
  },
  {
    ruleId: 'master-slave',
    phrase: ['master'],
    suggestions: ['primary', 'main', 'leader']
  },
  {
    ruleId: 'master-slave',
    phrase: ['slave'],
    suggestions: ['replica', 'secondary', 'follower']
  },
  {
    ruleId: 'boogeyman-boogeywoman',
    phrase: ['boogeyman'],
    suggestions: ['boogeyperson', 'monster']
  },
  {
    ruleId: 'dad-mom',
    phrase: ['pop'],
    suggestions: ['parent', 'father', 'mother']
  },
  {
    ruleId: 'gimp',
    phrase: ['cripple'],
    referringToPerson: true,
    suggestions: ['disabled', 'person with a disability']
  }
];

export const profanityRules = [
  {
    ruleId: 'beaver',
    phrase: ['beaver'],
    rating: 0
  },
  {
    ruleId: 'butt',
    phrase: ['butt'],
    rating: 0
  },
  {
    ruleId: 'asshat',
    phrase: ['asshat'],
    rating: 2
  },
  {
    ruleId: 'slaves',
    phrase: ['slaves'],
    rating: 1
  }
];
