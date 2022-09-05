import { toMatchCloseTo, toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

// Patch `toMatchCloseTo` and `toBeDeepCloseTo` into jest's expect()
// I'm not really if this is a good idea, but it seems to work
interface MaybeHasJestExpect {
    expect?: jest.Expect;
}

const jestExpect = (global as unknown as MaybeHasJestExpect).expect;

if (jestExpect !== undefined) {
    jestExpect.extend({ toMatchCloseTo, toBeDeepCloseTo });
}
